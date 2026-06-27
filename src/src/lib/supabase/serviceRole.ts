import { createClient } from '@supabase/supabase-js';

// Server-only client that bypasses RLS using the service role key.
// Used exclusively to read the answer key during scoring — never imported
// into any client component, and never used to write on a user's behalf.
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
