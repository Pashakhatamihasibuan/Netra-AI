'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const RULE_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const BREAK_DURATION_MS = 20 * 1000;     // 20 seconds

interface UseScreenTimeResult {
  totalMinutes: number;
  minutesSinceLastBreak: number;
  isBreakActive: boolean;
  isBreakDue: boolean;
  startBreakNow: () => void;
}

// Implements the 20-20-20 rule: every 20 minutes, prompt a 20-second look-away
// break. Tracks total session duration alongside it for the health record.
export function useScreenTime(sessionActive: boolean): UseScreenTimeResult {
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [minutesSinceLastBreak, setMinutesSinceLastBreak] = useState(0);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [isBreakDue, setIsBreakDue] = useState(false);

  const lastBreakAtRef = useRef(Date.now());
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (!sessionActive) return;

    const tick = setInterval(() => {
      const now = Date.now();
      setTotalMinutes((now - startedAtRef.current) / 60_000);

      const sinceBreak = now - lastBreakAtRef.current;
      setMinutesSinceLastBreak(sinceBreak / 60_000);
      setIsBreakDue(sinceBreak >= RULE_INTERVAL_MS && !isBreakActive);
    }, 1_000);

    return () => clearInterval(tick);
  }, [sessionActive, isBreakActive]);

  const startBreakNow = useCallback(() => {
    setIsBreakActive(true);
    setIsBreakDue(false);
    setTimeout(() => {
      setIsBreakActive(false);
      lastBreakAtRef.current = Date.now();
    }, BREAK_DURATION_MS);
  }, []);

  return { totalMinutes, minutesSinceLastBreak, isBreakActive, isBreakDue, startBreakNow };
}
