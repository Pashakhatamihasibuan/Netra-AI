import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/serviceRole';

// Badge evaluation rules — called after every health record insert.
// Runs server-side using the service role so it can read full history
// and insert user_badges without requiring a client insert policy
// (which would let students fabricate their own badges).
//
// POST /api/badges/award  { userId: string }

const BADGE_CODE = {
  EYE_GUARDIAN:           'eye_guardian',
  HEALTHY_LEARNER:        'healthy_learner',
  POSTURE_MASTER:         'posture_master',
  DIGITAL_HEALTH_CHAMP:   'digital_health_champion',
} as const;

type BadgeCode = typeof BADGE_CODE[keyof typeof BADGE_CODE];

interface HealthRow {
  health_score: number;
  eye_distance_score: number;
  posture_score: number;
  created_at: string;
}

async function evaluateBadges(userId: string): Promise<BadgeCode[]> {
  const service = createServiceRoleClient();

  const { data: records } = await service
    .from('health_records')
    .select('health_score, eye_distance_score, posture_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const rows: HealthRow[] = records ?? [];
  const earned: BadgeCode[] = [];

  // Eye Guardian: last session had eye_distance_score >= 95 the whole time
  const latest = rows[0];
  if (latest && latest.eye_distance_score >= 95) {
    earned.push(BADGE_CODE.EYE_GUARDIAN);
  }

  // Healthy Learner: last 5 sessions all have health_score >= 85
  if (rows.length >= 5 && rows.slice(0, 5).every((r) => r.health_score >= 85)) {
    earned.push(BADGE_CODE.HEALTHY_LEARNER);
  }

  // Posture Master: last session had posture_score >= 95
  if (latest && latest.posture_score >= 95) {
    earned.push(BADGE_CODE.POSTURE_MASTER);
  }

  // Digital Health Champion: already holds Eye Guardian + Healthy Learner + Posture Master
  const { data: existingBadges } = await service
    .from('user_badges')
    .select('badges(code)')
    .eq('user_id', userId);

  const existingCodes = new Set(
    (existingBadges ?? []).map((b: any) => b.badges?.code)
  );

  const willHave = new Set([...existingCodes, ...earned]);
  if (
    willHave.has(BADGE_CODE.EYE_GUARDIAN) &&
    willHave.has(BADGE_CODE.HEALTHY_LEARNER) &&
    willHave.has(BADGE_CODE.POSTURE_MASTER)
  ) {
    earned.push(BADGE_CODE.DIGITAL_HEALTH_CHAMP);
  }

  return earned;
}

export async function POST(request: Request) {
  const userClient = createServerSupabaseClient();
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const body: { userId: string } = await request.json();
  // Only the user themselves (or a server-to-server call) may trigger evaluation
  if (body.userId !== authData.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const service = createServiceRoleClient();

  // Fetch badge UUIDs for the codes we evaluate
  const { data: badgeCatalog } = await service
    .from('badges')
    .select('id, code');

  const codeToId = new Map((badgeCatalog ?? []).map((b: any) => [b.code, b.id]));
  const earned = await evaluateBadges(body.userId);

  const inserts = earned
    .map((code) => ({ user_id: body.userId, badge_id: codeToId.get(code) }))
    .filter((r) => r.badge_id != null);

  if (inserts.length > 0) {
    // upsert so duplicate awards don't throw (unique constraint on user_id + badge_id)
    await service.from('user_badges').upsert(inserts, { onConflict: 'user_id,badge_id' });
  }

  return NextResponse.json({ awarded: earned });
}
