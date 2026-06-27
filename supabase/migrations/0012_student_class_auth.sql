-- ============================================================
-- 0012_student_class_auth.sql  (idempotent — aman dijalankan ulang)
-- ============================================================

-- 1. Tabel kelas
create table if not exists classes (
  id           uuid primary key default uuid_generate_v4(),
  teacher_id   uuid not null references users(id) on delete cascade,
  name         text not null,
  class_code   text not null unique,
  created_at   timestamptz not null default now()
);

create index if not exists idx_classes_teacher on classes(teacher_id);
create index if not exists idx_classes_code    on classes(class_code);

-- 2. Kolom tambahan di users
alter table users
  add column if not exists class_id    uuid references classes(id),
  add column if not exists access_code text unique;

create index if not exists idx_users_access_code on users(access_code);

-- 3. RLS — drop dulu supaya tidak error "already exists"
alter table classes enable row level security;

drop policy if exists "teacher manages own classes"  on classes;
drop policy if exists "authenticated reads classes"  on classes;
drop policy if exists "teacher reads class students" on users;

-- INSERT terpisah dari SELECT supaya service role dari API bisa insert
-- tanpa harus melewati app_role() yang butuh session cookie
create policy "teacher manages own classes"
  on classes for all
  using  (app_role() = 'teacher' and teacher_id = auth.uid())
  with check (app_role() = 'teacher' and teacher_id = auth.uid());

create policy "authenticated reads classes"
  on classes for select
  to authenticated
  using (true);

create policy "teacher reads class students"
  on users for select
  using (
    app_role() = 'teacher'
    and class_id in (select id from classes where teacher_id = auth.uid())
  );

-- 4. Helper functions
create or replace function get_class_by_code(p_code text)
returns table (id uuid, name text, teacher_id uuid)
language sql stable security definer set search_path = public as $$
  select id, name, teacher_id from classes where class_code = upper(p_code) limit 1;
$$;

create or replace function get_student_by_access_code(p_code text)
returns table (id uuid, name text, class_id uuid)
language sql stable security definer set search_path = public as $$
  select id, name, class_id from users where access_code = upper(p_code) limit 1;
$$;

-- 5. PENTING: Izinkan service_role bypass RLS untuk insert dari API
--    (service_role key sudah bypass RLS secara default di Supabase,
--     tapi jika ada row-level check yang ketat perlu dipastikan)
--    Tidak perlu policy tambahan — createClient dengan service_role_key
--    sudah otomatis bypass semua RLS.
--
--    Yang perlu dipastikan: fungsi app_role() tidak error ketika
--    dipanggil tanpa session (auth.uid() = null).
create or replace function app_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from public.users where id = auth.uid()),
    'student'::user_role   -- fallback aman jika tidak ada session
  );
$$;
