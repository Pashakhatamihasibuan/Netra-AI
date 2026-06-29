import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

// GET /api/health/score?studentId=<uuid>  (studentId optional — defaults to authed user)
// Returns the most-recent health_record's aggregated scores.
export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');

  // If studentId is provided, only allow parents/teachers (service role query)
  const client = studentId && studentId !== authData.user.id
    ? createServiceRoleClient()
    : supabase;

  const targetId = studentId ?? authData.user.id;

  const { data, error } = await client
    .from('health_records')
    .select('health_score, eye_distance_score, posture_score, blink_score, screen_time_minutes')
    .eq('user_id', targetId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found — not an error, just empty
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ score: null, distance: null, posture: null, blink: null, screen_time_minutes: null });
  }

  return NextResponse.json({
    score:               data.health_score,
    distance:            data.eye_distance_score,
    posture:             data.posture_score,
    blink:               data.blink_score,
    screen_time_minutes: data.screen_time_minutes,
  });
}
