-- ============================================================
-- 0024_quiz_material_target_section.sql
-- Memungkinkan guru menargetkan quiz/materi ke SECTION spesifik
-- (mis. "3 SD A" saja), bukan cuma seluruh grade ("3 SD" = 3A+3B+3C).
--
-- Desain backward-compatible:
-- - target_section_id NULL  -> berlaku ke SEMUA section di grade itu
--   (perilaku lama, tidak ada quiz/materi existing yang berubah).
-- - target_section_id terisi -> HANYA section itu yang melihat.
--
-- class_level TETAP dipertahankan (grade, '3'-'6') sebagai filter utama;
-- target_section_id adalah filter TAMBAHAN yang mempersempit ke section.
-- ============================================================

-- 1. Kolom baru di quizzes & materials -------------------------------------
alter table quizzes
  add column if not exists target_section_id uuid references class_sections(id) on delete set null;

alter table materials
  add column if not exists target_section_id uuid references class_sections(id) on delete set null;

create index if not exists idx_quizzes_target_section    on quizzes(target_section_id);
create index if not exists idx_materials_target_section  on materials(target_section_id);

-- 2. RLS quizzes — siswa baca jika grade cocok DAN
--    (tidak ada target section ATAU section siswa cocok) ------------------
drop policy if exists "student reads quizzes for own grade" on quizzes;
create policy "student reads quizzes for own grade"
  on quizzes for select
  using (
    app_role() = 'student'
    and class_level = (select grade_level from users where id = auth.uid())
    and (
      target_section_id is null
      or target_section_id = (select class_section_id from users where id = auth.uid())
    )
  );

-- 3. RLS materials — sama persis ------------------------------------------
drop policy if exists "student reads materials for own grade" on materials;
create policy "student reads materials for own grade"
  on materials for select
  using (
    app_role() = 'student'
    and class_level = (select grade_level from users where id = auth.uid())
    and (
      target_section_id is null
      or target_section_id = (select class_section_id from users where id = auth.uid())
    )
  );

-- 4. RLS material_media ikut material induknya ----------------------------
drop policy if exists "student reads media of visible materials" on material_media;
create policy "student reads media of visible materials"
  on material_media for select
  using (
    exists (
      select 1 from materials m
      where m.id = material_id
        and m.class_level = (select grade_level from users where id = auth.uid())
        and (
          m.target_section_id is null
          or m.target_section_id = (select class_section_id from users where id = auth.uid())
        )
    )
  );

-- Verifikasi cepat (harus 0 baris -- tidak ada section nyasar ke grade salah)
select q.id, q.title, q.class_level, cs.class_level as section_grade
from quizzes q
join class_sections cs on cs.id = q.target_section_id
where q.class_level is distinct from cs.class_level;
