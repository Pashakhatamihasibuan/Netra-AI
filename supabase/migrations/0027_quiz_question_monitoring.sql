-- ============================================================
-- 0027_quiz_question_monitoring.sql
-- Breakdown Computer Vision PER SOAL (bukan per detik). Menggantikan
-- pendekatan quiz_monitoring_log (raw log per detik, tidak dipakai lagi
-- oleh kode manapun setelah migrasi ini) — sekarang 1 baris = 1 soal,
-- dengan agregat (rata-rata/min/maks jarak, postur dominan, dst) DAN
-- raw_samples (jsonb) untuk audit/forensik kalau perlu data mentahnya.
--
-- Kolom & nama persis disesuaikan dengan yang dikonsumsi:
-- - src/app/api/quiz/monitoring-log/route.ts   (INSERT)
-- - src/app/api/teacher/monitoring/route.ts    (SELECT, guru)
-- - src/app/api/parent/monitoring/route.ts     (SELECT, orang tua)
-- - src/components/shared/QuizMonitoringDetail.tsx (tipe QuestionMonitorRow)
-- ============================================================

create table if not exists quiz_question_monitoring (
  id              uuid primary key default uuid_generate_v4(),
  quiz_id         uuid not null references quizzes(id) on delete cascade,
  student_id      uuid not null references users(id) on delete cascade,
  attempt_id      uuid references quiz_attempts(id) on delete cascade,

  question_index  int not null,             -- 0-based, soal ke-(index+1)
  answered_at     timestamptz not null,     -- saat siswa pindah dari soal ini / submit

  avg_distance_cm numeric,
  min_distance_cm numeric,
  max_distance_cm numeric,

  dominant_posture text,                    -- 'good' | 'forward' | 'back' | null
  lighting         text,                    -- 'good' | 'dim' | 'bright' | null
  avg_blink_rate   numeric,

  has_warning      boolean not null default false,
  warning_reasons  text[] not null default '{}',  -- subset dari {posture, too_close, too_far}
  warning_count    int not null default 0,        -- jumlah sample (detik) dengan warning di soal ini
  total_seconds    int not null default 0,         -- total sample (detik) terekam di soal ini

  raw_samples      jsonb,                   -- array mentah sample per detik (audit/forensik)

  created_at timestamptz not null default now(),
  unique (quiz_id, student_id, question_index) -- 1 ringkasan per soal per siswa per kuis
);

create index if not exists idx_qqm_quiz_student on quiz_question_monitoring(quiz_id, student_id);
create index if not exists idx_qqm_attempt        on quiz_question_monitoring(attempt_id);
create index if not exists idx_qqm_warnings       on quiz_question_monitoring(quiz_id, student_id) where has_warning;

alter table quiz_question_monitoring enable row level security;

-- Siswa hanya insert baris untuk dirinya sendiri. Pakai UPSERT di sisi
-- aplikasi kalau perlu menimpa baris soal yang sama (unique constraint
-- di atas mencegah duplikat baris untuk soal yang sama).
drop policy if exists "student inserts own question monitoring" on quiz_question_monitoring;
create policy "student inserts own question monitoring"
  on quiz_question_monitoring for insert
  with check (app_role() = 'student' and student_id = auth.uid());

drop policy if exists "teacher reads question monitoring for own quizzes" on quiz_question_monitoring;
create policy "teacher reads question monitoring for own quizzes"
  on quiz_question_monitoring for select
  using (
    app_role() = 'teacher'
    and exists (select 1 from quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

drop policy if exists "parent reads child question monitoring" on quiz_question_monitoring;
create policy "parent reads child question monitoring"
  on quiz_question_monitoring for select
  using (
    app_role() = 'parent'
    and exists (select 1 from users u where u.id = student_id and u.parent_id = auth.uid())
  );

-- Realtime: dipakai ParentMonitoringView.tsx dan MonitoringSummaryModal.tsx
-- (guru) untuk update tampilan otomatis saat siswa sedang mengerjakan kuis.
do $$ begin
  alter publication supabase_realtime add table quiz_question_monitoring;
exception when duplicate_object then null; end $$;
