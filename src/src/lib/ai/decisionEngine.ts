import type { LightingStatus, MonsterState, PostureStatus, Recommendation } from '@/types';

export interface DecisionInput {
  monsterState: MonsterState;
  posture: PostureStatus;
  lighting: LightingStatus;
  minutesSinceLastBreak: number;
}

export interface Decision {
  recommendation: Recommendation;
  message: string;
}

const BREAK_INTERVAL_MINUTES = 20; // the "20" in 20-20-20

// Priority order matters: a dark room makes every other reading less
// reliable (and is the fastest fix), so it's checked first. Eye distance
// alert and overdue breaks are treated as equally urgent since both are
// about preventing eye strain; posture is corrected before nudging the
// student to "just continue."
export function decide(input: DecisionInput): Decision {
  if (input.lighting === 'dark') {
    return {
      recommendation: 'increase_lighting',
      message: 'Ruangan terlalu gelap. Nyalakan lampu tambahan sebelum lanjut belajar.',
    };
  }

  if (input.monsterState === 'alert' || input.minutesSinceLastBreak >= BREAK_INTERVAL_MINUTES) {
    return {
      recommendation: 'take_a_break',
      message: 'Waktunya istirahat 20 detik — lihat objek sejauh 20 kaki dulu.',
    };
  }

  if (input.posture === 'poor') {
    return {
      recommendation: 'improve_posture',
      message: 'Coba duduk lebih tegak dan luruskan posisi leher.',
    };
  }

  return {
    recommendation: 'continue_learning',
    message: 'Kondisi belajar baik, lanjutkan!',
  };
}
