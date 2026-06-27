// GET ?childId=...              → daftar kuis anak + jumlah warning tiap kuis
// GET ?childId=...&quizId=...   → detail per soal untuk 1 kuis

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('childId');
  const quizId  = searchParams.get('quizId');

  if (!childId) return NextResponse.json({ error: 'childId diperlukan' }, { status: 400 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });

  const service = createServiceRoleClient();
  const { data: { user }, error: authError } = await service.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });

  const { data: child } = await service.from('users').select('id, name, parent_id, role').eq('id', childId).maybeSingle();
  if (!child || child.role !== 'student') return NextResponse.json({ error: 'Siswa tidak ditemukan.' }, { status: 404 });
  if (child.parent_id !== user.id) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });

  // ── Mode 2: detail per soal 1 kuis ───────────────────────────────────────
  if (quizId) {
    const { data: rows } = await service
      .from('quiz_question_monitoring')
      .select('question_index, answered_at, avg_distance_cm, min_distance_cm, max_distance_cm, dominant_posture, lighting, avg_blink_rate, has_warning, warning_reasons, warning_count, total_seconds')
      .eq('quiz_id', quizId)
      .eq('student_id', childId)
      .order('question_index', { ascending: true });

    return NextResponse.json({ questions: rows ?? [] });
  }

  // ── Mode 1: daftar kuis anak ──────────────────────────────────────────────
  const { data: attempts } = await service
    .from('quiz_attempts')
    .select('quiz_id, started_at, status, quizzes(title, subject, class_level)')
    .eq('student_id', childId)
    .order('started_at', { ascending: false })
    .limit(20);

  const quizIds = [...new Set((attempts ?? []).map((a) => a.quiz_id))];
  const { data: warnRows } = await service
    .from('quiz_question_monitoring')
    .select('quiz_id, has_warning, warning_count')
    .eq('student_id', childId)
    .in('quiz_id', quizIds.length > 0 ? quizIds : ['none']);

  const warnMap: Record<string, number> = {};
  for (const r of warnRows ?? [])
    if (r.has_warning) warnMap[r.quiz_id] = (warnMap[r.quiz_id] ?? 0) + (r.warning_count ?? 1);

  return NextResponse.json({
    quizzes: (attempts ?? []).map((a) => ({
      quizId:     a.quiz_id,
      title:      (a.quizzes as any)?.title ?? 'Kuis',
      subject:    (a.quizzes as any)?.subject ?? null,
      classLevel: (a.quizzes as any)?.class_level ?? null,
      startedAt:  a.started_at,
      status:     a.status,
      warnings:   warnMap[a.quiz_id] ?? 0,
    })),
  });
}
