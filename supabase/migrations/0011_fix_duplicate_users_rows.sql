-- Migration 0011: Bersihkan duplikat di public.users dan pastikan constraint
--
-- ROOT CAUSE error "Cannot coerce the result to a single JSON object":
-- Trigger handle_new_auth_user() bisa race condition saat Google OAuth —
-- dua event INSERT ke auth.users terpicu hampir bersamaan (misalnya
-- saat refresh token), sehingga trigger berjalan dua kali dan INSERT
-- menghasilkan duplikat row (jika constraint PRIMARY KEY pada kolom 'id'
-- entah kenapa tidak aktif, atau ada bug migrasi sebelumnya).
--
-- FIX 1: Hapus duplikat — pertahankan row dengan created_at terlama.
-- FIX 2: Pastikan PRIMARY KEY constraint aktif.
-- FIX 3: Update trigger untuk idempotent dengan ON CONFLICT DO UPDATE.

-- Step 1: Hapus duplikat row, pertahankan yang paling awal (created_at ASC)
DELETE FROM public.users
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) AS rn
    FROM public.users
  ) ranked
  WHERE rn > 1
);

-- Step 2: Pastikan primary key constraint ada (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'users'
      AND constraint_type = 'PRIMARY KEY'
      AND constraint_schema = 'public'
  ) THEN
    ALTER TABLE public.users ADD PRIMARY KEY (id);
  END IF;
END;
$$;

-- Step 3: Update trigger agar ON CONFLICT DO UPDATE (bukan DO NOTHING)
-- sehingga data terbaru (nama, email dari Google) selalu tersimpan.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger AS $$
DECLARE
  v_role user_role;
  v_raw  text;
  v_name text;
BEGIN
  v_raw := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'student')));
  IF v_raw IN ('student', 'teacher', 'parent') THEN
    v_role := v_raw::user_role;
  ELSE
    v_role := 'student';
  END IF;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- FIX: ON CONFLICT DO UPDATE agar tidak menghasilkan duplikat
  -- dan data terbaru selalu terupdate.
  INSERT INTO public.users (id, name, email, role)
  VALUES (new.id, v_name, new.email, v_role)
  ON CONFLICT (id) DO UPDATE
    SET name  = EXCLUDED.name,
        email = EXCLUDED.email
    -- Jangan overwrite role jika sudah diset — hanya update jika masih default
    WHERE public.users.role = 'student' AND EXCLUDED.role != 'student'
       OR public.users.name IS NULL;

  -- Sync role ke auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data
    || jsonb_build_object('role', v_role::text)
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
