// src/app/api/parent/login/route.ts
// POST body: { childName: string; pin: string }
//
// Orang tua login dengan nama anak + PIN 6 digit (dilihat anak di
// dashboardnya). Server mencari siswa lewat PIN, mencocokkan nama,
// lalu membuat (kalau belum ada) / masuk ke akun orang tua sintetis
// yang terikat 1:1 ke siswa tsb, dan otomatis menautkan parent_id —
// tidak perlu langkah "hubungkan ke anak" manual lagi.

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { parentSyntheticEmail, parentSyntheticPassword } from '@/lib/parentAuth';

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function POST(req: Request) {
  try {
    const { childName, pin } = await req.json() as { childName?: string; pin?: string };

    if (!childName?.trim()) return NextResponse.json({ error: 'Nama anak wajib diisi.' }, { status: 400 });
    const pinTrimmed = pin?.trim() ?? '';
    if (!/^\d{6}$/.test(pinTrimmed)) {
      return NextResponse.json({ error: 'PIN harus 6 digit angka.' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: student } = await admin
      .from('users')
      .select('id, name, class_id')
      .eq('role', 'student')
      .eq('parent_pin', pinTrimmed)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'PIN tidak ditemukan.' }, { status: 401 });
    }

    if (normalize(student.name) !== normalize(childName)) {
      return NextResponse.json({ error: 'Nama anak tidak cocok dengan PIN ini.' }, { status: 401 });
    }

    const email = parentSyntheticEmail(student.id);
    const password = parentSyntheticPassword(student.id, pinTrimmed);

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

    let { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });

    if (signInErr) {
      // Belum pernah login sebelumnya -> buat akun orang tua sintetis dulu.
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: `Orang Tua ${student.name}`, role: 'parent' },
      });
      if (createErr) {
        console.error('[parent/login] createUser error:', createErr.message);
        return NextResponse.json({ error: 'Gagal membuat akun orang tua.' }, { status: 500 });
      }

      await new Promise((r) => setTimeout(r, 800)); // beri waktu trigger insert ke public.users

      const retry = await supabase.auth.signInWithPassword({ email, password });
      signInErr = retry.error;
    }

    if (signInErr) {
      console.error('[parent/login] signIn error:', signInErr.message);
      return NextResponse.json({ error: 'Gagal masuk. Coba lagi.' }, { status: 500 });
    }

    const { data: { user: parentUser } } = await supabase.auth.getUser();
    if (parentUser) {
      // Tautkan otomatis (idempotent — pasangan email/password ini memang
      // selalu menghasilkan UUID auth yang sama untuk siswa yang sama).
      await admin.from('users').update({ parent_id: parentUser.id }).eq('id', student.id);
    }

    const response = NextResponse.json({ ok: true, childName: student.name });
    for (const { name, value, options } of cookiesToSet) {
      response.cookies.set({ name, value, ...options });
    }
    return response;

  } catch (err) {
    console.error('[parent/login] unexpected:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
