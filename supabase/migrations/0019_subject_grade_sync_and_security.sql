-- ============================================================
-- 0019_subject_grade_sync_and_security.sql
-- ============================================================
-- A. Materi & kuis sekarang ditargetkan lewat (subject, class_level)
--    bukan lewat tabel `classes` (kode-gabung kelas guru) — siswa
--    otomatis melihat materi/kuis yang class_level-nya sama dengan
--    grade_level mereka, dari guru manapun yang mengampu kelas itu.
--    Kolom class_id lama TETAP ada (tidak dihapus, demi kompatibilitas
--    data lama) tapi tidak dipakai lagi oleh kode aplikasi baru.
-- B. material_media mendukung tipe 'document' (PDF) dan 'presentation'
--    (PPT/PPTX) selain image/video, supaya bisa di-preview di halaman
--    siswa dan orang tua.
-- C. quiz_attempts: kunci anti-curang — sekali siswa pindah tab saat
--    mengerjakan kuis, attempt langsung 'forfeited' dan nilai jadi 0,
--    tidak bisa masuk kuis itu lagi.
-- D. Perbaikan keamanan RLS: kebijakan lama "USING (true)" pada
--    quizzes & questions (dari migrasi 0013) membuat SEMUA kuis dan
--    SEMUA kunci jawaban bisa dibaca siapa pun yang login — termasuk
--    siswa via query langsung ke tabel `questions` (bukan view aman
--    `questions_for_student`). Migrasi ini menutup celah tsb.
-- ============================================================

-- A. Kolom subject + class_level ------------------------------------------
alter table materials
  add column if not exists subject     text,
  add column if not exists class_level text check (class_level in ('3', '4', '5', '6'));

alter table quizzes
  add column if not exists subject     text,
  add column if not exists class_level text check (class_level in ('3', '4', '5', '6'));

create index if not exists idx_materials_class_level on materials(class_level);
create index if not exists idx_quizzes_class_level   on quizzes(class_level);

-- Tandai materi/kuis dummy lama (tanpa class_id, dibuat sebelum revisi
-- ini) dengan class_level dari quiz_code-nya supaya tetap muncul untuk
-- siswa kelas terkait alih-alih hilang dari peredaran.
update quizzes set class_level = '4' where quiz_code in ('MAT4SD', 'IPA4SD') and class_level is null;
update quizzes set class_level = '5' where quiz_code in ('MAT5SD', 'IPS5SD') and class_level is null;
update quizzes set class_level = '6' where quiz_code in ('MAT6SD')          and class_level is null;
update quizzes set subject = 'Matematika' where quiz_code in ('MAT4SD','MAT5SD','MAT6SD') and subject is null;
update quizzes set subject = 'IPA'        where quiz_code = 'IPA4SD' and subject is null;
update quizzes set subject = 'IPS'        where quiz_code = 'IPS5SD' and subject is null;

-- B. Tipe media dokumen / presentasi ---------------------------------------
alter table material_media drop constraint if exists material_media_media_type_check;
alter table material_media
  add constraint material_media_media_type_check
  check (media_type in ('image', 'video', 'document', 'presentation'));

-- C. quiz_attempts — anti-curang pindah tab --------------------------------
create table if not exists quiz_attempts (
  id          uuid primary key default uuid_generate_v4(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  student_id  uuid not null references users(id) on delete cascade,
  status      text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'forfeited')),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  unique (quiz_id, student_id)
);

create index if not exists idx_quiz_attempts_student on quiz_attempts(student_id);
create index if not exists idx_quiz_attempts_quiz    on quiz_attempts(quiz_id);

alter table quiz_attempts enable row level security;

-- Tidak ada policy INSERT/UPDATE untuk klien — semua perubahan status
-- (mulai, forfeit, submit) HARUS lewat API route service-role, supaya
-- siswa tidak bisa mereset status 'forfeited' miliknya sendiri lewat
-- request langsung ke Supabase dari browser.
drop policy if exists "student reads own attempts" on quiz_attempts;
create policy "student reads own attempts"
  on quiz_attempts for select
  using (student_id = auth.uid());

drop policy if exists "teacher reads attempts of own quizzes" on quiz_attempts;
create policy "teacher reads attempts of own quizzes"
  on quiz_attempts for select
  using (
    exists (
      select 1 from quizzes q
      where q.id = quiz_id and (q.teacher_id = auth.uid() or q.teacher_id is null)
    )
  );

