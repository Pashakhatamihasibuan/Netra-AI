// GET /api/teacher/quiz/list
// Service role — kuis milik guru + kuis umum (teacher_id=null) muncul tanpa RLS block
import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function GET() {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { data, error } = await admin
    .from('quizzes')
    .select('*')
    .or(`teacher_id.eq.${user.id},teacher_id.is.null`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ quizzes: data ?? [] });
}
