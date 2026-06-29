import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

// GET /api/health/badges?studentId=<uuid>  (studentId optional)
// Returns the user_badges joined with badge metadata for display.
export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  const client = studentId && studentId !== authData.user.id
    ? createServiceRoleClient()
    : supabase;

  const targetId = studentId ?? authData.user.id;

  const { data, error } = await client
    .from('user_badges')
    .select('id, earned_at, badges(code, label, icon)')
    .eq('user_id', targetId)
    .order('earned_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const badges = (data ?? []).map((row: any) => ({
    id:          row.id,
    badge_key:   row.badges?.code   ?? '',
    badge_label: row.badges?.label  ?? row.badges?.code ?? '',
    icon:        row.badges?.icon   ?? null,
    earned_at:   row.earned_at,
  }));

  return NextResponse.json({ badges });
}
