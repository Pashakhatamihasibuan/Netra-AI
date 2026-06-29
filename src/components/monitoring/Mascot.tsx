'use client';

import { cn } from '@/lib/utils';
import type { MonsterState } from '@/types';
import { useT } from '@/i18n/useT';

interface MascotProps {
  state: MonsterState;
  message?: string;
}

// Deliberately not a "scary monster" — see the design discussion this came
// from. A worried, blinking creature that visibly relaxes once distance is
// corrected reinforces the habit better than a threatening one does, and
// won't spook a child mid-quiz.
const STATE_CLASSES: Record<MonsterState, { bodyClass: string; cheekClass: string }> = {
  safe:    { bodyClass: 'fill-teal-200',     cheekClass: 'fill-teal-600' },
  warning: { bodyClass: 'fill-amber-200',    cheekClass: 'fill-amber-600' },
  alert:   { bodyClass: 'fill-alertred-200', cheekClass: 'fill-alertred-600' },
};

export function Mascot({ state, message }: MascotProps) {
  const { t } = useT();
  const copy = STATE_CLASSES[state];
  const isAlert = state === 'alert';
  const isWarning = state === 'warning';

  // Eyebrow angle: relaxed/flat when safe, slightly raised+worried beyond that.
  const browTiltLeft = state === 'safe' ? 0 : -8;
  const browTiltRight = state === 'safe' ? 0 : 8;

  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 120 120"
        width="84"
        height="84"
        role="img"
        aria-label={`${t('monitoring', 'mascot_aria').replace('{state}', state)}`}
        className={cn('mascot-transition', isAlert && 'mascot-bounce')}
      >
        <circle cx="60" cy="64" r="44" className={copy.bodyClass} />
        <circle cx="38" cy="74" r="7" className={copy.cheekClass} opacity="0.5" />
        <circle cx="82" cy="74" r="7" className={copy.cheekClass} opacity="0.5" />

        {/* Eyebrows */}
        <line
          x1="34" y1={isWarning || isAlert ? 44 : 48} x2="50" y2={isWarning || isAlert ? 38 : 48}
          stroke="#2C2C2A" strokeWidth="3" strokeLinecap="round"
          transform={`rotate(${browTiltLeft} 42 44)`}
        />
        <line
          x1="70" y1={isWarning || isAlert ? 38 : 48} x2="86" y2={isWarning || isAlert ? 44 : 48}
          stroke="#2C2C2A" strokeWidth="3" strokeLinecap="round"
          transform={`rotate(${browTiltRight} 78 44)`}
        />

        {/* Eyes */}
        <circle cx="45" cy="58" r={isAlert ? 8 : 6} fill="white" />
        <circle cx="75" cy="58" r={isAlert ? 8 : 6} fill="white" />
        <circle cx="45" cy="58" r="3" fill="#2C2C2A" />
        <circle cx="75" cy="58" r="3" fill="#2C2C2A" />

        {/* Mouth */}
        {state === 'safe' && (
          <path d="M46 80 Q60 90 74 80" stroke="#2C2C2A" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        {state === 'warning' && (
          <line x1="48" y1="82" x2="72" y2="82" stroke="#2C2C2A" strokeWidth="3" strokeLinecap="round" />
        )}
        {state === 'alert' && (
          <path d="M46 86 Q60 76 74 86" stroke="#2C2C2A" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
      </svg>

      <div className="rounded-xl2 bg-white border border-teal-50 px-4 py-2 text-sm text-ink shadow-sm">
        {message ?? (state === 'safe' ? t('monitoring', 'mascot_safe') : state === 'warning' ? t('monitoring', 'mascot_warning') : t('monitoring', 'mascot_alert'))}
      </div>
    </div>
  );
}
