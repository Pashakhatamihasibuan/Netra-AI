-- ============================================================
-- 0018_school_structure.sql
-- Revisi besar struktur sekolah:
-- 1. Tabel class_sections — daftar resmi kelas (3 SD A, 3 SD B, ...,
--    6 SD B) per tahun ajaran, dikelola HANYA oleh Kepala Sekolah
--    (role 'admin'). Setiap kelas punya satu wali kelas (opsional,
--    bisa kosong sampai ditugaskan admin).
-- 2. Kolom tambahan di users:
--    - Siswa: class_section_id (kelas spesifiknya, mis. "4A")
--    - Guru: teacher_type ('homeroom' wali kelas / 'subject' guru
--      mapel), subject (mapel yang diampu), teacher_grade_levels
--      (kelas-kelas yang diajar, untuk guru mapel).
-- 3. RLS: hanya admin yang boleh insert/update/delete class_sections;
--    semua user login boleh baca (perlu untuk pendaftaran siswa &
--    tampilan wali kelas).
-- ============================================================

-- 1. Tabel class_sections ------------------------------------------------
create table if not exists class_sections (
  id                   uuid primary key default uuid_generate_v4(),
  class_level          text not null check (class_level in ('3', '4', '5', '6')),
  section              text not null,                 -- 'A', 'B', dst — bebas ditentukan admin
  academic_year        text not null,                 -- mis. '2025/2026'
  homeroom_teacher_id  uuid references users(id) on delete set null,
  created_at           timestamptz not null default now(),
  unique (class_level, section, academic_year)
);

create index if not exists idx_class_sections_level   on class_sections(class_level);
create index if not exists idx_class_sections_teacher on class_sections(homeroom_teacher_id);

-- 2. Kolom tambahan di users ---------------------------------------------
alter table users
  add column if not exists class_section_id     uuid references class_sections(id) on delete set null,
  add column if not exists teacher_type         text check (teacher_type in ('homeroom', 'subject')),
  add column if not exists subject              text,
  add column if not exists teacher_grade_levels text[];

create index if not exists idx_users_class_section on users(class_section_id);

-- 3. RLS class_sections ----------------------------------------------------
alter table class_sections enable row level security;

drop policy if exists "semua login baca class_sections" on class_sections;
create policy "semua login baca class_sections"
  on class_sections for select
  to authenticated
  using (true);

drop policy if exists "admin kelola class_sections" on class_sections;
create policy "admin kelola class_sections"
  on class_sections for all
  using (app_role() = 'admin')
  with check (app_role() = 'admin');

-- 4. Seed kelas default tahun ajaran berjalan ------------------------------
-- Tahun ajaran Indonesia umumnya mulai Juli. Hitung otomatis dari tanggal
-- migrasi dijalankan supaya tetap relevan kapan pun di-deploy.
do $$
declare
  yr int := extract(year from now())::int;
  ay text;
  lvl text;
  sec text;
begin
  if extract(month from now())::int >= 7 then
    ay := yr::text || '/' || (yr + 1)::text;
  else
    ay := (yr - 1)::text || '/' || yr::text;
  end if;

  foreach lvl in array array['3','4','5','6'] loop
    foreach sec in array array['A','B'] loop
      insert into class_sections (class_level, section, academic_year)
      values (lvl, sec, ay)
      on conflict (class_level, section, academic_year) do nothing;
    end loop;
  end loop;
end $$;

-- 5. Helper: nama wali kelas + info kelas untuk satu siswa -----------------
create or replace function app_student_class_section(p_student_id uuid)
returns table (
  class_section_id   uuid,
  class_level         text,
  section             text,
  academic_year       text,
  homeroom_teacher_id uuid,
  homeroom_teacher_name text
)
language sql stable security definer set search_path = public as $$
  select cs.id, cs.class_level, cs.section, cs.academic_year,
         cs.homeroom_teacher_id, t.name
  from users u
  join class_sections cs on cs.id = u.class_section_id
  left join users t on t.id = cs.homeroom_teacher_id
  where u.id = p_student_id;
$$;
