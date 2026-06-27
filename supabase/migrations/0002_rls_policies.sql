-- EyeQuiz AI: Row Level Security
-- Mirrors the access diagram: teacher gets CRUD on their own quizzes and
-- read-only on student health/results; student gets read-only quiz content
-- (never the answer key) and insert-only on their own results/health data;
-- parent gets read-only on their own child's data. Everything is default-deny
-- until a policy explicitly opens it up.

alter table users          enable row level security;
alter table quizzes        enable row level security;
alter table questions      enable row level security;
alter table quiz_results   enable row level security;
alter table health_records enable row level security;
alter table badges         enable row level security;
alter table user_badges    enable row level security;

-- Helper: read the caller's own role without recursive RLS lookups.
-- security definer + fixed search_path is the standard Supabase pattern
-- for this kind of "who am I" helper.
create function app_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid();
$$;

create function app_is_student_of_teacher(student_id uuid, teacher_uid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from quiz_results qr
    join quizzes q on q.id = qr.quiz_id
    where qr.user_id = student_id and q.teacher_id = teacher_uid
  );
$$;

-- ===================== users =====================
create policy "user reads own row"
  on users for select
  using (id = auth.uid());

create policy "teacher reads own students"
  on users for select
  using (app_role() = 'teacher' and app_is_student_of_teacher(id, auth.uid()));

create policy "parent reads own child"
  on users for select
  using (app_role() = 'parent' and parent_id = auth.uid());

create policy "user updates own row"
  on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===================== quizzes =====================
create policy "anyone authenticated reads quizzes"
  on quizzes for select
  to authenticated
  using (true);

create policy "teacher manages own quizzes"
  on quizzes for all
  using (app_role() = 'teacher' and teacher_id = auth.uid())
  with check (app_role() = 'teacher' and teacher_id = auth.uid());

-- ===================== questions =====================
-- No student-facing select policy here on purpose: students must go through
-- the questions_for_student view below, which never exposes correct_answer.
create policy "teacher manages own questions"
  on questions for all
  using (
    app_role() = 'teacher'
    and exists (select 1 from quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  )
  with check (
    app_role() = 'teacher'
    and exists (select 1 from quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

-- View deliberately strips correct_answer. Owned by the migration role, so it
-- reads the base table with the view owner's privileges (bypassing the
-- table's RLS) while still being safe to expose: the secret column simply
-- isn't selected here. This is the "hide the answer key at the query layer,
-- not just in the UI" pattern.
create view questions_for_student as
  select id, quiz_id, question, option_a, option_b, option_c, option_d, order_index
  from questions;

grant select on questions_for_student to authenticated;

-- ===================== quiz_results =====================
create policy "student inserts own result"
  on quiz_results for insert
  with check (app_role() = 'student' and user_id = auth.uid());

create policy "student reads own results"
  on quiz_results for select
  using (user_id = auth.uid());

create policy "teacher reads results for own quizzes"
  on quiz_results for select
  using (
    app_role() = 'teacher'
    and exists (select 1 from quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

create policy "parent reads child results"
  on quiz_results for select
  using (
    app_role() = 'parent'
    and exists (select 1 from users u where u.id = user_id and u.parent_id = auth.uid())
  );

-- ===================== health_records =====================
-- Insert-only for students: once written, a session's metrics shouldn't be
-- editable by anyone client-side, including the student, to keep the data
-- trustworthy for parents/teachers and any later research use.
create policy "student inserts own health record"
  on health_records for insert
  with check (app_role() = 'student' and user_id = auth.uid());

create policy "student reads own health records"
  on health_records for select
  using (user_id = auth.uid());

create policy "teacher reads health of own students"
  on health_records for select
  using (app_role() = 'teacher' and app_is_student_of_teacher(user_id, auth.uid()));

create policy "parent reads child health records"
  on health_records for select
  using (
    app_role() = 'parent'
    and exists (select 1 from users u where u.id = user_id and u.parent_id = auth.uid())
  );

-- ===================== badges / user_badges =====================
create policy "anyone authenticated reads badge catalog"
  on badges for select
  to authenticated
  using (true);

create policy "user reads own badges"
  on user_badges for select
  using (user_id = auth.uid());

create policy "parent reads child badges"
  on user_badges for select
  using (
    app_role() = 'parent'
    and exists (select 1 from users u where u.id = user_id and u.parent_id = auth.uid())
  );

create policy "teacher reads badges of own students"
  on user_badges for select
  using (app_role() = 'teacher' and app_is_student_of_teacher(user_id, auth.uid()));

-- Badge awards are written by a server-side route using the service role
-- key (bypasses RLS deliberately), so no client insert policy exists here.
