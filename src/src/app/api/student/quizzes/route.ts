// src/app/api/student/quizzes/route.ts
// GET -> daftar kuis yang class_level-nya sama dengan kelas siswa ini,
// dari guru manapun, plus status: sudah dikerjakan (dan skornya) atau
// belum, supaya siswa tidak perlu memasukkan kode untuk kuis non-live.
// Kuis sesi langsung (Kahoot-style, pakai kode) tetap bisa diakses lewat
// alur join-kode terpisah seperti sebelumnya.

import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/api/materialAuth';

export async function GET() {
  const auth = await requireStudent();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin, profile } = auth;

  if (!profile?.grade_level) {
    return NextResponse.json({ quizzes: [] });
  }

  const { data: quizzes, error } = await admin
    .from('quizzes')
    .select('id, title, description, subject, class_level, target_section_id, created_at')
    .eq('class_level', profile.grade_level)
    .or(`target_section_id.is.null,target_section_id.eq.${profile.class_section_id ?? '00000000-0000-0000-0000-000000000000'}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!quizzes || quizzes.length === 0) return NextResponse.json({ quizzes: [] });

  const quizIds = quizzes.map((q) => q.id);

  const [{ data: results }, { data: attempts }, { data: questionCounts }] = await Promise.all([
    admin.from('quiz_results').select('quiz_id, score').eq('user_id', user.id).in('quiz_id', quizIds),
    admin.from('quiz_attempts').select('quiz_id, status').eq('student_id', user.id).in('quiz_id', quizIds),
    admin.from('questions').select('quiz_id').in('quiz_id', quizIds),
  ]);

  const scoreByQuiz = new Map((results ?? []).map((r) => [r.quiz_id, r.score]));
  const statusByQuiz = new Map((attempts ?? []).map((a) => [a.quiz_id, a.status]));
  const countByQuiz = new Map<string, number>();
  for (const q of questionCounts ?? []) {
    countByQuiz.set(q.quiz_id, (countByQuiz.get(q.quiz_id) ?? 0) + 1);
  }

  const result = quizzes.map((q) => ({
    ...q,
    question_count: countByQuiz.get(q.id) ?? 0,
    status: statusByQuiz.get(q.id) ?? null,   // null | 'in_progress' | 'submitted' | 'forfeited'
    score: scoreByQuiz.get(q.id) ?? null,
  }));

  return NextResponse.json({ quizzes: result });
}
