-- ============================================================
-- 0014_fix_teacher_leaderboard.sql
-- ============================================================

-- Teacher needs to be able to see quiz results for quizzes they own AND
-- for public/dummy quizzes (where teacher_id is null).
-- Currently, the policy requires q.teacher_id = auth.uid(), which excludes dummy quizzes.

DROP POLICY IF EXISTS "teacher reads results for own quizzes" ON public.quiz_results;

CREATE POLICY "teacher reads results for own quizzes"
  ON public.quiz_results FOR SELECT
  USING (
    app_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.quizzes q 
      WHERE q.id = quiz_id 
      AND (q.teacher_id = auth.uid() OR q.teacher_id IS NULL)
    )
  );
