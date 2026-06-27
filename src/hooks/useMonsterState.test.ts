import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMonsterState } from '@/hooks/useMonsterState';

// Constants mirrored from the hook itself (kept in sync deliberately —
// if these ever drift apart it usually means the hook's thresholds changed
// without a matching test update, which is exactly the kind of silent
// off-by-one regression these tests exist to catch).
const SAFE_MIN_CM = 30;
const SAFE_MAX_CM = 70;
const DEBOUNCE_MS = 5_000;
const COOLDOWN_MS = 15_000;
const ROLLING_WINDOW_MS = 3_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useMonsterState', () => {
  it('starts in "safe" with no distance reading yet', () => {
    const { result } = renderHook(() => useMonsterState());
    expect(result.current.state).toBe('safe');
    expect(result.current.distanceCm).toBeNull();
  });

  it('stays "safe" for any reading inside the 30-70cm band', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(SAFE_MIN_CM));
    expect(result.current.state).toBe('safe');
    act(() => result.current.update(SAFE_MAX_CM));
    expect(result.current.state).toBe('safe');
  });

  it('does NOT escalate to "warning" before the debounce window elapses', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20)); // out of range, t=0
    vi.setSystemTime(DEBOUNCE_MS - 100);
    act(() => result.current.update(20)); // still within debounce window
    expect(result.current.state).toBe('safe');
  });

  it('escalates to "warning" once an out-of-range reading has persisted past the debounce window', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20)); // t=0, first out-of-range sample
    vi.setSystemTime(DEBOUNCE_MS + 100);
    act(() => result.current.update(20));
    expect(result.current.state).toBe('warning');
  });

  it('stays in "warning" — does not jump straight to "alert" — before the cooldown elapses', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20)); // t=0
    vi.setSystemTime(DEBOUNCE_MS + 100);
    act(() => result.current.update(20)); // -> warning, warningSince = DEBOUNCE_MS+100
    vi.setSystemTime(DEBOUNCE_MS + 100 + (COOLDOWN_MS - 1000));
    act(() => result.current.update(20)); // cooldown not yet elapsed
    expect(result.current.state).toBe('warning');
  });

  it('escalates to "alert" once the warning state has persisted past the cooldown window', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20)); // t=0
    vi.setSystemTime(DEBOUNCE_MS + 100);
    act(() => result.current.update(20)); // -> warning
    vi.setSystemTime(DEBOUNCE_MS + 100 + COOLDOWN_MS + 100);
    act(() => result.current.update(20)); // cooldown elapsed -> alert
    expect(result.current.state).toBe('alert');
  });

  it('recovers to "safe" immediately from "alert" the moment a reading is back in range', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20));
    vi.setSystemTime(DEBOUNCE_MS + 100);
    act(() => result.current.update(20));
    vi.setSystemTime(DEBOUNCE_MS + 100 + COOLDOWN_MS + 100);
    act(() => result.current.update(20));
    expect(result.current.state).toBe('alert');

    vi.setSystemTime(DEBOUNCE_MS + 100 + COOLDOWN_MS + 100 + ROLLING_WINDOW_MS + 100);
    act(() => result.current.update(50)); // back in range, no extra delay needed to recover
    expect(result.current.state).toBe('safe');
  });

  it('recovers to "safe" immediately from "warning" as well', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20));
    vi.setSystemTime(DEBOUNCE_MS + 100);
    act(() => result.current.update(20));
    expect(result.current.state).toBe('warning');

    vi.setSystemTime(DEBOUNCE_MS + 100 + ROLLING_WINDOW_MS + 100);
    act(() => result.current.update(50));
    expect(result.current.state).toBe('safe');
  });

  it('treats a returning-to-range-then-drifting-out-again reading as a brand new debounce window', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20)); // t=0, out of range
    vi.setSystemTime(DEBOUNCE_MS + 100); // t=5100
    act(() => result.current.update(50)); // back in range -> resets timers
    expect(result.current.state).toBe('safe');

    // Advance past the rolling window so this next sample isn't blended
    // with the in-range 50cm sample above (which would otherwise mask an
    // out-of-range reading as a falsely-safe average).
    vi.setSystemTime(DEBOUNCE_MS + 100 + ROLLING_WINDOW_MS + 100);
    act(() => result.current.update(20)); // out of range again, restarts debounce
    expect(result.current.state).toBe('safe'); // first sample of the new streak — still within debounce

    vi.setSystemTime(DEBOUNCE_MS + 100 + ROLLING_WINDOW_MS + 100 + 100); // only 100ms into the new streak
    act(() => result.current.update(20));
    expect(result.current.state).toBe('safe'); // not yet past a fresh debounce window
  });

  it('reset() clears state, distance, and all internal timers back to initial values', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(20));
    vi.setSystemTime(DEBOUNCE_MS + 100);
    act(() => result.current.update(20));
    expect(result.current.state).toBe('warning');

    act(() => result.current.reset());
    expect(result.current.state).toBe('safe');
    expect(result.current.distanceCm).toBeNull();

    // Internal timers must also be cleared, not just the visible state —
    // otherwise a reading right after reset() could escalate immediately.
    act(() => result.current.update(20));
    expect(result.current.state).toBe('safe');
  });

  it('exposes isInSafeRange consistently with the 30-70cm band', () => {
    const { result } = renderHook(() => useMonsterState());
    act(() => result.current.update(50));
    expect(result.current.isInSafeRange).toBe(true);

    // Advance past the rolling window so this reading isn't averaged
    // together with the previous in-range sample.
    vi.setSystemTime(ROLLING_WINDOW_MS + 100);
    act(() => result.current.update(20));
    expect(result.current.isInSafeRange).toBe(false);
  });
});
