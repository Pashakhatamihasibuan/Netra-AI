import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
