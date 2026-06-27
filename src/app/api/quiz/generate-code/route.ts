// POST — guru generate kode akses quiz (6 huruf)
// Body: { quizId: string }
// Response: { quizCode: string }

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function generateQuizCode(): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  const body = await req.json() as { quizId?: string };
  if (!body.quizId) return NextResponse.json({ error: 'quizId wajib.' }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Pastikan quiz milik guru ini
  const { data: quiz } = await admin
    .from('quizzes')
    .select('id, quiz_code')
    .eq('id', body.quizId)
    .eq('teacher_id', user.id)
    .maybeSingle();

  if (!quiz) return NextResponse.json({ error: 'Quiz tidak ditemukan.' }, { status: 404 });

  // Jika sudah ada kode, kembalikan yang lama
  if (quiz.quiz_code) {
    return NextResponse.json({ quizCode: quiz.quiz_code });
  }

  // Generate kode unik
  let quizCode = '';
  for (let i = 0; i < 10; i++) {
    const candidate = generateQuizCode();
    const { data: existing } = await admin
      .from('quizzes')
      .select('id')
      .eq('quiz_code', candidate)
      .maybeSingle();
    if (!existing) { quizCode = candidate; break; }
  }
  if (!quizCode) return NextResponse.json({ error: 'Gagal generate kode.' }, { status: 500 });

  await admin.from('quizzes').update({ quiz_code: quizCode }).eq('id', body.quizId);

  return NextResponse.json({ quizCode });
}
