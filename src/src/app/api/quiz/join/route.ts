// POST — siswa masukkan kode quiz untuk mendapatkan quizId
// Body: { quizCode: string }
// Response: { quizId: string; title: string }

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Belum login.' }, { status: 401 });

  const body = await req.json() as { quizCode?: string };
  const code = body.quizCode?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Kode quiz wajib diisi.' }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: quiz } = await admin
    .from('quizzes')
    .select('id, title')
    .eq('quiz_code', code)
    .maybeSingle();

  if (!quiz) {
    return NextResponse.json({ error: 'Kode quiz tidak valid. Cek kembali kode dari gurumu.' }, { status: 404 });
  }

  return NextResponse.json({ quizId: quiz.id, title: quiz.title });
}
