// GET ?childId=... → riwayat nilai kuis anak, diakses via service role
// supaya tidak terblokir RLS parent-only yang hanya cover baris anaknya sendiri.

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

export async function GET(request: NextRequest) {
  const childId = new URL(request.url).searchParams.get('childId');
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceRoleClient();
  const { data: { user } } = await service.auth.getUser(authHeader.replace('Bearer ', ''));
  if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // Verifikasi relasi parent → child
  const { data: child } = await service.from('users')
    .select('id, parent_id').eq('id', childId).maybeSingle();
  if (!child || child.parent_id !== user.id)
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });

  const { data: results } = await service
    .from('quiz_results')
    .select('id, score, created_at, quizzes(title, subject)')
    .eq('user_id', childId)
    .order('created_at', { ascending: false })
    .limit(30);

  return NextResponse.json({ results: results ?? [] });
}
