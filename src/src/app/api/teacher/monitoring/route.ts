// GET ?quizId=...             → ringkasan per siswa (jumlah soal, total warning, breakdown)
// GET ?quizId=...&studentId=. → detail per soal untuk 1 siswa

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quizId    = searchParams.get('quizId');
  const studentId = searchParams.get('studentId');

  if (!quizId) return NextResponse.json({ error: 'quizId diperlukan' }, { status: 400 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });

  const service = createServiceRoleClient();
  const { data: { user }, error: authError } = await service.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });

  const { data: userData } = await service.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'teacher') return NextResponse.json({ error: 'Hanya guru' }, { status: 403 });

  const { data: quiz } = await service.from('quizzes').select('id, teacher_id').eq('id', quizId).maybeSingle();
  if (!quiz || (quiz.teacher_id !== null && quiz.teacher_id !== user.id))
    return NextResponse.json({ error: 'Kuis tidak ditemukan atau bukan milikmu.' }, { status: 403 });

  // ── Detail: per soal untuk 1 siswa ──────────────────────────────────────
  if (studentId) {
    const { data: rows } = await service
      .from('quiz_question_monitoring')
      .select('question_index, answered_at, avg_distance_cm, min_distance_cm, max_distance_cm, dominant_posture, lighting, avg_blink_rate, has_warning, warning_reasons, warning_count, total_seconds')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('question_index', { ascending: true });

    return NextResponse.json({ questions: rows ?? [] });
  }

  // ── Ringkasan: agregat per siswa ────────────────────────────────────────
  const { data: rows } = await service
    .from('quiz_question_monitoring')
    .select('student_id, question_index, has_warning, warning_reasons, warning_count, total_seconds')
    .eq('quiz_id', quizId);

  if (!rows?.length) return NextResponse.json({ summary: [] });

  // Ambil nama siswa
  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const { data: students } = await service.from('users').select('id, name').in('id', studentIds);
  const nameMap = Object.fromEntries((students ?? []).map((s) => [s.id, s.name]));

  const byStudent: Record<string, {
    studentId: string; name: string; questionCount: number;
    totalWarnings: number; byReason: Record<string, number>; totalSeconds: number;
  }> = {};

  for (const r of rows) {
    if (!byStudent[r.student_id]) {
      byStudent[r.student_id] = {
        studentId: r.student_id,
        name: nameMap[r.student_id] ?? '—',
        questionCount: 0,
        totalWarnings: 0,
        byReason: {},
        totalSeconds: 0,
      };
    }
    const s = byStudent[r.student_id];
    s.questionCount++;
    s.totalWarnings += r.warning_count ?? 0;
    s.totalSeconds  += r.total_seconds ?? 0;
    for (const reason of (r.warning_reasons ?? [])) {
      s.byReason[reason] = (s.byReason[reason] ?? 0) + (r.warning_count ?? 1);
    }
  }

  return NextResponse.json({ summary: Object.values(byStudent) });
}
