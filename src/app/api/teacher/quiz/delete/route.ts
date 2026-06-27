// DELETE /api/teacher/quiz/delete  { quizId }
// Service role agar bisa hapus kuis meski RLS anon client blokir
import { NextRequest, NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function DELETE(req: NextRequest) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { quizId } = await req.json().catch(() => ({}));
  if (!quizId) return NextResponse.json({ error: 'quizId wajib.' }, { status: 400 });

  const { data: quiz } = await admin.from('quizzes').select('teacher_id').eq('id', quizId).maybeSingle();
  if (!quiz || quiz.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Tidak dapat menghapus kuis ini.' }, { status: 403 });
  }

  const { error } = await admin.from('quizzes').delete().eq('id', quizId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
