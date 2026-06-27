import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

interface SubmitBody {
  quizId: string;
  answers: Array<{ questionId: string; selected: 'A' | 'B' | 'C' | 'D' }>;
}

// Scoring happens here, server-side, with the service role client — the
// browser never receives correct_answer for any question, only the final
// score. The result row is then written through the user's own session so
// RLS still validates that they're a student writing their own result.
export async function POST(request: Request) {
  const body: SubmitBody = await request.json();
  const userClient = createServerSupabaseClient();

  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  // ── Anti-curang: cek status attempt sebelum menilai ──────────────────
  const { data: attempt } = await serviceClient
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', body.quizId)
    .eq('student_id', authData.user.id)
    .maybeSingle();

  if (attempt?.status === 'forfeited') {
    return NextResponse.json(
      { error: 'Kuis ini sudah dihentikan karena kamu sempat membuka tab lain. Nilai akhir: 0.', score: 0 },
      { status: 403 }
    );
  }

  if (attempt?.status === 'submitted') {
    // Submit ganda (mis. klik dobel / refresh) -> kembalikan skor yang sudah
    // tersimpan, jangan dinilai ulang (unique constraint juga akan menolak
    // insert kedua, tapi kita tangani lebih awal supaya pesannya ramah).
    const { data: existingResult } = await serviceClient
      .from('quiz_results')
      .select('score')
      .eq('quiz_id', body.quizId)
      .eq('user_id', authData.user.id)
      .maybeSingle();
    return NextResponse.json({
      score: existingResult?.score ?? 0,
      correctCount: null,
      totalQuestions: null,
      alreadySubmitted: true,
    });
  }

  const { data: profile } = await userClient
    .from('users')
    .select('name')
    .eq('id', authData.user.id)
    .single();

  const { data: questions, error } = await serviceClient
    .from('questions')
    .select('id, correct_answer')
    .eq('quiz_id', body.quizId);

  if (error || !questions) {
    return NextResponse.json({ error: 'Could not load quiz' }, { status: 400 });
  }

  const correctMap = new Map(questions.map((q) => [q.id, q.correct_answer]));
  const totalQuestions = questions.length || 1;
  const correctCount = body.answers.filter((a) => correctMap.get(a.questionId) === a.selected).length;
  const score = Math.round((correctCount / totalQuestions) * 100);

  // PENTING: pakai serviceClient, bukan userClient, untuk insert/update hasil
  // asli. Policy RLS "student forfeits own result to zero" sengaja membatasi
  // UPDATE lewat sesi siswa HANYA boleh score=0 (anti-curang forfeit). Kalau
  // baris quiz_results untuk quiz ini sudah ada (mis. race condition saat
  // forfeit ke-trigger sebentar lalu siswa lanjut & submit beneran), upsert
  // lewat userClient akan masuk path UPDATE dan DITOLAK diam-diam oleh policy
  // itu karena score asli != 0 — hasil kuis hilang. Skor di sini sudah
  // dihitung & divalidasi sepenuhnya di server, jadi aman bypass RLS di sini.
  const { error: insertError } = await serviceClient.from('quiz_results').upsert(
    {
      user_id: authData.user.id,
      quiz_id: body.quizId,
      score,
      display_name: profile?.name ?? 'Siswa',
    },
    { onConflict: 'user_id,quiz_id' }
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  // Tandai attempt selesai supaya tidak bisa dikerjakan ulang.
  const now = new Date().toISOString();
  if (attempt) {
    await serviceClient.from('quiz_attempts').update({ status: 'submitted', ended_at: now }).eq('id', attempt.id);
  } else {
    // Jaga-jaga: submit terjadi tanpa pernah memanggil attempt/start
    // (mis. klien lama / akses langsung). Tetap catat sebagai submitted.
    await serviceClient.from('quiz_attempts').insert({
      quiz_id: body.quizId, student_id: authData.user.id, status: 'submitted', ended_at: now,
    });
  }

  return NextResponse.json({ score, correctCount, totalQuestions });
}
