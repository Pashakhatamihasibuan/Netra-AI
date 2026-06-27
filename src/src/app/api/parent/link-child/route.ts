// src/app/api/parent/link-child/route.ts
// POST body: { accessCode: string }
// Orang tua memasukkan kode akses anaknya → parent_id di-set otomatis.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { accessCode } = await req.json() as { accessCode?: string };
  if (!accessCode?.trim()) return NextResponse.json({ error: 'Kode akses wajib.' }, { status: 400 });

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Verifikasi orang tua
  const { data: parentProfile } = await admin
    .from('users').select('role').eq('id', user.id).maybeSingle();
  if (parentProfile?.role !== 'parent') return NextResponse.json({ error: 'Bukan orang tua.' }, { status: 403 });

  // Cari siswa berdasarkan kode akses
  const { data: student } = await admin
    .from('users')
    .select('id, name, parent_id')
    .eq('access_code', accessCode.trim().toUpperCase())
    .eq('role', 'student')
    .maybeSingle();

  if (!student) return NextResponse.json({ error: 'Kode akses tidak ditemukan.' }, { status: 404 });
  if (student.parent_id && student.parent_id !== user.id) {
    return NextResponse.json({ error: 'Siswa ini sudah terhubung ke akun orang tua lain.' }, { status: 409 });
  }

  const { error } = await admin
    .from('users')
    .update({ parent_id: user.id })
    .eq('id', student.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, childName: student.name });
}
