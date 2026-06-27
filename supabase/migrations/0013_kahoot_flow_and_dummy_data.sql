-- ============================================================
-- 0013_kahoot_flow_and_dummy_data.sql
-- ============================================================

-- 1. Tambah kolom grade_level ke tabel users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS grade_level TEXT;

-- 2. Tambah kolom quiz_code ke tabel quizzes
ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS quiz_code TEXT UNIQUE;

-- Pastikan teacher_id bisa null untuk dummy/seed data 
-- (Bisa diisi nanti jika sudah ada teacher yang login)
ALTER TABLE public.quizzes ALTER COLUMN teacher_id DROP NOT NULL;

-- 3. RLS - Pastikan siswa bisa membaca quiz dengan quiz_code yang benar
-- Biasanya kita biarkan public atau dibaca lewat service_role di API, 
-- tapi untuk amannya kita pastikan select bisa diakses
DROP POLICY IF EXISTS "Siswa bisa baca kuis" ON public.quizzes;
CREATE POLICY "Siswa bisa baca kuis" 
  ON public.quizzes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Siswa bisa baca soal dari kuis" ON public.questions;
CREATE POLICY "Siswa bisa baca soal dari kuis" 
  ON public.questions FOR SELECT 
  USING (true);

-- 4. SEED: Soal Dummy Kelas 4-6 SD
-- Kita gunakan INSERT ... ON CONFLICT untuk menghindari error jika dijalankan ulang.

