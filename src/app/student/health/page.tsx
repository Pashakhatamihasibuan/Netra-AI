'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { BadgeList } from '@/components/health/BadgeList';
import { HealthScoreCard } from '@/components/health/HealthScoreCard';
import { useT } from '@/i18n/useT';

interface HealthSession {
  id: string; started_at: string; ended_at: string | null;
  health_score: number | null; avg_distance_score: number | null;
  avg_posture_score: number | null; avg_blink_score: number | null;
  avg_lighting_score: number | null;
}

function scoreCell(v: number | null) {
  if (v === null) return <span className="text-ink/25">—</span>;
  const color = v >= 80 ? 'text-teal-600' : v >= 60 ? 'text-amber-600' : 'text-red-500';
  return <span className={`font-semibold ${color}`}>{v}</span>;
}

function durationStr(start: string, end: string | null) {
  if (!end) return '—';
  const ms  = new Date(end).getTime() - new Date(start).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}j ${min % 60}m`;
}

function avg(sessions: HealthSession[], key: keyof HealthSession) {
  const vals = sessions.map((s) => s[key]).filter((v) => v !== null) as number[];
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default function HealthHistoryPage() {
  const { t, lang } = useT();
  const [sessions, setSessions] = useState<HealthSession[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/health/sessions?limit=30')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  const dateLocale = lang === 'en' ? 'en-US' : 'id-ID';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-xl text-ink">{t('health', 'page_title')}</h1>
        <p className="text-sm text-ink/50 mt-1">{t('health', 'page_subtitle')}</p>
      </div>

      <HealthScoreCard />
      <BadgeList />

      <Card>
        <CardTitle>{t('health', 'history_title')}</CardTitle>
        {loading ? (
          <p className="text-sm text-ink/40 mt-3">{t('common', 'loading')}</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-ink/40 mt-3">{t('health', 'no_sessions_msg')}</p>
        ) : (
          <>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink/40 border-b border-teal-50">
                    <th className="text-left py-2 pr-3">{t('health', 'col_date')}</th>
                    <th className="text-left py-2 pr-3">{t('health', 'col_duration')}</th>
                    <th className="text-center py-2 pr-3">{t('health', 'col_health')}</th>
                    <th className="text-center py-2 pr-3">{t('health', 'col_distance')}</th>
                    <th className="text-center py-2 pr-3">{t('health', 'col_posture')}</th>
                    <th className="text-center py-2 pr-3">{t('health', 'col_blink')}</th>
                    <th className="text-center py-2">{t('health', 'col_lighting')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-teal-50/60 last:border-0">
                      <td className="py-2 pr-3 text-xs text-ink/60 whitespace-nowrap">
                        {new Date(s.started_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                        {' '}
                        {new Date(s.started_at).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 pr-3 text-xs text-ink/60">{durationStr(s.started_at, s.ended_at)}</td>
                      <td className="py-2 pr-3 text-center">{scoreCell(s.health_score)}</td>
                      <td className="py-2 pr-3 text-center">{scoreCell(s.avg_distance_score)}</td>
                      <td className="py-2 pr-3 text-center">{scoreCell(s.avg_posture_score)}</td>
                      <td className="py-2 pr-3 text-center">{scoreCell(s.avg_blink_score)}</td>
                      <td className="py-2 text-center">{scoreCell(s.avg_lighting_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-teal-50">
              <p className="text-xs text-ink/40 mb-2">{t('health', 'avg_title')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: t('health', 'avg_health'),   key: 'health_score' as const },
                  { label: t('health', 'avg_distance'),  key: 'avg_distance_score' as const },
                  { label: t('health', 'avg_posture'),   key: 'avg_posture_score' as const },
                  { label: t('health', 'avg_blink'),     key: 'avg_blink_score' as const },
                ].map((item) => {
                  const val = avg(sessions, item.key);
                  const color = val === null ? 'text-ink/30' : val >= 80 ? 'text-teal-600' : val >= 60 ? 'text-amber-600' : 'text-red-500';
                  return (
                    <div key={item.key} className="rounded-xl2 bg-cream border border-teal-50 px-3 py-2 text-center">
                      <p className={`text-xl font-bold ${color}`}>{val ?? '—'}</p>
                      <p className="text-[10px] text-ink/40 mt-0.5">{item.label}</p>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-ink/30 mt-2">{t('health', 'avg_note')}</p>
            </div>

            <div className="flex gap-3 flex-wrap mt-3 text-[10px] text-ink/40">
              <span>{t('health', 'legend_good')}</span>
              <span>{t('health', 'legend_warn')}</span>
              <span>{t('health', 'legend_bad')}</span>
              <span>{t('health', 'legend_inactive')}</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
