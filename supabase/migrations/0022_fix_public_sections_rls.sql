-- 0022_fix_public_sections_rls.sql
-- Izinkan SELECT publik (anon) pada class_sections agar endpoint publik
-- /api/public/class-sections bisa diakses tanpa autentikasi.
-- (Service role bypass RLS, tapi sebagai defense-in-depth kita eksplisitkan.)

-- Pastikan RLS aktif
alter table class_sections enable row level security;

-- Policy: siapapun boleh baca class_sections (data tidak sensitif)
drop policy if exists "public read class_sections" on class_sections;
create policy "public read class_sections"
  on class_sections for select
  using (true);

-- Pastikan kolom homeroom_assigned_by_admin ada (idempotent)
alter table class_sections
  add column if not exists homeroom_assigned_by_admin boolean not null default false;

-- Sinkronisasi: kelas yang sudah punya homeroom_teacher_id dianggap sudah di-assign admin
-- Ini mencegah teacher register baru meng-override assignment yang sudah ada
update class_sections
set homeroom_assigned_by_admin = true
where homeroom_teacher_id is not null
  and homeroom_assigned_by_admin = false;
