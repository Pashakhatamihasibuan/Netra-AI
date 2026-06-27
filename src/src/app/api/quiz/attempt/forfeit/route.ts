// src/app/api/quiz/attempt/forfeit/route.ts
// POST { quizId } -> dipanggil otomatis dari QuizPlayer lewat event
// `visibilitychange` saat siswa membuka tab/aplikasi lain di tengah
// mengerjakan kuis. Efeknya permanen: attempt jadi 'forfeited' dan nilai
// kuis langsung tercatat 0 — siswa tidak bisa masuk kuis itu lagi.

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
  const now = new Date().toISOString();

  const { data: existing } = await service
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('student_id', user.id)
    .maybeSingle();

  // Sudah submitted atau sudah forfeited sebelumnya -> jangan diutak-atik lagi,
  // cukup laporkan idempotent agar klien tidak melempar error.
  if (existing?.status === 'submitted' || existing?.status === 'forfeited') {
    return NextResponse.json({ ok: true, status: existing.status });
  }

  if (existing) {
    await service
      .from('quiz_attempts')
      .update({ status: 'forfeited', ended_at: now })
      .eq('id', existing.id);
  } else {
    await service
      .from('quiz_attempts')
      .insert({ quiz_id: quizId, student_id: user.id, status: 'forfeited', ended_at: now });
  }

  const { data: profile } = await userClient.from('users').select('name').eq('id', user.id).maybeSingle();

  // Catat nilai 0 — pakai upsert supaya aman walau dipanggil dua kali
  // beruntun (mis. event visibilitychange sempat terpicu lebih dari sekali).
  await userClient.from('quiz_results').upsert(
    { user_id: user.id, quiz_id: quizId, score: 0, display_name: profile?.name ?? 'Siswa' },
    { onConflict: 'user_id,quiz_id', ignoreDuplicates: true }
  );

  return NextResponse.json({ ok: true, status: 'forfeited' });
}
