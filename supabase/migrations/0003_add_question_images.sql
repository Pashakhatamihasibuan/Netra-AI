-- 1. Tambahkan kolom image_url ke tabel questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Buat bucket publik untuk menyimpan gambar
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quiz_images', 'quiz_images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Berikan akses baca untuk semua orang
CREATE POLICY "Public read access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'quiz_images');

-- 4. Izinkan pengguna terautentikasi (Guru) untuk mengunggah gambar
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'quiz_images' AND auth.role() = 'authenticated');

-- 5. Perbarui VIEW soal agar siswa bisa membaca image_url tanpa melihat kunci jawaban
DROP VIEW IF EXISTS questions_for_student;

CREATE VIEW questions_for_student AS
  SELECT id, quiz_id, question, image_url, option_a, option_b, option_c, option_d, order_index
  FROM questions;

GRANT SELECT ON questions_for_student TO authenticated;
