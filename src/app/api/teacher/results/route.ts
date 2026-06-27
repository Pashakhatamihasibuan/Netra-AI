import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');

  if (!quizId) {
    return NextResponse.json({ error: 'quizId diperlukan' }, { status: 400 });
  }

  // Verify caller is authenticated via their Bearer token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  // Use service role client to verify token and check role
  const serviceClient = createServiceRoleClient();
  const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 401 });
  }

  // Check user role in our users table
  const { data: userData } = await serviceClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userData?.role !== 'teacher') {
    return NextResponse.json({ error: 'Hanya guru yang bisa mengakses ini' }, { status: 403 });
  }

  // PERBAIKAN KEAMANAN: sebelumnya endpoint ini hanya mengecek role='teacher'
  // lalu langsung query quiz_results pakai service role (bypass RLS) — artinya
  // guru A bisa melihat hasil kuis milik guru B hanya dengan menebak/mengganti
  // quizId di parameter. Sekarang wajib cek dulu kuis ini benar miliknya
  // sendiri ATAU kuis bersama/umum (teacher_id null), persis seperti pola RLS
  // yang sama dipakai di tabel quizzes (migrasi 0019).
  const { data: quiz } = await serviceClient
    .from('quizzes')
    .select('id, teacher_id')
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz || (quiz.teacher_id !== null && quiz.teacher_id !== user.id)) {
    return NextResponse.json({ error: 'Kuis tidak ditemukan atau bukan milikmu.' }, { status: 403 });
  }

  // Fetch quiz results using service role (bypasses RLS entirely)
  // This ensures dummy quizzes (teacher_id=null) are visible too
  const { data: results, error } = await serviceClient
    .from('quiz_results')
    .select('id, user_id, quiz_id, score, display_name, created_at')
    .eq('quiz_id', quizId)
    .order('score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: results ?? [] });
}
