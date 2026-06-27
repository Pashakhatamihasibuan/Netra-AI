-- ============================================================
-- FIX: RLS Policy untuk tabel class_sections
-- Jalankan ini di Supabase SQL Editor
-- ============================================================

-- 1. Pastikan RLS aktif di tabel class_sections
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;

-- 2. Policy: semua authenticated user bisa READ class_sections
--    (dibutuhkan form registrasi siswa)
DROP POLICY IF EXISTS "Allow authenticated read class_sections" ON class_sections;
CREATE POLICY "Allow authenticated read class_sections"
  ON class_sections
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Policy: hanya admin yang bisa INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Allow admin insert class_sections" ON class_sections;
CREATE POLICY "Allow admin insert class_sections"
  ON class_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Allow admin update class_sections" ON class_sections;
CREATE POLICY "Allow admin update class_sections"
  ON class_sections
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Allow admin delete class_sections" ON class_sections;
CREATE POLICY "Allow admin delete class_sections"
  ON class_sections
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 4. OPSIONAL: Jika ingin form registrasi bisa diakses tanpa login (anon),
--    aktifkan policy ini juga:
DROP POLICY IF EXISTS "Allow anon read class_sections" ON class_sections;
CREATE POLICY "Allow anon read class_sections"
  ON class_sections
  FOR SELECT
  TO anon
  USING (true);

-- Verifikasi
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'class_sections';
