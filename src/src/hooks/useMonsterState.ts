'use client';

import { useCallback, useRef, useState } from 'react';
import type { MonsterState } from '@/types';

const SAFE_MIN_CM = 30;
const SAFE_MAX_CM = 70;

// Matches the state diagram: a sustained out-of-range reading must hold for
// DEBOUNCE_MS before we even call it "Warning" (filters out a kid leaning
// over for a pencil), and Warning must hold for another COOLDOWN_MS before
// escalating to "Alert". Any in-range reading resets straight back to Safe —
// recovery is immediate, only escalation is gated.
const DEBOUNCE_MS = 5_000;
const COOLDOWN_MS = 15_000;

// Smooths frame-to-frame jitter from the distance estimator before it's
// compared against the safe band at all.
const ROLLING_WINDOW_MS = 3_000;

interface MonsterStateResult {
  state: MonsterState;
  distanceCm: number | null;
  isInSafeRange: boolean;
  update: (distanceCm: number) => void;
  reset: () => void;
}

export function useMonsterState(): MonsterStateResult {
  const [state, setState] = useState<MonsterState>('safe');
  const [distanceCm, setDistanceCm] = useState<number | null>(null);

  const samplesRef = useRef<Array<{ t: number; d: number }>>([]);
  const outOfRangeSinceRef = useRef<number | null>(null);
  const warningSinceRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    samplesRef.current = [];
    outOfRangeSinceRef.current = null;
    warningSinceRef.current = null;
    setState('safe');
    setDistanceCm(null);
  }, []);

  const update = useCallback((rawDistanceCm: number) => {
    const now = Date.now();

    // Rolling average over the debounce window.
    const samples = samplesRef.current;
    samples.push({ t: now, d: rawDistanceCm });
    while (samples.length && now - samples[0].t > ROLLING_WINDOW_MS) {
      samples.shift();
    }
    const avgDistance = samples.reduce((sum, s) => sum + s.d, 0) / samples.length;
    setDistanceCm(Math.round(avgDistance * 10) / 10);

    const inRange = avgDistance >= SAFE_MIN_CM && avgDistance <= SAFE_MAX_CM;

    if (inRange) {
      // Recovery is immediate from any state.
      outOfRangeSinceRef.current = null;
      warningSinceRef.current = null;
      setState('safe');
      return;
    }

    if (outOfRangeSinceRef.current === null) {
      outOfRangeSinceRef.current = now;
    }
    const outOfRangeDuration = now - outOfRangeSinceRef.current;

    if (outOfRangeDuration < DEBOUNCE_MS) {
      // Still inside the debounce window — don't escalate yet.
      return;
    }

    if (warningSinceRef.current === null) {
      warningSinceRef.current = now;
      setState('warning');
      return;
    }

    const warningDuration = now - warningSinceRef.current;
    if (warningDuration >= COOLDOWN_MS) {
      setState('alert');
    } else {
      setState('warning');
    }
  }, []);

  return {
    state,
    distanceCm,
    isInSafeRange: distanceCm !== null && distanceCm >= SAFE_MIN_CM && distanceCm <= SAFE_MAX_CM,
    update,
    reset,
  };
}
