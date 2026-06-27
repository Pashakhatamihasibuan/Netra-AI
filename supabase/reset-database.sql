-- ============================================================
-- reset-database.sql (v2 — diperbarui untuk skema terbaru)
-- Mengosongkan SEMUA data: akun (guru/siswa/orang tua/admin), struktur
-- kelas (class_sections), kuis & soal, materi & media, hasil kuis,
-- riwayat kesehatan, log monitoring CV per soal, dan file di Storage
-- (gambar soal & media materi). Supaya sekolah bisa mulai bersih dari
-- nol.
--
-- TIDAK dihapus: struktur tabel (schema) dan tabel `badges` (katalog
-- definisi badge seperti 'eye_guardian' — dipakai langsung oleh kode
-- aplikasi di src/lib/ai/decisionEngine.ts, bukan data buatan user).
--
-- CARA PAKAI:
-- 1. Buka project Supabase -> SQL Editor -> New query.
-- 2. Paste SELURUH isi file ini -> klik Run.
-- 3. Setelah selesai: semua akun, kelas (3 SD A, 4 SD B, dst), kuis,
--    materi, dan file upload akan hilang TOTAL. Kepala Sekolah/guru
--    perlu register ulang dari /login dan admin perlu membuat ulang
--    struktur kelas (3 SD A, 3 SD B, dst) dari dashboard admin.
--
-- PERINGATAN: Aksi ini PERMANEN dan TIDAK BISA DI-UNDO. Pastikan sudah
-- benar-benar yakin sebelum menjalankan — sebaiknya backup/export data
-- penting dulu kalau ragu.
-- ============================================================

begin;

-- 1. Hapus semua akun auth (guru, siswa, orang tua, admin).
--    FK "public.users.id references auth.users(id) on delete cascade"
--    otomatis cascade ke: quizzes (teacher_id), quiz_results (user_id),
--    health_records (user_id), user_badges (user_id), classes
--    (teacher_id), materials (teacher_id), material_access/joins
--    (student_id), quiz_attempts (student_id), quiz_question_monitoring
--    (student_id) milik user tersebut. class_sections.homeroom_teacher_id
--    di-set NULL (on delete set null), TIDAK ikut terhapus barisnya.
delete from auth.users;

-- 2. Jaring pengaman: hapus sisa data "yatim" yang teacher_id/user_id-nya
--    NULL (mis. quiz dummy/seed dari migrasi 0013 yang tidak terikat akun
--    guru manapun, jadi tidak ikut cascade di langkah 1).
truncate table
  public.quiz_question_monitoring,
  public.quiz_monitoring_log,
  public.quiz_attempts,
  public.material_joins,
  public.material_access,
  public.material_media,
  public.materials,
  public.user_badges,
  public.health_records,
  public.quiz_results,
  public.questions,
  public.quizzes,
  public.classes,
  public.class_sections,
  public.users
restart identity cascade;

commit;

-- 3. Hapus semua file yang sudah diupload ke Storage (gambar soal kuis
--    & media materi seperti gambar/video/dokumen/presentasi). Baris di
--    storage.objects tidak ikut ke-cascade oleh apapun di atas, jadi
--    harus dihapus manual terpisah.
delete from storage.objects where bucket_id = 'quiz_images';
delete from storage.objects where bucket_id = 'materials_media';

-- Verifikasi cepat: semua angka di bawah ini harus 0
-- (kecuali badges yang memang sengaja dipertahankan).
select 'auth.users'                    as table_name, count(*) from auth.users
union all select 'public.users',                  count(*) from public.users
union all select 'public.classes',                count(*) from public.classes
union all select 'public.class_sections',         count(*) from public.class_sections
union all select 'public.quizzes',                count(*) from public.quizzes
union all select 'public.questions',              count(*) from public.questions
union all select 'public.quiz_results',           count(*) from public.quiz_results
union all select 'public.quiz_attempts',          count(*) from public.quiz_attempts
union all select 'public.quiz_monitoring_log',    count(*) from public.quiz_monitoring_log
union all select 'public.quiz_question_monitoring', count(*) from public.quiz_question_monitoring
union all select 'public.health_records',         count(*) from public.health_records
union all select 'public.user_badges',            count(*) from public.user_badges
union all select 'public.materials',              count(*) from public.materials
union all select 'public.material_media',         count(*) from public.material_media
union all select 'public.material_access',        count(*) from public.material_access
union all select 'public.material_joins',         count(*) from public.material_joins
union all select 'storage.objects (quiz_images)',  count(*) from storage.objects where bucket_id = 'quiz_images'
union all select 'storage.objects (materials_media)', count(*) from storage.objects where bucket_id = 'materials_media'
union all select 'public.badges (tetap ada, by design)', count(*) from public.badges;
