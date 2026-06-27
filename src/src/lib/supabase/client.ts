import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. Every query made through this client is
// subject to RLS as the signed-in user — there is no service-role bypass
// here on purpose.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
