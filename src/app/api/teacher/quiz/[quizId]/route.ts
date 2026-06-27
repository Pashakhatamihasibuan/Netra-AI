// src/app/api/teacher/quiz/[quizId]/route.ts
// GET -> ambil 1 kuis + soal-soalnya milik guru yang login, untuk halaman
// edit. Sengaja pakai service-role (lewat requireTeacher()), BUKAN browser
// client + RLS langsung — supaya tidak rapuh terhadap masalah evaluasi RLS
// seperti yang pernah terjadi pada app_role() (lihat migrasi 0028) dan
// konsisten dengan pola yang sudah dipakai /api/teacher/materials, dst.

import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function GET(_req: Request, { params }: { params: { quizId: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { data: quiz, error: quizError } = await admin
    .from('quizzes')
    .select('*')
    .eq('id', params.quizId)
    .maybeSingle();

  if (quizError) return NextResponse.json({ error: quizError.message }, { status: 500 });
  if (!quiz) return NextResponse.json({ error: 'Kuis tidak ditemukan.' }, { status: 404 });
  if (quiz.teacher_id !== null && quiz.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Kuis ini bukan milik Anda.' }, { status: 403 });
  }

  const { data: questions, error: qError } = await admin
    .from('questions')
    .select('*')
    .eq('quiz_id', params.quizId)
    .order('order_index', { ascending: true });

  if (qError) return NextResponse.json({ error: qError.message }, { status: 500 });

  return NextResponse.json({ quiz, questions: questions ?? [] });
}
