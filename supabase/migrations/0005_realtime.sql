-- Enable Supabase Realtime publication for the tables used by live hooks.
-- (Supabase creates a "supabase_realtime" publication by default; we just
--  add our tables to it. Running this is idempotent.)
alter publication supabase_realtime add table health_records;
alter publication supabase_realtime add table quiz_results;
