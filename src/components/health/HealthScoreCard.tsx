'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { useT } from '@/i18n/useT';

interface HealthData { score: number | null; distance: number | null; posture: number | null; blink: number | null; screen_time_minutes: number | null }

export function HealthScoreCard({ studentId }: { studentId?: string }) {
  const { t } = useT();
  const [data, setData]       = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = studentId ? `/api/health/score?studentId=${studentId}` : '/api/health/score';
    fetch(url).then((r) => r.json()).then((d) => setData(d)).finally(() => setLoading(false));
  }, [studentId]);

  function scoreColor(v: number | null) {
    if (v === null) return 'text-ink/30';
    if (v >= 80)   return 'text-teal-600';
    if (v >= 60)   return 'text-amber-600';
    return 'text-red-500';
  }

  function fmt(v: number | null) { return v !== null ? `${v}` : '—'; }

  return (
    <Card>
      <CardTitle>{t('health', 'score_label')}</CardTitle>
      {loading ? (
        <p className="text-sm text-ink/40 mt-2">{t('health', 'loading')}</p>
      ) : !data || data.score === null ? (
        <p className="text-sm text-ink/40 mt-2">{t('health', 'no_sessions')}</p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-bold tabular-nums ${scoreColor(data.score)}`}>{fmt(data.score)}</span>
            <span className="text-sm text-ink/30 mb-2">/ 100</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <MetricRow label={t('health', 'row_distance')} value={fmt(data.distance)} scoreColor={scoreColor(data.distance)} />
            <MetricRow label={t('health', 'row_posture')} value={fmt(data.posture)} scoreColor={scoreColor(data.posture)} />
            <MetricRow label={t('health', 'row_blink')} value={fmt(data.blink)} scoreColor={scoreColor(data.blink)} />
            <MetricRow label={t('health', 'row_screentime')} value={data.screen_time_minutes !== null ? `${data.screen_time_minutes} min` : '—'} scoreColor="text-ink/60" />
          </div>
        </div>
      )}
    </Card>
  );
}

function MetricRow({ label, value, scoreColor }: { label: string; value: string; scoreColor: string }) {
  return (
    <div className="rounded-xl2 bg-cream border border-teal-50 px-3 py-2">
      <p className="text-ink/40">{label}</p>
      <p className={`font-bold text-base mt-0.5 ${scoreColor}`}>{value}</p>
    </div>
  );
}
