# Netra AI — starter implementation

Scaffold Next.js (App Router + TypeScript + Tailwind) untuk Netra AI: kuis
edukatif tiga role (siswa/guru/orang tua) dengan monitoring kesehatan
digital real-time lewat MediaPipe, plus skema Supabase + RLS yang
membatasi akses sesuai role.

## Yang sudah diimplementasikan

- **Auth & role routing** — Supabase Auth, role disimpan di `public.users`
  dan di-mirror ke `user_metadata` agar middleware bisa cek role tanpa
  query database tambahan.
- **Monitoring (`src/hooks`, `src/components/monitoring`)** — eye distance
  (kalibrasi + estimasi jarak dari lebar antar-mata di piksel), blink
  detection (eye-aspect-ratio), posture (sudut bahu-telinga, pendekatan
  craniovertebral angle), lighting (rata-rata luma frame). Semua jalan
  di browser lewat `@mediapipe/tasks-vision` (WASM) — **tidak ada video
  yang dikirim ke server**, hanya skor angka akhir yang disimpan ke
  `health_records`.
- **Monster/mascot state machine (`useMonsterState`)** — Safe → Warning →
  Alert dengan debounce 5s dan cooldown 15s sebelum eskalasi, reset
  instan begitu jarak kembali aman.
- **AI Decision Engine (`lib/ai/decisionEngine.ts`)** dan **Health Score
  (`lib/ai/healthScore.ts`)** — sesuai contoh bobot di proposal awal
  (rata-rata empat sub-skor).
- **Kuis** — pembuatan soal oleh guru, pengerjaan oleh siswa lewat view
  `questions_for_student` (tidak pernah mengirim `correct_answer` ke
  browser), penilaian terjadi di `app/api/quiz/submit` lewat service-role
  key di server, leaderboard lewat kolom `display_name` yang
  di-denormalisasi (supaya tidak perlu membuka akses baca ke tabel
  `users` antar-siswa).
- **Dashboard guru & orang tua** — keduanya read-only terhadap data
  kesehatan; integritas data AI tidak bisa diubah dari sisi klien manapun.
- **Database & RLS (`supabase/migrations`)** — empat migrasi: schema,
  RLS policies, seed badge, dan penyesuaian leaderboard.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi dengan kredensial proyek Supabase kamu
