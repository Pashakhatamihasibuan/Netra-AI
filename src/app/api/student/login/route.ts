// src/app/api/student/login/route.ts
// Login siswa kembali — hanya butuh kode akses 8 karakter.
// Server menurunkan email sintetis + password dari kode tersebut dan
// melakukan signInWithPassword ke Supabase, lalu mengirim session cookie.
//
// POST body: { accessCode: string }
// Response:  { ok: true } — browser diarahkan ke /student/dashboard oleh klien

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { syntheticPassword } from '@/lib/studentAuth';

export async function POST(req: Request) {
  try {
    const { accessCode } = await req.json() as { accessCode?: string };

    if (!accessCode?.trim()) {
      return NextResponse.json({ error: 'Kode akses wajib diisi.' }, { status: 400 });
    }

    const code = accessCode.trim().toUpperCase();

    // 1. Validasi kode akses ada di DB (cegah brute-force pada login attempt)
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: student } = await admin
      .from('users')
      .select('id, name, email')
      .eq('access_code', code)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Kode akses tidak ditemukan.' }, { status: 401 });
    }

    // 2. Sign in via SSR client (ini yang menanam cookie sesi ke browser)
    const cookieStore = cookies();
    const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: (n: string, v: string, o: any) => cookiesToSet.push({ name: n, value: v, options: o }),
          remove: (n: string, o: any) => cookiesToSet.push({ name: n, value: '', options: o }),
        },
      }
    );

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email:    student.email,
      password: syntheticPassword(code),
    });

    if (signInErr) {
      console.error('[student/login] signIn error:', signInErr.message);
      return NextResponse.json({ error: 'Kode akses salah atau akun tidak aktif.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, name: student.name });
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set({ name, value, ...options });
    }
    return response;

  } catch (err) {
    console.error('[student/login] unexpected:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
