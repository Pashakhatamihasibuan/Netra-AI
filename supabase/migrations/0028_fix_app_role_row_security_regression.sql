-- ============================================================
-- 0028_fix_app_role_row_security_regression.sql
--
-- BUG: Guru tidak melihat kuis lama miliknya di tab "Kuis Saya"
-- (browser melaporkan list kosong/tidak lengkap meski data ada di DB).
--
-- ROOT CAUSE: migrasi 0009 menambahkan `set row_security = off` pada
-- app_role() dengan alasan jelas (tertulis di komentar 0009): tanpa baris
-- itu, query `select role from public.users where id = auth.uid()` DI
-- DALAM function ini sendiri ikut dievaluasi ulang lewat RLS table users
-- — function dipanggil dari policy RLS tabel lain (mis. quizzes), jadi
-- ini berpotensi membuat app_role() gagal/tidak konsisten tepat di
-- momen RLS sedang mengevaluasi sebuah query, alih-alih query independen.
--
-- Migrasi 0012 (lebih baru, dibuat untuk alasan lain — menambah fallback
-- 'student' lewat coalesce) MENULIS ULANG app_role() dari nol dan secara
-- tidak sengaja TIDAK menyertakan `set row_security = off` lagi. Sejak
-- itu, app_role() berjalan TANPA baris pelindung tersebut.
--
-- DAMPAK: Policy "teacher reads own or shared quizzes" di tabel quizzes
-- bergantung pada app_role() = 'teacher'. Kuis yang guru buat SEBELUM
-- baris ini hilang mungkin masih konsisten, tapi perilaku app_role() di
-- bawah RLS evaluation context menjadi tidak terjamin — guru yang akun
-- atau sesinya tertentu (kapan persis bergantung pada query planner,
-- caching, atau urutan evaluasi gabungan policy) bisa melihat hasil
-- kosong/parsial dari `select * from quizzes` lewat browser client.
--
-- FIX: cukup tulis ulang app_role() SEKALI LAGI, kali ini mempertahankan
-- SEMUA perbaikan dari kedua migrasi sebelumnya sekaligus — fallback
-- 'student' dari 0012 DAN row_security=off dari 0009. Tidak ada
-- perubahan skema lain.
-- ============================================================

create or replace function app_role()
returns user_role
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (select role from public.users where id = auth.uid()),
    'student'::user_role
  );
$$;

-- Verifikasi cepat (jalankan manual sebagai diri sendiri di SQL Editor,
-- bukan otomatis): pastikan tidak ada lagi `create or replace function
-- app_role` SETELAH file ini di migrasi mendatang tanpa row_security=off,
-- atau bug ini akan berulang lagi.

-- ============================================================
-- DIAGNOSTIK TAMBAHAN (jalankan manual, bukan bagian dari fix ini)
-- Jalankan 2 query di bawah sebagai service-role (bypass RLS) di SQL
-- Editor untuk menyingkirkan kemungkinan lain selain bug app_role():
--
-- 1) Pastikan kuis "yang hilang" benar-benar punya teacher_id yang
--    cocok dengan akun guru tersebut (bukan NULL atau guru lain):
--    select id, title, teacher_id, created_at from quizzes
--    where teacher_id = '<uuid guru tersebut>' order by created_at;
--
-- 2) Pastikan akun guru tersebut memang ber-role 'teacher' di tabel
--    users (kalau salah, app_role() akan fallback ke 'student' lewat
--    coalesce, dan policy teacher tidak akan pernah lolos):
--    select id, name, role from users where id = '<uuid guru tersebut>';
-- ============================================================
