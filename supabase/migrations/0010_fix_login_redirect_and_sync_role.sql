-- Migration 0010: Fix login redirect bug untuk parent/guru
--
-- ROOT CAUSE: Trigger handle_new_auth_user() pada migration 0007 sudah
-- men-sync role ke raw_user_meta_data untuk user BARU. Tapi user yang
-- sudah ada (dibuat SEBELUM migration 0007) tidak punya role di metadata.
--
-- SYMPTOM: Parent/guru login → LoginForm.tsx baca user_metadata.role = null
-- → fallback ke 'student' → redirect ke /student/dashboard → middleware
-- blok karena role tidak cocok → loop redirect atau halaman error.
--
-- FIX: Backfill raw_user_meta_data.role untuk SEMUA user yang sudah ada
-- berdasarkan data di public.users (sumber kebenaran).

-- Backfill metadata role untuk semua user yang belum punya role di metadata
update auth.users au
set raw_user_meta_data = coalesce(au.raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', pu.role::text)
from public.users pu
where pu.id = au.id
  and (
    au.raw_user_meta_data->>'role' is null
    or au.raw_user_meta_data->>'role' = ''
    or au.raw_user_meta_data->>'role' not in ('student', 'teacher', 'parent')
  );

-- Pastikan trigger sudah correct (idempotent — dari migration 0007)
create or replace function handle_new_auth_user()
returns trigger as $$
declare
  v_role user_role;
  v_raw  text;
  v_name text;
begin
  v_raw := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'student')));
  if v_raw in ('student', 'teacher', 'parent') then
    v_role := v_raw::user_role;
  else
    v_role := 'student';
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.users (id, name, email, role)
  values (new.id, v_name, new.email, v_role)
  on conflict (id) do nothing;

  -- Sync role ke metadata
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', v_role::text)
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- Log jumlah user yang di-backfill (bisa dicek di Supabase logs)
do $$
declare
  cnt int;
begin
  select count(*) into cnt
  from auth.users au
  join public.users pu on pu.id = au.id
  where au.raw_user_meta_data->>'role' in ('student', 'teacher', 'parent');
  raise notice 'Total user dengan role ter-sync di metadata: %', cnt;
end;
$$;
