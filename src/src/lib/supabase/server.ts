import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Gunakan fungsi ini di Route Handlers (app/api/**/route.ts) dan Server Actions
// di mana cookies() bisa di-read DAN di-write.
export function createServerSupabaseClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Di Server Component (bukan Route Handler), set() akan throw.
            // Tidak apa-apa — middleware sudah handle refresh token.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Sama seperti set() di atas.
          }
        },
      },
    }
  );
}

// Alias untuk keterbacaan di Server Components — perilaku sama,
// tapi nama lebih jelas bahwa ini read-only context.
export const createServerSupabaseClientReadOnly = createServerSupabaseClient;
