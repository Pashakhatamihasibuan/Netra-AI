-- ============================================================
-- 0023_verify_class_sections_schema.sql
-- TIDAK menghapus data apapun. Hanya:
-- 1. Memastikan kolom class_sections sesuai migrasi 0018/0021
--    (id, class_level, section, academic_year, homeroom_teacher_id,
--    homeroom_assigned_by_admin) -- TANPA homeroom_teacher_name,
--    karena kolom itu TIDAK PERNAH dibuat di migrasi manapun.
--    API harus join manual ke users untuk dapat nama wali kelas
--    (lihat src/app/api/class-sections/route.ts yang sudah diperbaiki).
-- 2. Memastikan tidak ada data class_sections / users yang
--    grade_level vs class_section_id-nya tidak sinkron.
-- ============================================================

-- 1. Cek struktur kolom class_sections saat ini
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'class_sections'
order by ordinal_position;

-- 2. Pastikan kolom wajib ada (idempotent, tidak merusak data jika sudah ada)
alter table class_sections
  add column if not exists homeroom_assigned_by_admin boolean not null default false;

-- 3. Cari siswa yang grade_level TIDAK sinkron dengan class_level
--    dari class_sections rujukannya (harus kosong/0 baris jika sehat)
select u.id, u.name, u.grade_level, cs.class_level as section_grade_level, cs.section
from users u
join class_sections cs on cs.id = u.class_section_id
where u.role = 'student'
  and u.grade_level is distinct from cs.class_level;

-- 4. Cari siswa yang punya grade_level tapi class_section_id NULL
--    (boleh terjadi jika kelasnya dihapus admin, tapi cek untuk awareness)
select id, name, grade_level, class_section_id
from users
where role = 'student' and grade_level is not null and class_section_id is null;

-- 5. Pastikan setiap quiz/materi punya class_level valid (3-6) sesuai
--    constraint, bukan UUID nyasar dari bug frontend sebelumnya.
select id, title, class_level
from quizzes
where class_level is not null and class_level not in ('3','4','5','6');

select id, title, class_level
from materials
where class_level is not null and class_level not in ('3','4','5','6');

-- Jika query #5 mengembalikan baris, berarti ada data lama yang
-- ke-save dengan UUID (bug versi sebelumnya). Bersihkan dengan UPDATE
-- manual per baris (ganti <quiz_id> dan <grade_yang_benar>):
--
-- update quizzes set class_level = '<grade_yang_benar>' where id = '<quiz_id>';
-- update materials set class_level = '<grade_yang_benar>' where id = '<material_id>';
