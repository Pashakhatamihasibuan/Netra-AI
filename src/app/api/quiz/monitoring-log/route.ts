// POST { quizId, attemptId?, questionIndex, samples: [...], answeredAt }
// Dipanggil QuizPlayer setiap kali siswa pindah soal (goNext/submit).
// Menyimpan 1 baris per soal dengan agregat CV + raw samples.

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Sample {
  distanceCm: number | null;
  posture: string | null;
  lighting: string | null;
  blinkRate: number | null;
  hasWarning: boolean;
  warningReason: string | null;
}

interface Body {
  quizId: string;
  attemptId?: string | null;
  questionIndex: number;
  answeredAt: string;
  samples: Sample[];
}

function dominant<T extends string>(arr: (T | null)[]): T | null {
  const counts: Record<string, number> = {};
  for (const v of arr) if (v) counts[v] = (counts[v] ?? 0) + 1;
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0] as T;
}

export async function POST(request: Request) {
  const body: Body = await request.json().catch(() => ({} as Body));
  const userClient = createServerSupabaseClient();
  const { data: authData } = await userClient.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  if (!body.quizId || body.questionIndex == null || !Array.isArray(body.samples)) {
    return NextResponse.json({ error: 'quizId, questionIndex, samples wajib.' }, { status: 400 });
  }

  const samples = body.samples.slice(0, 120); // max 2 menit per soal
  const distances = samples.map(s => s.distanceCm).filter((d): d is number => d != null);
  const warnings = samples.filter(s => s.hasWarning);
  const warningReasons = [...new Set(warnings.map(s => s.warningReason).filter(Boolean))] as string[];

  const row = {
    quiz_id:          body.quizId,
    attempt_id:       body.attemptId ?? null,
    student_id:       authData.user.id,
    question_index:   body.questionIndex,
    answered_at:      body.answeredAt,
    avg_distance_cm:  distances.length ? Math.round(distances.reduce((a,b)=>a+b,0)/distances.length*10)/10 : null,
    min_distance_cm:  distances.length ? Math.min(...distances) : null,
    max_distance_cm:  distances.length ? Math.max(...distances) : null,
    dominant_posture: dominant(samples.map(s => s.posture)),
    lighting:         dominant(samples.map(s => s.lighting)),
    avg_blink_rate:   samples.filter(s=>s.blinkRate!=null).length
                        ? Math.round(samples.reduce((a,s)=>a+(s.blinkRate??0),0)/samples.length*10)/10
                        : null,
    has_warning:      warnings.length > 0,
    warning_reasons:  warningReasons,
    warning_count:    warnings.length,
    total_seconds:    samples.length,
    raw_samples:      samples,
  };

  const { error } = await userClient.from('quiz_question_monitoring').insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