-- KELAS 4 SD
WITH ins_quiz AS (
  INSERT INTO public.quizzes (title, description, quiz_code)
  VALUES (
    'Matematika Kelas 4 SD',
    'Operasi hitung, pecahan, dan pengukuran dasar untuk siswa kelas 4 SD.',
    'MAT4SD'
  )
  ON CONFLICT (quiz_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
)
INSERT INTO public.questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
SELECT ins_quiz.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.order_index
FROM ins_quiz,
(VALUES
  (1, 'Berapa hasil dari 245 + 378?', '613', '623', '633', '643', 'B', 0),
  (2, 'Berapa hasil dari 500 - 167?', '323', '333', '343', '353', 'B', 1),
  (3, 'Berapa hasil dari 24 × 5?', '100', '110', '120', '130', 'C', 2),
  (4, 'Berapa hasil dari 144 ÷ 6?', '20', '22', '24', '26', 'C', 3),
  (5, 'Pecahan manakah yang senilai dengan 1/2?', '2/6', '3/6', '4/6', '5/6', 'B', 4),
  (6, '3/4 + 1/4 = ...', '1', '2', '3/2', '4/4', 'A', 5),
  (7, 'Berapa panjang 2 meter dalam sentimeter?', '20 cm', '200 cm', '2000 cm', '20000 cm', 'B', 6),
  (8, 'Bilangan bulat antara 3/2 dan 5/2 adalah ...', '1', '2', '3', '4', 'B', 7),
  (9, 'Keliling persegi dengan sisi 7 cm adalah ...', '21 cm', '28 cm', '35 cm', '49 cm', 'B', 8),
  (10, 'Angka 5 pada bilangan 3.548 menempati nilai ...', 'Satuan', 'Puluhan', 'Ratusan', 'Ribuan', 'C', 9)
) AS q(order_index_dummy, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
ON CONFLICT DO NOTHING;

WITH ins_quiz AS (
  INSERT INTO public.quizzes (title, description, quiz_code)
  VALUES (
    'IPA Kelas 4 SD',
    'Makhluk hidup, tumbuhan, dan lingkungan sekitar untuk kelas 4 SD.',
    'IPA4SD'
  )
  ON CONFLICT (quiz_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
)
INSERT INTO public.questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
SELECT ins_quiz.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.order_index
FROM ins_quiz,
(VALUES
  (1, 'Proses tumbuhan membuat makanan sendiri disebut ...', 'Respirasi', 'Fotosintesis', 'Transpirasi', 'Reproduksi', 'B', 0),
  (2, 'Organ pernapasan manusia adalah ...', 'Jantung', 'Ginjal', 'Paru-paru', 'Hati', 'C', 1),
  (3, 'Hewan yang memiliki rangka di dalam tubuhnya disebut ...', 'Avertebrata', 'Vertebrata', 'Insekta', 'Reptilia', 'B', 2),
  (4, 'Sumber energi utama bagi kehidupan di bumi adalah ...', 'Air', 'Angin', 'Matahari', 'Tanah', 'C', 3),
  (5, 'Proses penguapan air dari daun tumbuhan disebut ...', 'Fotosintesis', 'Respirasi', 'Transpirasi', 'Evaporasi', 'C', 4),
  (6, 'Hewan yang berkembang biak dengan bertelur disebut ...', 'Vivipar', 'Ovipar', 'Ovovivipar', 'Herbivor', 'B', 5),
  (7, 'Bagian bunga yang menghasilkan serbuk sari adalah ...', 'Putik', 'Kelopak', 'Benang sari', 'Mahkota', 'C', 6),
  (8, 'Benda yang dapat menghantarkan listrik disebut ...', 'Isolator', 'Konduktor', 'Semikonduktor', 'Kapasitor', 'B', 7),
  (9, 'Air mendidih pada suhu ...', '90°C', '95°C', '100°C', '105°C', 'C', 8),
  (10, 'Gaya yang menarik benda ke arah pusat bumi disebut ...', 'Gaya gesek', 'Gaya magnet', 'Gaya gravitasi', 'Gaya pegas', 'C', 9)
) AS q(order_index_dummy, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
ON CONFLICT DO NOTHING;

-- KELAS 5 SD
WITH ins_quiz AS (
  INSERT INTO public.quizzes (title, description, quiz_code)
  VALUES (
    'Matematika Kelas 5 SD',
    'Pecahan, persen, skala, dan bangun datar untuk kelas 5 SD.',
    'MAT5SD'
  )
  ON CONFLICT (quiz_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
)
INSERT INTO public.questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
SELECT ins_quiz.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.order_index
FROM ins_quiz,
(VALUES
  (1, '25% dari 200 adalah ...', '25', '50', '75', '100', 'B', 0),
  (2, 'Berapa hasil dari 2/3 × 3/4?', '1/2', '6/12', '5/12', '1/4', 'A', 1),
  (3, 'Luas persegi panjang dengan panjang 12 cm dan lebar 8 cm adalah ...', '40 cm²', '80 cm²', '96 cm²', '120 cm²', 'C', 2),
  (4, 'Skala peta 1:500.000. Jika jarak di peta 3 cm, jarak sebenarnya adalah ...', '1.500 km', '150 km', '15 km', '1,5 km', 'C', 3),
  (5, 'FPB dari 12 dan 18 adalah ...', '3', '6', '9', '12', 'B', 4),
  (6, 'KPK dari 4 dan 6 adalah ...', '12', '18', '24', '36', 'A', 5),
  (7, '0,75 = ...', '3/5', '7/10', '3/4', '7/5', 'C', 6),
  (8, 'Volume kubus dengan sisi 5 cm adalah ...', '25 cm³', '75 cm³', '100 cm³', '125 cm³', 'D', 7),
  (9, 'Berapa persen dari 3/5?', '30%', '40%', '50%', '60%', 'D', 8),
  (10, 'Keliling lingkaran dengan diameter 14 cm (π = 22/7) adalah ...', '22 cm', '44 cm', '66 cm', '88 cm', 'B', 9)
) AS q(order_index_dummy, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
ON CONFLICT DO NOTHING;

WITH ins_quiz AS (
  INSERT INTO public.quizzes (title, description, quiz_code)
  VALUES (
    'IPS Kelas 5 SD',
    'Sejarah Indonesia, peta, dan kenampakan alam untuk kelas 5 SD.',
    'IPS5SD'
  )
  ON CONFLICT (quiz_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
)
INSERT INTO public.questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
SELECT ins_quiz.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.order_index
FROM ins_quiz,
(VALUES
  (1, 'Proklamasi kemerdekaan Indonesia dibacakan pada tanggal ...', '17 Agustus 1944', '17 Agustus 1945', '17 Agustus 1946', '17 Agustus 1947', 'B', 0),
  (2, 'Ibu kota negara Indonesia adalah ...', 'Bandung', 'Surabaya', 'Jakarta', 'Medan', 'C', 1),
  (3, 'Pulau terbesar di Indonesia adalah ...', 'Jawa', 'Sulawesi', 'Kalimantan', 'Papua', 'D', 2),
  (4, 'Sungai terpanjang di Indonesia adalah ...', 'Sungai Citarum', 'Sungai Kapuas', 'Sungai Bengawan Solo', 'Sungai Musi', 'B', 3),
  (5, 'Gunung tertinggi di Indonesia adalah ...', 'Gunung Kerinci', 'Gunung Semeru', 'Gunung Puncak Jaya', 'Gunung Rinjani', 'C', 4),
  (6, 'Kerajaan Hindu pertama di Indonesia adalah ...', 'Sriwijaya', 'Kutai', 'Majapahit', 'Tarumanagara', 'B', 5),
  (7, 'Mata uang Indonesia adalah ...', 'Ringgit', 'Baht', 'Rupiah', 'Dollar', 'C', 6),
  (8, 'Batas barat Indonesia berbatasan dengan ...', 'Australia', 'Malaysia', 'Samudera Hindia', 'Filipina', 'C', 7),
  (9, 'Pahlawan nasional yang dikenal sebagai Bapak Proklamator adalah ...', 'Soeharto', 'Soekarno', 'Ahmad Yani', 'Diponegoro', 'B', 8),
  (10, 'Bahasa persatuan Indonesia adalah ...', 'Bahasa Jawa', 'Bahasa Melayu', 'Bahasa Indonesia', 'Bahasa Sunda', 'C', 9)
) AS q(order_index_dummy, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
ON CONFLICT DO NOTHING;

-- KELAS 6 SD
WITH ins_quiz AS (
  INSERT INTO public.quizzes (title, description, quiz_code)
  VALUES (
    'Matematika Kelas 6 SD',
    'Bilangan bulat, bangun ruang, dan perbandingan.',
    'MAT6SD'
  )
  ON CONFLICT (quiz_code) DO UPDATE SET title = EXCLUDED.title
  RETURNING id
)
INSERT INTO public.questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
SELECT ins_quiz.id, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.order_index
FROM ins_quiz,
(VALUES
  (1, 'Volume balok dengan panjang 10 cm, lebar 5 cm, tinggi 4 cm adalah ...', '100 cm³', '150 cm³', '200 cm³', '250 cm³', 'C', 0),
  (2, 'Luas permukaan kubus dengan sisi 6 cm adalah ...', '144 cm²', '180 cm²', '216 cm²', '240 cm²', 'C', 1),
  (3, 'Hasil dari (-8) + (-5) adalah ...', '-3', '3', '-13', '13', 'C', 2),
  (4, 'Jika harga beli Rp 80.000 dan harga jual Rp 100.000, persentase untung adalah ...', '20%', '25%', '30%', '40%', 'B', 3),
  (5, 'Perbandingan uang Andi dan Budi 3:5. Jika jumlah uang mereka Rp 160.000, uang Andi adalah ...', 'Rp 40.000', 'Rp 50.000', 'Rp 60.000', 'Rp 80.000', 'C', 4),
  (6, 'Akar kuadrat dari 169 adalah ...', '11', '12', '13', '14', 'C', 5),
  (7, 'Perpangkatan 2³ sama dengan ...', '6', '7', '8', '9', 'C', 6),
  (8, 'Diagram lingkaran menunjukkan 40% siswa suka matematika dari 200 siswa. Berapa siswa yang suka matematika?', '60', '70', '80', '90', 'C', 7),
  (9, 'Kecepatan rata-rata jika jarak 180 km ditempuh dalam 3 jam adalah ...', '50 km/jam', '60 km/jam', '70 km/jam', '80 km/jam', 'B', 8),
  (10, 'Jika 5 pekerja menyelesaikan pekerjaan dalam 12 hari, maka 10 pekerja menyelesaikannya dalam ...', '3 hari', '4 hari', '5 hari', '6 hari', 'D', 9)
) AS q(order_index_dummy, question, option_a, option_b, option_c, option_d, correct_answer, order_index)
ON CONFLICT DO NOTHING;
