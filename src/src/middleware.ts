import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

const ROLE_PREFIXES: Record<string, UserRole> = {
  '/student': 'student',
  '/teacher': 'teacher',
  '/parent':  'parent',
  '/admin':   'admin',
};

export async function middleware(request: NextRequest) {
  // PENTING: response harus dibuat dari NextResponse.next() dengan request
  // agar cookie yang di-set Supabase ikut ter-forward ke request berikutnya.
  // Tanpa ini, token refresh ter-set di response tapi tidak terbaca di request
  // selanjutnya → middleware selalu lihat sesi kosong → redirect loop.
  let response = NextResponse.next({ request: { headers: request.headers } });

  const matchedPrefix = Object.keys(ROLE_PREFIXES).find((p) =>
    request.nextUrl.pathname.startsWith(p)
  );
  if (!matchedPrefix) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set di KEDUA tempat: request (agar middleware step berikutnya baca)
          // dan response (agar browser terima cookie yang diperbarui).
          request.cookies.set({ name, value, ...options } as any);
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options } as any);
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // getUser() melakukan network call ke Supabase Auth untuk verifikasi token.
  // Ini lebih aman daripada getSession() yang hanya baca cookie lokal.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = user.user_metadata?.role as UserRole | undefined;
  if (role !== ROLE_PREFIXES[matchedPrefix]) {
    // User login tapi role salah — arahkan ke dashboard yang benar
    const correctRoute = role ? `/${role}/dashboard` : '/';
    return NextResponse.redirect(new URL(correctRoute, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/parent/:path*', '/admin/:path*'],
};