```

Jalankan migrasi (lewat Supabase CLI atau tempel manual ke SQL editor,
sesuai urutan nomor file di `supabase/migrations`):

```bash
supabase db push
```

Lalu:

```bash
npm run dev
```

## Catatan & langkah lanjutan yang disengaja belum dikerjakan

- **Penautan parent_id** — proposal belum mendefinisikan alur "orang tua
  menambahkan anak", jadi kolom `parent_id` saat ini diasumsikan diisi
  manual oleh guru/admin lewat Supabase Studio. Alur self-service (kode
  undangan, dsb) adalah langkah lanjutan yang wajar.
- **Pemberian badge** — tabel `user_badges` sengaja tidak punya policy
  insert dari klien; pemberian badge sebaiknya lewat route server
  terpisah (cron/trigger) yang mengevaluasi `health_records` historis,
  belum diimplementasikan di scaffold ini.
- **Kalibrasi jarak** — pendekatan saat ini pakai satu titik kalibrasi
  (asumsi 40cm). Untuk akurasi lebih baik, kalibrasi dua titik (mis. 30cm
  & 50cm) akan memberi estimasi non-linear yang lebih presisi.
- Tidak ada test otomatis. Untuk produksi, tambahkan setidaknya unit test
  untuk `healthScore.ts`, `decisionEngine.ts`, dan `useMonsterState.ts`
  karena ketiganya berisi logika ambang batas yang mudah salah ketik.

## Revisi: struktur kelas, wali kelas, dokumen, dan anti-curang

Revisi besar menambahkan struktur sekolah resmi (3-6 SD, wali kelas,
Kepala Sekolah) di atas fondasi di atas. Migrasi baru: `0017`-`0019`.

**Jalankan migrasi baru** (urutan penting — `0017` harus commit dulu
sebelum `0018`/`0019` jalan, karena `ALTER TYPE ... ADD VALUE` tidak
boleh dipakai dalam transaksi yang sama):

```bash
supabase db push
```

Kalau lewat SQL editor manual, jalankan `0017_add_admin_role.sql` dulu
sendirian, baru `0018_school_structure.sql` dan
`0019_subject_grade_sync_and_security.sql`.

**Environment variable baru** — set di `.env.local` / Vercel:

```
SCHOOL_ADMIN_CODE=isi-dengan-string-rahasia-yang-panjang
```

Tanpa ini, tab "Kep. Sekolah → Daftar Pertama Kali" di halaman login akan
menolak pendaftaran admin (sengaja, supaya tidak sembarang orang bisa
membuat akun Kepala Sekolah).

**Yang berubah:**

- Siswa daftar dengan memilih kelas 3-6 SD + section spesifik (mis. "4A")
  dari daftar resmi yang dibuat Kepala Sekolah. Email akun Supabase Auth
  sekarang berformat `nama.siswa1234@student.internal`.
- Materi & kuis ditargetkan lewat (mata pelajaran, kelas) — otomatis
  tersinkron ke semua siswa kelas itu dari guru manapun. Tabel `classes`
  (kode-gabung kelas lama) sudah tidak dipakai kode aplikasi baru, tapi
  kolomnya tidak dihapus demi kompatibilitas data lama.
- Guru mendaftar lewat `/api/teacher/register`, memilih jadi Wali Kelas
  atau Guru Mata Pelajaran. Wali kelas otomatis dicoba ditugaskan ke
  section kosong; Kepala Sekolah bisa mengubah/menghapus penugasan kapan
  saja lewat `/admin/dashboard` (dipakai juga untuk reset di tahun ajaran
  baru — kelas dihapus, siswa di dalamnya jadi belum berkelas, datanya
  tetap aman).
- Materi mendukung upload PDF & PPT/PPTX, dipreview lewat `<iframe>`
  (PDF) dan Microsoft Office Online embed viewer (PPT). Tersinkron
  read-only ke dashboard orang tua (tab "Materi") — orang tua tidak bisa
  mengubah/menghapus apapun.
- Anti-curang kuis: tabel `quiz_attempts` mengunci status pengerjaan tiap
  siswa per kuis. Begitu siswa membuka tab/aplikasi lain saat kuis aktif
  (event `visibilitychange`), attempt langsung `forfeited` dan nilai
  tercatat 0 lewat `/api/quiz/attempt/forfeit` — kuis itu tidak bisa
  dibuka lagi. Submit ganda juga diblokir lewat unique constraint
  `quiz_results(user_id, quiz_id)`.
- **Perbaikan keamanan** (bawaan dari migrasi `0013` sebelumnya, bukan
  bagian dari revisi fitur tapi ditemukan & diperbaiki saat audit kode):
  policy RLS `USING (true)` pada `quizzes` dan `questions` yang membuat
  siswa bisa membaca kunci jawaban semua kuis lewat query langsung ke
  tabel `questions` sudah dihapus & diganti policy yang scoped per kelas.
  `/api/teacher/results` sebelumnya hanya mengecek `role='teacher'` tanpa
  cek kepemilikan kuis — sekarang wajib quiz milik sendiri atau kuis
  umum (`teacher_id IS NULL`).
- **Catatan migrasi data lama**: kuis/materi yang dibuat guru SEBELUM
  revisi ini belum punya `subject`/`class_level` (kecuali 5 kuis dummy
  bawaan yang sudah ditandai otomatis oleh migrasi `0019`), jadi untuk
  sementara tidak akan muncul ke siswa sampai gurunya membuka & menyimpan
  ulang lewat form edit yang baru (akan diminta mengisi mata pelajaran +
  kelas tujuan). Wajar untuk deployment baru tanpa data produksi lama.
