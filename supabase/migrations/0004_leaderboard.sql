-- Leaderboard support.
-- Two adjustments needed beyond the original RLS pass:
-- 1. Students may only see classmates' rows for a quiz they themselves have
--    already completed (no peeking at results for a quiz not yet taken).
-- 2. Quiz results carry a denormalized display_name, so the leaderboard
--    never needs to join into `users` (which intentionally does not let
--    students read each other's profile rows).

alter table quiz_results add column display_name text not null default 'Siswa';

create policy "student reads leaderboard of completed quiz"
  on quiz_results for select
  using (
    app_role() = 'student'
    and exists (
      select 1 from quiz_results mine
      where mine.quiz_id = quiz_results.quiz_id and mine.user_id = auth.uid()
    )
  );
