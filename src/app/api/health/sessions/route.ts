import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// GET /api/health/sessions?limit=30
// Returns the last N health_records for the authenticated student,
// mapped to the shape the health history page expects.

interface HealthRecord {
  id: string;
  created_at: string;
  session_started_at: string | null;
  screen_time_minutes: number | null;
  health_score: number | null;
  eye_distance_score: number | null;
  posture_score: number | null;
  blink_score: number | null;
  lighting_score: number | null;
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100);

  const { data, error } = await supabase
    .from('health_records')
    .select(
      'id, created_at, session_started_at, screen_time_minutes, health_score, ' +
      'eye_distance_score, posture_score, blink_score, lighting_score'
    )
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to the shape HealthHistoryPage expects:
  // { id, started_at, ended_at, health_score, avg_distance_score,
  //   avg_posture_score, avg_blink_score, avg_lighting_score }
  const sessions = ((data ?? []) as unknown as HealthRecord[]).map((r) => ({
    id:                 r.id,
    started_at:         r.session_started_at ?? r.created_at,
    ended_at:           r.created_at,          // health_records are saved at session end
    health_score:       r.health_score,
    avg_distance_score: r.eye_distance_score,
    avg_posture_score:  r.posture_score,
    avg_blink_score:    r.blink_score,
    avg_lighting_score: r.lighting_score,
    screen_time_minutes: r.screen_time_minutes,
  }));

  return NextResponse.json({ sessions });
}
