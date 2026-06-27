-- EyeQuiz AI: core schema
-- Roles are stored on the users table and mirrored into auth.users via
-- a trigger so RLS policies can read role without an extra join.

create extension if not exists "uuid-ossp";

create type user_role as enum ('student', 'teacher', 'parent');

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null,
  parent_id uuid references users(id), -- set on students, links to a parent account
  created_at timestamptz not null default now()
);

create table quizzes (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  order_index int not null default 0
);

create table quiz_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  score integer not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default now()
);

create table health_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  eye_distance_cm numeric,
  eye_distance_score numeric check (eye_distance_score between 0 and 100),
  posture_score numeric check (posture_score between 0 and 100),
  blink_rate numeric,                -- blinks per minute
  blink_score numeric check (blink_score between 0 and 100),
  lighting_score numeric check (lighting_score between 0 and 100),
  screen_time_minutes numeric,
  screen_time_score numeric check (screen_time_score between 0 and 100),
  health_score numeric check (health_score between 0 and 100),
  session_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table badges (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,        -- e.g. 'eye_guardian'
  name text not null,
  description text not null
);

create table user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- Auto-create a row in public.users right after Supabase auth sign-up.
-- Expects role + name to be passed in the sign-up call's options.data.
create function handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

create index idx_questions_quiz on questions(quiz_id);
create index idx_results_user on quiz_results(user_id);
create index idx_results_quiz on quiz_results(quiz_id);
create index idx_health_user on health_records(user_id);
create index idx_health_created on health_records(created_at);