-- Cegah submit ganda yang menaikkan skor di leaderboard secara curang:
-- satu siswa hanya boleh punya satu baris quiz_results per quiz.
-- Bersihkan duplikat lama (simpan skor tertinggi) sebelum constraint dipasang.
delete from quiz_results a using quiz_results b
  where a.user_id = b.user_id
    and a.quiz_id = b.quiz_id
    and (a.score < b.score or (a.score = b.score and a.created_at > b.created_at));

alter table quiz_results drop constraint if exists quiz_results_user_quiz_unique;
alter table quiz_results add constraint quiz_results_user_quiz_unique unique (user_id, quiz_id);

-- Policy UPDATE terbatas — dibutuhkan supaya mekanisme forfeit (anti-curang
-- pindah tab) bisa melakukan upsert pada quiz_results lewat sesi siswa
-- sendiri (bukan service role). WITH CHECK score=0 memastikan ini HANYA
-- bisa dipakai untuk menge-nol-kan nilai (forfeit), TIDAK BISA dipakai
-- siswa untuk menaikkan skornya sendiri lewat manipulasi langsung ke API
-- Supabase dari browser.
drop policy if exists "student forfeits own result to zero" on quiz_results;
create policy "student forfeits own result to zero"
  on quiz_results for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and score = 0);

-- D. Perbaikan RLS quizzes & questions --------------------------------------
drop policy if exists "Siswa bisa baca kuis" on quizzes;
drop policy if exists "anyone authenticated reads quizzes" on quizzes;
drop policy if exists "Siswa bisa baca soal dari kuis" on questions;

-- Siswa hanya boleh baca kuis yang class_level-nya sama dengan kelasnya.
drop policy if exists "student reads quizzes for own grade" on quizzes;
create policy "student reads quizzes for own grade"
  on quizzes for select
  using (
    app_role() = 'student'
    and class_level = (select grade_level from users where id = auth.uid())
  );

-- Guru boleh baca kuis miliknya sendiri ATAU kuis bersama/umum
-- (teacher_id null) — tapi TIDAK boleh baca kuis milik guru lain.
drop policy if exists "teacher reads own or shared quizzes" on quizzes;
create policy "teacher reads own or shared quizzes"
  on quizzes for select
  using (
    app_role() = 'teacher'
    and (teacher_id = auth.uid() or teacher_id is null)
  );

-- Admin (Kepala Sekolah) boleh baca semua kuis untuk keperluan pengawasan.
drop policy if exists "admin reads all quizzes" on quizzes;
create policy "admin reads all quizzes"
  on quizzes for select
  using (app_role() = 'admin');

-- Tabel questions: TIDAK ada policy select untuk siswa sama sekali.
-- Siswa wajib lewat view questions_for_student (sudah tidak membawa
-- correct_answer). Guru tetap bisa CRUD soal miliknya via policy
-- "teacher manages own questions" yang sudah ada dari migrasi 0002.

-- E. Materials & material_media: RLS diganti dari sistem class_id/classes
--    (deprecated) ke class_level — konsisten dengan quizzes di atas. Policy
--    lama bergantung pada app_student_teacher_id() yang sekarang selalu
--    NULL untuk siswa baru (karena class_id/classes tidak diisi lagi),
--    jadi policy lama jadi mati total alih-alih jadi celah keamanan — tapi
--    tetap diganti di sini supaya RLS konsisten dengan model baru, bukan
--    bergantung pada efek samping yang membingungkan.
drop policy if exists "student reads materials of own teacher" on materials;
create policy "student reads materials for own grade"
  on materials for select
  using (
    app_role() = 'student'
    and class_level = (select grade_level from users where id = auth.uid())
  );

drop policy if exists "admin reads all materials" on materials;
create policy "admin reads all materials"
  on materials for select
  using (app_role() = 'admin');

drop policy if exists "student reads media of visible materials" on material_media;
create policy "student reads media of visible materials"
  on material_media for select
  using (
    exists (
      select 1 from materials m
      where m.id = material_id
        and m.class_level = (select grade_level from users where id = auth.uid())
    )
  );

drop policy if exists "admin reads all material media" on material_media;
create policy "admin reads all material media"
  on material_media for select
  using (app_role() = 'admin');

-- F. Realtime untuk quiz_attempts (opsional, dipakai guru memantau live)
do $$
begin
  alter publication supabase_realtime add table quiz_attempts;
exception
  when duplicate_object then null;
end $$;
