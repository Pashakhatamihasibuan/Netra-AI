'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { useT } from '@/i18n/useT';

interface QuizResult {
  id: string; quiz_title: string; score: number; submitted_at: string;
  subject?: string | null; total_questions?: number;
}

export function ChildQuizResults({ studentId }: { studentId: string }) {
  const { t, lang } = useT();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/quiz-results?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => setResults(d.results ?? []))
      .finally(() => setLoading(false));
  }, [studentId]);

  const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const highest = results.length > 0 ? Math.max(...results.map((r) => r.score)) : 0;

  return (
    <Card>
      <CardTitle>{t('parent', 'quiz_title')}</CardTitle>
      {loading ? (
        <p className="text-sm text-ink/40 mt-2">{t('parent', 'quiz_loading')}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-ink/40 mt-2">{t('parent', 'quiz_empty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mt-3 mb-4">
            <StatBox label={t('parent', 'stat_total')} value={String(results.length)} />
            <StatBox label={t('parent', 'stat_avg')} value={`${avg}`} />
            <StatBox label={t('parent', 'stat_highest')} value={`${highest}`} />
          </div>
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-sm border-b border-teal-50 pb-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.quiz_title}</p>
                  <p className="text-xs text-ink/40">
                    {new Date(r.submitted_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className={`font-bold text-base tabular-nums ${r.score >= 80 ? 'text-teal-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                  {r.score}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl2 bg-teal-50 border border-teal-100 px-3 py-2.5 text-center">
      <p className="text-xl font-bold text-teal-700">{value}</p>
      <p className="text-[10px] text-ink/50 mt-0.5">{label}</p>
    </div>
  );
}
