import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qaeepfiktnqmcvstnjup.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhZWVwZmlrdG5xbWN2c3RuanVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgxMzcxMiwiZXhwIjoyMDk3Mzg5NzEyfQ.NIXrz6DxzBYtE74JNGoEdAPVhexdHBjIFTRFUZwJXRA';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkResults() {
  console.log('Fetching quiz_results...');
  const { data, error } = await supabase.from('quiz_results').select('*');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} results:`);
    console.log(data);
  }
}

checkResults();
