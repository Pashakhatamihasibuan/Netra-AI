// src/app/api/admin/register/route.ts
// POST body: { name, email, password, adminCode }
//
// Pendaftaran akun Kepala Sekolah (admin) sengaja TIDAK terbuka bebas
// seperti guru/siswa — wajib menyertakan kode rahasia sekolah
// (SCHOOL_ADMIN_CODE di environment variable Vercel/Supabase) yang hanya
// diketahui pihak sekolah yang berwenang. Tanpa kode ini, siapa pun yang
// menemukan halaman /login tidak bisa membuat akun admin sendiri.

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const { name, email, password, adminCode } = await req.json() as {
      name?: string; email?: string; password?: string; adminCode?: string;
    };

    const expectedCode = process.env.SCHOOL_ADMIN_CODE;
    if (!expectedCode) {
      return NextResponse.json(
        { error: 'Pendaftaran admin belum diaktifkan. Minta administrator sistem mengatur SCHOOL_ADMIN_CODE.' },
        { status: 503 }
      );
    }
    if (!adminCode || adminCode !== expectedCode) {
      return NextResponse.json({ error: 'Kode admin salah.' }, { status: 403 });
    }

    const trimmedName = name?.trim();
    const trimmedEmail = email?.trim().toLowerCase();
    if (!trimmedName)  return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    if (!trimmedEmail) return NextResponse.json({ error: 'Email wajib diisi.' }, { status: 400 });
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    }

    const admin = makeAdmin();

    const { data: authData, error: signUpErr } = await admin.auth.admin.createUser({
      email: trimmedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: trimmedName, role: 'admin' },
    });

    if (signUpErr || !authData.user) {
      const msg = signUpErr?.message ?? 'unknown';
      const duplicate = /already.*registered|already.*exists|duplicate/i.test(msg);
      return NextResponse.json(
        { error: duplicate ? 'Email sudah terdaftar.' : 'Gagal membuat akun: ' + msg },
        { status: duplicate ? 409 : 500 }
      );
    }

    await new Promise((r) => setTimeout(r, 800));

    await admin.from('users').update({ role: 'admin', name: trimmedName }).eq('id', authData.user.id);

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

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    if (signInErr) {
      return NextResponse.json({ success: true, autoSignedIn: false });
    }

    const response = NextResponse.json({ success: true, autoSignedIn: true });
    for (const { name: cn, value, options } of cookiesToSet) {
      response.cookies.set({ name: cn, value, ...options });
    }
    return response;

  } catch (err) {
    console.error('[admin/register] unexpected:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
