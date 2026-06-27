import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qaeepfiktnqmcvstnjup.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZWVwZmlrdG5xbWN2c3RuanVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MTM3MTIsImV4cCI6MjA5NzM4OTcxMn0.W5yiSRJnfgsC-cXt5k9T_CWk15OxWuNAjKrYHcaOrX8';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZWVwZmlrdG5xbWN2c3RuanVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgxMzcxMiwiZXhwIjoyMDk3Mzg5NzEyfQ.NIXrz6DxzBYtE74JNGoEdAPVhexdHBjIFTRFUZwJXRA';

// Teacher ID from our earlier check
const TEACHER_ID = 'bc5ae8cd-4b96-40f2-81c8-5ec25069da59';

// 1. Check with service role (bypasses RLS) to confirm quiz_results data
const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  console.log('=== Quiz results (service role - bypasses RLS) ===');
  const { data: results, error: rErr } = await serviceClient
    .from('quiz_results')
    .select('id, quiz_id, score, display_name');
  console.log('Results:', results, 'Error:', rErr);

  console.log('\n=== Checking app_role() function - does teacher have correct metadata? ===');
  // Check what the auth.users table looks like for the teacher
  const { data: authUser, error: aErr } = await serviceClient
    .from('users')
    .select('id, name, role')
    .eq('id', TEACHER_ID)
    .single();
  console.log('Teacher user:', authUser, 'Error:', aErr);

  console.log('\n=== Check if quiz_results RLS policy allows quiz_id match ===');
  const quizId = 'd4866182-7a58-4e83-a816-23522dfe9b5d';
  const { data: quiz } = await serviceClient
    .from('quizzes')
    .select('id, teacher_id')
    .eq('id', quizId)
    .single();
  console.log('Quiz:', quiz);
  console.log('teacher_id is null?', quiz?.teacher_id === null);
}

check();
