'use client';

// Komponen bersama: detail monitoring per soal — dipakai oleh Guru & Orang Tua

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/useT';

export interface QuestionMonitorRow {
  question_index: number;
  answered_at: string;
  avg_distance_cm: number | null;
  min_distance_cm: number | null;
  max_distance_cm: number | null;
  dominant_posture: string | null;
  lighting: string | null;
  avg_blink_rate: number | null;
  has_warning: boolean;
  warning_reasons: string[] | null;
  warning_count: number;
  total_seconds: number;
}

function distTone(cm: number | null): 'safe' | 'warning' | 'alert' | 'neutral' {
  if (cm == null) return 'neutral';
  if (cm < 30) return 'alert';
  if (cm > 70) return 'warning';
  return 'safe';
}

function QuestionCard({ row }: { row: QuestionMonitorRow }) {
  const [open, setOpen] = useState(false);
  const { t, lang } = useT();
  const bg = row.has_warning ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100';

  const POSTURE_LABEL: Record<string, string> = {
    good:    t('quiz_monitor', 'posture_good'),
    forward: t('quiz_monitor', 'posture_forward'),
    back:    t('quiz_monitor', 'posture_back'),
    unknown: t('quiz_monitor', 'posture_unknown'),
  };
  const LIGHTING_LABEL: Record<string, string> = {
    good:    t('quiz_monitor', 'lighting_good'),
    dim:     t('quiz_monitor', 'lighting_dim'),
    bright:  t('quiz_monitor', 'lighting_bright'),
    unknown: t('quiz_monitor', 'lighting_unknown'),
  };
  const REASON_LABEL: Record<string, string> = {
    posture:   t('quiz_monitor', 'reason_posture'),
    too_close: t('quiz_monitor', 'reason_too_close'),
    too_far:   t('quiz_monitor', 'reason_too_far'),
  };

  const distAvgBadge = row.avg_distance_cm != null
    ? t('quiz_monitor', 'dist_avg_badge').replace('{cm}', String(row.avg_distance_cm))
    : t('quiz_monitor', 'dist_none');

  const detailRows = [
    { label: t('quiz_monitor', 'detail_dist_avg'), value: row.avg_distance_cm != null ? `${row.avg_distance_cm} cm` : '—', tone: distTone(row.avg_distance_cm) },
    { label: t('quiz_monitor', 'detail_dist_min'), value: row.min_distance_cm != null ? `${row.min_distance_cm} cm` : '—', tone: distTone(row.min_distance_cm) },
    { label: t('quiz_monitor', 'detail_dist_max'), value: row.max_distance_cm != null ? `${row.max_distance_cm} cm` : '—', tone: distTone(row.max_distance_cm) },
    { label: t('quiz_monitor', 'detail_duration'), value: t('quiz_monitor', 'detail_seconds').replace('{n}', String(row.total_seconds)), tone: 'neutral' as const },
  ];

  return (
    <div className={`rounded-2xl border ${bg} overflow-hidden`}>
      {/* Summary row — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] transition-colors"
      >
        {/* Question number */}
        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${row.has_warning ? 'bg-amber-200 text-amber-900' : 'bg-[#E8F5EE] text-[#1B8A5A]'}`}>
          {row.question_index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0D2B1E]">
            {t('quiz_monitor', 'question')} {row.question_index + 1}
            {row.has_warning && (
              <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                {t('quiz_monitor', 'sec_warning').replace('{n}', String(row.warning_count))}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Badge tone={distTone(row.avg_distance_cm)}>
              {distAvgBadge}
            </Badge>
            <Badge tone={row.dominant_posture === 'good' ? 'safe' : row.dominant_posture ? 'warning' : 'neutral'}>
              {POSTURE_LABEL[row.dominant_posture ?? 'unknown']}
            </Badge>
            {row.lighting && row.lighting !== 'good' && (
              <Badge tone="warning">{LIGHTING_LABEL[row.lighting]}</Badge>
            )}
          </div>
        </div>

        <span className="text-gray-300 text-xs shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-current/10 px-4 py-3 bg-white/60 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {detailRows.map(({ label, value, tone }) => (
              <div key={label} className="text-center rounded-xl bg-gray-50 border border-gray-100 py-2">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <Badge tone={tone}>{value}</Badge>
              </div>
            ))}
          </div>

          {row.has_warning && row.warning_reasons && row.warning_reasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-1.5">{t('quiz_monitor', 'warnings_label')}</p>
              <div className="flex flex-wrap gap-1.5">
                {row.warning_reasons.map((r) => (
                  <span key={r} className="text-xs bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                    {REASON_LABEL[r] ?? r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!row.has_warning && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              {t('quiz_monitor', 'no_warning_msg')}
            </p>
          )}

          <p className="text-[10px] text-gray-400">
            {t('quiz_monitor', 'answered_at')}{new Date(row.answered_at).toLocaleTimeString(
              lang === 'en' ? 'en-US' : 'id-ID',
              { hour: '2-digit', minute: '2-digit', second: '2-digit' }
            )}
          </p>
        </div>
      )}
    </div>
  );
}

interface QuizMonitoringDetailProps {
  rows: QuestionMonitorRow[];
  loading: boolean;
  onBack: () => void;
  studentName?: string;
  quizTitle?: string;
  accentColor?: string;
}

export function QuizMonitoringDetail({
  rows, loading, onBack, studentName, quizTitle, accentColor = '#1B8A5A',
}: QuizMonitoringDetailProps) {
  const { t } = useT();
  const totalWarningSeconds = rows.reduce((a, r) => a + r.warning_count, 0);
  const warnedQuestions     = rows.filter((r) => r.has_warning).length;

  const stats = [
    { label: t('quiz_monitor', 'stat_total'),      value: rows.length.toString(),                       tone: 'neutral' as const },
    { label: t('quiz_monitor', 'stat_warned'),      value: warnedQuestions.toString(),                   tone: (warnedQuestions > 0 ? 'alert' : 'safe') as 'alert' | 'safe' },
    { label: t('quiz_monitor', 'stat_warn_secs'),   value: totalWarningSeconds.toString(),               tone: (totalWarningSeconds > 0 ? 'warning' : 'safe') as 'warning' | 'safe' },
    { label: t('quiz_monitor', 'stat_safe'),        value: (rows.length - warnedQuestions).toString(),   tone: 'safe' as const },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>{t('quiz_monitor', 'back')}</Button>
        {studentName && <span className="text-sm font-semibold text-[#0D2B1E]">{studentName}</span>}
        {quizTitle   && <span className="text-xs text-gray-400">· {quizTitle}</span>}
      </div>

      {/* Stats strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, tone }) => (
            <div key={label} className="rounded-2xl bg-white border border-gray-100 px-4 py-3 text-center">
              <p className="text-lg font-bold font-display" style={{ color: accentColor }}>{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-gray-400 text-sm">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor }} />
          {t('quiz_monitor', 'loading')}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm text-gray-400">{t('quiz_monitor', 'empty_title')}</p>
            <p className="text-xs text-gray-300 mt-1">{t('quiz_monitor', 'empty_hint')}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 px-1">
            {t('quiz_monitor', 'click_hint')}
          </p>
          {rows.map((row) => <QuestionCard key={row.question_index} row={row} />)}
        </div>
      )}
    </div>
  );
}
