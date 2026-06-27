import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  blinkRateToScore,
  calculateHealthScore,
  calculateHealthScoreSafe,
  eyeDistanceToScore,
  lightingToScore,
  postureToScore,
  screenTimeToScore,
} from '@/lib/ai/healthScore';

describe('DEFAULT_WEIGHTS', () => {
  it('sums to exactly 1.0 (otherwise the weighted average is silently skewed)', () => {
    const sum =
      DEFAULT_WEIGHTS.eyeDistance +
      DEFAULT_WEIGHTS.posture +
      DEFAULT_WEIGHTS.blinkRate +
      DEFAULT_WEIGHTS.screenTime +
      DEFAULT_WEIGHTS.lighting;
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('eyeDistanceToScore', () => {
  it('returns null when there is no reading (not 100 — sensor inactive must not look perfect)', () => {
    expect(eyeDistanceToScore(null)).toBeNull();
  });

  it('returns null for non-positive readings', () => {
    expect(eyeDistanceToScore(0)).toBeNull();
    expect(eyeDistanceToScore(-5)).toBeNull();
  });

  it('returns 100 anywhere inside the 30-70cm safe band, including both edges', () => {
    expect(eyeDistanceToScore(30)).toBe(100);
    expect(eyeDistanceToScore(50)).toBe(100);
    expect(eyeDistanceToScore(70)).toBe(100);
  });

  it('penalizes 4 points per cm outside the safe band, symmetric on both sides', () => {
    expect(eyeDistanceToScore(29)).toBe(96); // 1cm too close
    expect(eyeDistanceToScore(71)).toBe(96); // 1cm too far
    expect(eyeDistanceToScore(20)).toBe(60); // 10cm too close
    expect(eyeDistanceToScore(80)).toBe(60); // 10cm too far
  });

  it('clamps at 0 instead of going negative for extreme distances', () => {
    expect(eyeDistanceToScore(1)).toBe(0);
    expect(eyeDistanceToScore(500)).toBe(0);
  });
});

describe('blinkRateToScore', () => {
  it('returns null for null or zero (zero means "no data yet", not "perfect")', () => {
    expect(blinkRateToScore(null)).toBeNull();
    expect(blinkRateToScore(0)).toBeNull();
  });

  it('returns 100 inside the healthy 15-20 blinks/min band, including both edges', () => {
    expect(blinkRateToScore(15)).toBe(100);
    expect(blinkRateToScore(18)).toBe(100);
    expect(blinkRateToScore(20)).toBe(100);
  });

  it('penalizes under-blinking at 6 points per blink below 15', () => {
    expect(blinkRateToScore(10)).toBe(70); // 5 below -> -30
    expect(blinkRateToScore(1)).toBe(16);  // 14 below -> -84
  });

  it('penalizes over-blinking at 3 points per blink above 20 (gentler than under-blinking)', () => {
    expect(blinkRateToScore(25)).toBe(85); // 5 above -> -15
  });

  it('never goes below 0 for pathological blink rates', () => {
    expect(blinkRateToScore(60)).toBe(0);
  });
});

describe('screenTimeToScore', () => {
  it('is a perfect 100 for a fresh session (zero or negative elapsed minutes)', () => {
    expect(screenTimeToScore(0)).toBe(100);
    expect(screenTimeToScore(-5)).toBe(100);
  });

  it('stays at 100 up to and including the 20-minute rule interval', () => {
    expect(screenTimeToScore(10)).toBe(100);
    expect(screenTimeToScore(20)).toBe(100);
  });

  it('drops 5 points per minute of overage past the interval', () => {
    expect(screenTimeToScore(21)).toBe(95);
    expect(screenTimeToScore(25)).toBe(75);
  });

  it('respects a custom rule interval', () => {
    expect(screenTimeToScore(25, 30)).toBe(100);
    expect(screenTimeToScore(35, 30)).toBe(75);
  });

  it('clamps at 0 for very long continuous sessions', () => {
    expect(screenTimeToScore(100)).toBe(0);
  });
});

describe('lightingToScore', () => {
  it('applies a small penalty (85) when lighting is unknown, rather than passing through null', () => {
    expect(lightingToScore(null)).toBe(85);
  });

  it('passes a known lighting score straight through', () => {
    expect(lightingToScore(50)).toBe(50);
    expect(lightingToScore(100)).toBe(100);
  });
});

describe('postureToScore', () => {
  it('maps good/warning/poor to 100/70/40', () => {
    expect(postureToScore('good')).toBe(100);
    expect(postureToScore('warning')).toBe(70);
    expect(postureToScore('poor')).toBe(40);
  });
});

describe('calculateHealthScore', () => {
  it('returns exactly 100 when every sub-score is a perfect 100', () => {
    expect(
      calculateHealthScore({
        eyeDistance: 100,
        posture: 100,
        blinkRate: 100,
        screenTime: 100,
        lighting: 100,
      })
    ).toBe(100);
  });

  it('computes the documented weighted average for mixed sub-scores', () => {
    const score = calculateHealthScore({
      eyeDistance: 80,
      posture: 60,
      blinkRate: 100,
      screenTime: 90,
      lighting: 70,
    });
    // 80*.25 + 60*.25 + 100*.2 + 90*.2 + 70*.1 = 20+15+20+18+7 = 80
    expect(score).toBe(80);
  });
});

describe('calculateHealthScoreSafe', () => {
  it('blends all five sub-scores when every sensor has data', () => {
    const { healthScore, subScores, hasFullData } = calculateHealthScoreSafe({
      distanceCm: 50,
      blinkRate: 18,
      posture: 'good',
      lightingScore: 100,
      screenTimeMinutes: 5,
    });
    expect(hasFullData).toBe(true);
    expect(subScores.eyeDistance).toBe(100);
    expect(subScores.blinkRate).toBe(100);
    expect(healthScore).toBe(100);
  });

  it('redistributes weight away from eye distance when the camera has no distance reading yet', () => {
    const result = calculateHealthScoreSafe({
      distanceCm: null,
      blinkRate: 18,
      posture: 'good',
      lightingScore: 100,
      screenTimeMinutes: 5,
    });
    expect(result.hasFullData).toBe(false);
    // Remaining weight: posture .25 + blink .20 + screenTime .20 + lighting .10 = .75,
    // all sub-scores 100 -> still 100 once renormalized.
    expect(result.healthScore).toBe(100);
  });

  it('redistributes weight away from blink rate when blink rate is unavailable (0)', () => {
    const result = calculateHealthScoreSafe({
      distanceCm: 50,
      blinkRate: 0,
      posture: 'good',
      lightingScore: 100,
      screenTimeMinutes: 5,
    });
    expect(result.hasFullData).toBe(false);
    expect(result.subScores.blinkRate).toBe(0); // reported as 0 for display, but excluded from the average
    expect(result.healthScore).toBe(100);
  });

  it('falls back to posture + screenTime + lighting only when neither eye nor blink data exists', () => {
    const result = calculateHealthScoreSafe({
      distanceCm: null,
      blinkRate: null,
      posture: 'poor',
      lightingScore: 100,
      screenTimeMinutes: 0,
    });
    // posture(40)*.25 + screenTime(100)*.20 + lighting(100)*.10, renormalized over weight .55
    const expected = Math.round(((40 * 0.25 + 100 * 0.2 + 100 * 0.1) / 0.55) * 100) / 100;
    expect(result.healthScore).toBe(expected);
    expect(result.hasFullData).toBe(false);
  });
});
