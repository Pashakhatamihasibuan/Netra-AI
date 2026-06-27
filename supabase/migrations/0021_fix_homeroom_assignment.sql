-- 0021_fix_homeroom_assignment.sql
-- Fix: homeroom_teacher_id tidak boleh di-override oleh teacher register
-- jika kelas sudah punya wali kelas yang di-assign manual oleh admin.
-- Tambah kolom `homeroom_assigned_by_admin` sebagai flag proteksi.
-- Teacher register HANYA boleh auto-assign ke kelas yang flagnya false/null.

-- Tambah kolom flag di class_sections
alter table class_sections
  add column if not exists homeroom_assigned_by_admin boolean not null default false;

-- Saat admin assign via PATCH, set flag = true
-- Saat admin lepas (set null) via PATCH, reset flag = false
-- Teacher register hanya auto-assign jika homeroom_assigned_by_admin = false DAN homeroom_teacher_id IS NULL

-- Update existing rows: jika sudah ada homeroom_teacher_id, anggap sudah di-assign admin
update class_sections
set homeroom_assigned_by_admin = true
where homeroom_teacher_id is not null;
