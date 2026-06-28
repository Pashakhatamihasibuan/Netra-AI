'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useT } from '@/i18n/useT';

interface ClassQuiz {
  id: string; title: string; subject?: string | null;
  question_count: number; user_submission?: { score: number | null; stopped_by_cv?: boolean } | null;
  class_name?: string | null;
}

interface Props { onSelect: (quiz: ClassQuiz) => void }

export function StudentQuizList({ onSelect }: Props) {
  const { t } = useT();
  const [quizzes, setQuizzes] = useState<ClassQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/class-quizzes')
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Card><p className="text-sm text-ink/40">{t('common', 'loading')}</p></Card>;
  if (quizzes.length === 0) return null;

  return (
    <Card>
      <CardTitle>{t('quiz', 'quiz_for_class')}</CardTitle>
      <p className="text-xs text-ink/40 mb-3">{t('quiz', 'quiz_auto_desc')}</p>
      <div className="space-y-2">
        {quizzes.map((q) => {
          const sub = q.user_submission;
          const done = !!sub;
          const stopped = sub?.stopped_by_cv;

          return (
            <button
              key={q.id}
              onClick={() => !done && onSelect(q)}
              disabled={done}
              className={`w-full text-left rounded-xl2 border px-4 py-3 transition-colors ${done ? 'border-teal-50 bg-teal-50/30 opacity-70 cursor-default' : 'border-teal-50 hover:bg-teal-50/40'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{q.title}</p>
                    {q.subject && <span className="text-[10px] bg-coral-50 text-coral-700 px-1.5 py-0.5 rounded font-bold">{q.subject}</span>}
                  </div>
                  <p className="text-xs text-ink/40 mt-0.5">{t('quiz', 'quiz_questions').replace('{n}', String(q.question_count))}</p>
                </div>
                <div className="shrink-0">
                  {done ? (
                    stopped
                      ? <Badge tone="alert">{t('quiz', 'quiz_stopped')}</Badge>
                      : <Badge tone="safe">{t('quiz', 'quiz_score').replace('{score}', String(sub?.score ?? 0))}</Badge>
                  ) : (
                    <Badge tone="neutral">{t('quiz', 'quiz_not_done')}</Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
