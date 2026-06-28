'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuizMonitoringDetail, type QuestionMonitorRow } from '@/components/shared/QuizMonitoringDetail';
import { useT } from '@/i18n/useT';

interface QuizSession {
  submission_id: string; quiz_id: string; quiz_title: string;
  score: number | null; submitted_at: string;
  total_warning_seconds: number; question_count: number;
  is_stopped_by_cv: boolean;
}

export function ParentMonitoringView({ studentId }: { studentId: string }) {
  const { t } = useT();
  const [sessions, setSessions]     = useState<QuizSession[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailRows, setDetailRows] = useState<QuestionMonitorRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/monitoring?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, [studentId]);

  async function toggleDetail(submissionId: string) {
    if (selectedId === submissionId) { setSelectedId(null); setDetailRows([]); return; }
    setSelectedId(submissionId);
    setDetailLoading(true);
    setDetailRows([]);
    try {
      const res  = await fetch(`/api/parent/monitoring/detail?submissionId=${submissionId}&studentId=${studentId}`);
      const data = await res.json();
      setDetailRows(data.questions ?? []);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle>{t('parent', 'mon_title')}</CardTitle>
      <p className="text-xs text-ink/40 mb-3">{t('parent', 'mon_subtitle')}</p>

      {loading ? (
        <p className="text-sm text-ink/40">{t('parent', 'mon_loading')}</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-ink/40">{t('parent', 'mon_empty')}</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.submission_id}>
              <button
                onClick={() => toggleDetail(s.submission_id)}
                className="w-full text-left rounded-xl2 border border-teal-50 px-4 py-3 hover:bg-teal-50/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{s.quiz_title}</p>
                    <p className="text-xs text-ink/40 mt-0.5">
                      {new Date(s.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.total_warning_seconds === 0
                      ? <Badge tone="safe">{t('parent', 'mon_safe')}</Badge>
                      : <Badge tone="warning">{t('parent', 'mon_warning').replace('{n}', String(s.total_warning_seconds))}</Badge>}
                    {s.score !== null && (
                      <span className={`text-sm font-bold tabular-nums ${s.score >= 80 ? 'text-teal-600' : s.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                        {s.score}
                      </span>
                    )}
                  </div>
                </div>
                {s.question_count > 0 && (
                  <p className="text-[10px] text-ink/30 mt-1">
                    {t('parent', 'mon_per_question').replace('{n}', String(s.question_count))}
                  </p>
                )}
              </button>
              {selectedId === s.submission_id && (
                <div className="mt-1 border border-teal-50 rounded-xl2 overflow-hidden">
                  <QuizMonitoringDetail
                    rows={detailRows}
                    loading={detailLoading}
                    onBack={() => { setSelectedId(null); setDetailRows([]); }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
