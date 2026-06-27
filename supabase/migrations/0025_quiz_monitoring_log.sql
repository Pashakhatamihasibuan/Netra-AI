-- ============================================================
-- 0025_quiz_monitoring_log.sql
-- Log Computer Vision per-detik SELAMA kuis berlangsung, terpisah dari
-- health_records (yang snapshotnya per-sesi belajar umum, bukan per-kuis).
--
-- Desain:
-- - 1 baris quiz_attempts -> banyak baris quiz_monitoring_log (1 per detik,
--   dikirim ke server dalam batch ~5 detik sekali agar tidak membanjiri DB).
-- - has_warning + warning_reason memudahkan guru cari "menit ke berapa
--   siswa X mulai bergerak/menjauh/dst" tanpa parse semua kolom mentah.
-- ============================================================

create table if not exists quiz_monitoring_log (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  attempt_id uuid references quiz_attempts(id) on delete cascade,

  recorded_at timestamptz not null,        -- waktu sebenarnya kejadian (per detik, dari client)
  question_index int,                       -- soal ke-berapa saat itu (opsional, untuk korelasi)

  distance_cm numeric,
  posture text,                             -- 'good' | 'warning' | 'poor'
  lighting text,                            -- 'normal' | 'dark' | 'bright'
  blink_rate numeric,

  has_warning boolean not null default false,
  warning_reason text,                      -- e.g. 'posture', 'too_close', 'too_far'

  created_at timestamptz not null default now()
);

create index if not exists idx_qml_quiz_student on quiz_monitoring_log(quiz_id, student_id);
create index if not exists idx_qml_attempt        on quiz_monitoring_log(attempt_id);
create index if not exists idx_qml_recorded_at     on quiz_monitoring_log(recorded_at);
create index if not exists idx_qml_warnings        on quiz_monitoring_log(quiz_id, student_id) where has_warning;

alter table quiz_monitoring_log enable row level security;

-- Siswa hanya insert baris untuk dirinya sendiri.
drop policy if exists "student inserts own monitoring log" on quiz_monitoring_log;
create policy "student inserts own monitoring log"
  on quiz_monitoring_log for insert
  with check (app_role() = 'student' and student_id = auth.uid());

-- Siswa tidak perlu (dan tidak boleh) membaca log mentahnya sendiri kembali.
-- Guru yang punya kuis ini boleh baca untuk evaluasi.
drop policy if exists "teacher reads monitoring log for own quizzes" on quiz_monitoring_log;
create policy "teacher reads monitoring log for own quizzes"
  on quiz_monitoring_log for select
  using (
    app_role() = 'teacher'
    and exists (select 1 from quizzes q where q.id = quiz_id and q.teacher_id = auth.uid())
  );

-- Orang tua boleh lihat log anaknya sendiri.
drop policy if exists "parent reads child monitoring log" on quiz_monitoring_log;
create policy "parent reads child monitoring log"
  on quiz_monitoring_log for select
  using (
    app_role() = 'parent'
    and exists (select 1 from users u where u.id = student_id and u.parent_id = auth.uid())
  );

alter publication supabase_realtime add table quiz_monitoring_log;
