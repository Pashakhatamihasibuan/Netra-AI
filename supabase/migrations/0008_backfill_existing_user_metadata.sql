-- Backfill: update raw_user_meta_data untuk semua user yang sudah ada
-- tapi belum punya 'role' di metadata (misal: user yang daftar sebelum
-- migration 0007 dipasang).
--
-- Jalankan SEKALI di Supabase SQL Editor setelah deploy migration 0007.
-- Aman dijalankan berulang — || hanya menambah/overwrite key 'role'.

update auth.users au
set raw_user_meta_data = au.raw_user_meta_data || jsonb_build_object('role', pu.role::text)
from public.users pu
where au.id = pu.id
  and (au.raw_user_meta_data->>'role' is null
    or au.raw_user_meta_data->>'role' = '');
