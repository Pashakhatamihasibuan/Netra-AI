-- Fix: setelah user login Google dan trigger insert ke public.users,
-- sync role kembali ke auth.users raw_user_meta_data agar middleware
-- bisa baca role tanpa query DB tambahan.
--
-- Masalah sebelumnya:
--   Trigger hanya INSERT ke public.users, tapi tidak update
--   auth.users.raw_user_meta_data — akibatnya user_metadata.role
--   selalu null untuk Google OAuth user → callback redirect ke '/'
--   bukan ke dashboard yang benar.

create or replace function handle_new_auth_user()
returns trigger as $$
declare
  v_role user_role;
  v_raw  text;
  v_name text;
begin
  -- Tentukan role: dari metadata kalau ada, default 'student'
  v_raw := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'student')));
  if v_raw in ('student', 'teacher', 'parent') then
    v_role := v_raw::user_role;
  else
    v_role := 'student';
  end if;

  -- Nama: coba 'name', lalu 'full_name' (Google), lalu bagian email
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- Insert ke public.users (idempotent)
  insert into public.users (id, name, email, role)
  values (new.id, v_name, new.email, v_role)
  on conflict (id) do nothing;

  -- KRITIS: sync role kembali ke auth.users.raw_user_meta_data
  -- agar middleware bisa baca user_metadata.role tanpa query DB.
  -- Merge dengan metadata yang ada — jangan overwrite seluruhnya.
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', v_role::text)
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

-- Pastikan trigger masih terpasang (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
