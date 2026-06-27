-- Fix: app_role() function saat ini pakai security definer tapi tidak
-- explicitly disable row security pada dirinya sendiri. Akibatnya ketika
-- function query public.users, PostgreSQL evaluasi RLS lagi pada query
-- tersebut menggunakan role ORIGINAL caller (bukan definer) — ini
-- menyebabkan infinite loop diam-diam dan function return NULL.
--
-- Fix: tambahkan SET row_security = off agar function berjalan tanpa RLS
-- saat membaca users table. Ini aman karena:
-- 1. Function hanya SELECT kolom 'role' berdasarkan auth.uid() — tidak
--    bisa dipakai untuk baca data user lain.
-- 2. Return type adalah user_role enum, bukan row data sensitif.

create or replace function app_role()
returns user_role
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.users where id = auth.uid();
$$;

-- Sama untuk app_is_student_of_teacher — function ini juga kena masalah
-- yang sama karena query quiz_results dan quizzes yang punya RLS.
create or replace function app_is_student_of_teacher(student_id uuid, teacher_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1 from quiz_results qr
    join quizzes q on q.id = qr.quiz_id
    where qr.user_id = student_id and q.teacher_id = teacher_uid
  );
$$;
