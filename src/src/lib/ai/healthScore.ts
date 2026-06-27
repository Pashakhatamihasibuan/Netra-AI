// Health Score engine — ported & enhanced from main.py Python logic.
// Sub-scores 0-100; weighted average → overall health_score.

export interface HealthSubScores {
  eyeDistance: number;   // 0-100
  posture: number;       // 0-100
  blinkRate: number;     // 0-100
  screenTime: number;    // 0-100
  lighting: number;      // 0-100 (NEW — dari main.py hitung_skor)
}

export interface HealthScoreWeights {
  eyeDistance: number;
  posture: number;
  blinkRate: number;
  screenTime: number;
  lighting: number;
}

export const DEFAULT_WEIGHTS: HealthScoreWeights = {
  eyeDistance: 0.25,
  posture:     0.25,
  blinkRate:   0.20,
  screenTime:  0.20,
  lighting:    0.10,
};

export function calculateHealthScore(
  scores: HealthSubScores,
  weights: HealthScoreWeights = DEFAULT_WEIGHTS
): number {
  const total =
    scores.eyeDistance * weights.eyeDistance +
    scores.posture     * weights.posture +
    scores.blinkRate   * weights.blinkRate +
    scores.screenTime  * weights.screenTime +
    scores.lighting    * weights.lighting;

  return Math.round(total * 100) / 100;
}

// --- Sub-score helpers -----------------------------------------------

// BUG FIX (dari main.py): range aman 30-70 cm.
// Python: jarak > 140px (~terlalu dekat) → -15, jarak < 60px (~terlalu jauh) → -10.
// Versi web menggunakan cm nyata dari kalibrasi.
// Jika distanceCm null (belum kalibrasi / kamera belum jalan),
// JANGAN fallback ke 100 — kembalikan null agar caller tahu data tidak tersedia.
const SAFE_DISTANCE_MIN_CM = 30;
const SAFE_DISTANCE_MAX_CM = 70;

export function eyeDistanceToScore(distanceCm: number | null): number | null {
  // BUG FIX: null → null, bukan 100. Caller harus handle null secara eksplisit.
  if (distanceCm === null || distanceCm <= 0) return null;

  if (distanceCm >= SAFE_DISTANCE_MIN_CM && distanceCm <= SAFE_DISTANCE_MAX_CM) {
    return 100;
  }
  const deviation =
    distanceCm < SAFE_DISTANCE_MIN_CM
      ? SAFE_DISTANCE_MIN_CM - distanceCm
      : distanceCm - SAFE_DISTANCE_MAX_CM;

  const score = 100 - deviation * 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Selaras dengan main.py: blink < 3 dalam periode → lelah.
// Healthy adult: 15-20/mnt saat istirahat; layar menekan hingga 6-8/mnt.
// BUG FIX: blinkRate 0 TIDAK langsung 100 — itu artinya kamera belum
// mendeteksi apapun. Kembalikan null jika 0 agar caller bisa skip data.
export function blinkRateToScore(blinksPerMinute: number | null): number | null {
  // BUG FIX: 0 atau null → null (tidak ada data), bukan skor sempurna
  if (blinksPerMinute === null || blinksPerMinute === 0) return null;

  if (blinksPerMinute >= 15 && blinksPerMinute <= 20) return 100;
  if (blinksPerMinute < 15) {
    return Math.max(0, Math.round(100 - (15 - blinksPerMinute) * 6));
  }
  return Math.max(0, Math.round(100 - (blinksPerMinute - 20) * 3));
}

export function screenTimeToScore(continuousMinutes: number, ruleIntervalMinutes = 20): number {
  if (continuousMinutes <= 0) return 100; // sesi baru mulai → aman
  if (continuousMinutes <= ruleIntervalMinutes) return 100;
  const overage = continuousMinutes - ruleIntervalMinutes;
  return Math.max(0, Math.round(100 - overage * 5));
}

// Ported dari main.py hitung_kecerahan & status_cahaya
// DARK_THRESHOLD = 60, BRIGHT_THRESHOLD = 200 (sama dengan useLightingDetector.ts)
export function lightingToScore(lightingScore: number | null): number {
  // lightingScore sudah dihitung di useLightingDetector — gunakan langsung
  if (lightingScore === null) return 85; // unknown → penalty kecil
  return lightingScore;
}

// Konversi PostureStatus → skor numerik
// Ported dari main.py deteksi_postur: Good=0, Warning=-10, Poor=-25
export function postureToScore(posture: 'good' | 'warning' | 'poor'): number {
  switch (posture) {
    case 'good':    return 100;
    case 'warning': return 70;   // -30 dari 100 (lebih keras dari sebelumnya)
    case 'poor':    return 40;   // -60 dari 100
    default:        return 70;
  }
}

// Hitung health score final dengan penanganan null yang benar.
// Jika sub-skor tidak tersedia (null = sensor belum aktif), JANGAN pakai 100.
// Gunakan nilai default yang lebih konservatif atau skip dari perhitungan.
export function calculateHealthScoreSafe(params: {
  distanceCm: number | null;
  blinkRate: number | null;
  posture: 'good' | 'warning' | 'poor';
  lightingScore: number | null;
  screenTimeMinutes: number;
}): {
  healthScore: number;
  subScores: Required<Omit<HealthSubScores, never>>;
  hasFullData: boolean;
} {
  const eyeScore     = eyeDistanceToScore(params.distanceCm);
  const blinkScore   = blinkRateToScore(params.blinkRate);
  const postureScore = postureToScore(params.posture);
  const screenScore  = screenTimeToScore(params.screenTimeMinutes);
  const lightScore   = lightingToScore(params.lightingScore);

  // BUG FIX: Jika eyeScore atau blinkScore null (sensor tidak aktif),
  // jangan masukkan ke perhitungan dengan nilai 100.
  // Redistribusi bobot ke sub-skor yang tersedia.
  const hasEye   = eyeScore !== null;
  const hasBlink = blinkScore !== null;
  const hasFullData = hasEye && hasBlink;

  let totalWeight = DEFAULT_WEIGHTS.posture + DEFAULT_WEIGHTS.screenTime + DEFAULT_WEIGHTS.lighting;
  let total       =
    postureScore * DEFAULT_WEIGHTS.posture +
    screenScore  * DEFAULT_WEIGHTS.screenTime +
    lightScore   * DEFAULT_WEIGHTS.lighting;

  if (hasEye) {
    total       += eyeScore! * DEFAULT_WEIGHTS.eyeDistance;
    totalWeight += DEFAULT_WEIGHTS.eyeDistance;
  }
  if (hasBlink) {
    total       += blinkScore! * DEFAULT_WEIGHTS.blinkRate;
    totalWeight += DEFAULT_WEIGHTS.blinkRate;
  }

  const healthScore = Math.round((total / totalWeight) * 100) / 100;

  return {
    healthScore,
    subScores: {
      eyeDistance: eyeScore  ?? 0,
      blinkRate:   blinkScore ?? 0,
      posture:     postureScore,
      screenTime:  screenScore,
      lighting:    lightScore,
    },
    hasFullData,
  };
}
