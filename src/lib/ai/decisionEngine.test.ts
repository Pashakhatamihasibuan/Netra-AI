import { describe, expect, it } from 'vitest';
import { decide } from '@/lib/ai/decisionEngine';

const base = {
  monsterState: 'safe' as const,
  posture: 'good' as const,
  lighting: 'normal' as const,
  minutesSinceLastBreak: 0,
};

describe('decide', () => {
  it('recommends increase_lighting whenever the room is dark, regardless of everything else', () => {
    const result = decide({
      ...base,
      lighting: 'dark',
      monsterState: 'alert',
      posture: 'poor',
      minutesSinceLastBreak: 999,
    });
    expect(result.recommendation).toBe('increase_lighting');
  });

  it('recommends take_a_break when the monster state is alert (lighting not dark)', () => {
    const result = decide({ ...base, monsterState: 'alert' });
    expect(result.recommendation).toBe('take_a_break');
  });

  it('recommends take_a_break once 20 minutes since the last break have elapsed', () => {
    expect(decide({ ...base, minutesSinceLastBreak: 20 }).recommendation).toBe('take_a_break');
    expect(decide({ ...base, minutesSinceLastBreak: 25 }).recommendation).toBe('take_a_break');
  });

  it('does NOT recommend a break at 19 minutes — the 20-minute threshold is exclusive on the low side', () => {
    expect(decide({ ...base, minutesSinceLastBreak: 19 }).recommendation).toBe('continue_learning');
  });

  it('recommends improve_posture when posture is poor and nothing more urgent applies', () => {
    const result = decide({ ...base, posture: 'poor' });
    expect(result.recommendation).toBe('improve_posture');
  });

  it('does not flag improve_posture for "warning" posture — only "poor" triggers it', () => {
    const result = decide({ ...base, posture: 'warning' });
    expect(result.recommendation).toBe('continue_learning');
  });

  it('falls back to continue_learning when everything is fine', () => {
    expect(decide(base).recommendation).toBe('continue_learning');
  });

  it('prioritizes take_a_break (alert) over poor posture', () => {
    const result = decide({ ...base, monsterState: 'alert', posture: 'poor' });
    expect(result.recommendation).toBe('take_a_break');
  });

  it('every branch returns a non-empty Indonesian message', () => {
    const cases = [
      { ...base, lighting: 'dark' as const },
      { ...base, monsterState: 'alert' as const },
      { ...base, minutesSinceLastBreak: 20 },
      { ...base, posture: 'poor' as const },
      base,
    ];
    for (const input of cases) {
      expect(decide(input).message.length).toBeGreaterThan(0);
    }
  });
});
