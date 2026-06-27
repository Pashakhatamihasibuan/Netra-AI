-- Update trigger to handle Google OAuth users.
-- Google user tidak mengirim 'role' di metadata saat pertama login,
-- jadi kita tambahkan fallback: cek apakah row sudah ada (on conflict do nothing)
-- dan default ke 'student' kalau role tidak tersedia.

create or replace function handle_new_auth_user()
returns trigger as $$
declare
  v_role user_role;
  v_raw  text;
  v_name text;
begin
  -- Ambil role dari metadata, fallback ke 'student'
  v_raw := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'student')));
  if v_raw in ('student', 'teacher', 'parent') then
    v_role := v_raw::user_role;
  else
    v_role := 'student';
  end if;

  -- Untuk Google OAuth, nama bisa dari 'full_name' atau 'name'
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.users (id, name, email, role)
  values (new.id, v_name, new.email, v_role)
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
