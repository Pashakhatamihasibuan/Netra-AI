// src/app/api/quiz/attempt/start/route.ts
// POST { quizId } -> dipanggil saat QuizPlayer pertama kali render.
// - Kalau siswa SUDAH submit kuis ini -> 409, kembalikan skor lama (tidak
//   bisa mengerjakan ulang untuk menaikkan nilai).
// - Kalau siswa SUDAH forfeited (pernah pindah tab di percobaan
//   sebelumnya) -> 403, tidak bisa masuk lagi sama sekali.
// - Kalau belum ada attempt -> buat baris baru status 'in_progress'.
// - Kalau ada attempt 'in_progress' (refresh halaman) -> lanjutkan saja.

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function POST(req: Request) {
  const userClient = createServerSupabaseClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  const { quizId } = await req.json().catch(() => ({})) as { quizId?: string };
  if (!quizId) return NextResponse.json({ error: 'quizId wajib diisi.' }, { status: 400 });

  const service = createServiceRoleClient();

  const { data: existing } = await service
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (existing?.status === 'forfeited') {
    return NextResponse.json(
      { blocked: true, reason: 'forfeited', message: 'Kuis ini sudah dihentikan karena kamu membuka tab lain saat mengerjakan. Nilai akhir: 0.' },
      { status: 403 }
    );
  }

  if (existing?.status === 'submitted') {
    const { data: result } = await service
      .from('quiz_results')
      .select('score')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .maybeSingle();
    return NextResponse.json(
      { blocked: true, reason: 'submitted', message: 'Kamu sudah pernah mengerjakan kuis ini.', score: result?.score ?? null },
      { status: 409 }
    );
  }

  let attemptId: string | undefined = existing?.id;

  if (!existing) {
    const { data: created, error } = await service
      .from('quiz_attempts')
      .insert({ quiz_id: quizId, student_id: user.id, status: 'in_progress' })
      .select('id')
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    attemptId = created?.id;
  }

  return NextResponse.json({ blocked: false, attemptId });
}
