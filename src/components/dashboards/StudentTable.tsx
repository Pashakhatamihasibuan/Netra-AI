'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeHealth } from '@/hooks/useRealtimeHealth';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useT } from '@/i18n/useT';

interface StudentRow {
  id: string;
  name: string;
  latestHealthScore: number | null;
  latestQuizScore: number | null;
}

export function StudentTable() {
  const [rows, setRows]       = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useT();

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: results } = await supabase
      .from('quiz_results')
      .select('user_id, score, display_name, created_at')
      .order('created_at', { ascending: false });

    const studentIds = Array.from(new Set((results ?? []).map((r) => r.user_id)));

    const { data: healthRecords } = await supabase
      .from('health_records')
      .select('user_id, health_score, created_at')
      .order('created_at', { ascending: false });

    setRows(
      studentIds.map((id) => {
        const latestResult = results?.find((r) => r.user_id === id);
        const latestHealth = healthRecords?.find((h) => h.user_id === id);
        return {
          id,
          name:              latestResult?.display_name ?? t('student_table', 'default_name'),
          latestQuizScore:   latestResult?.score ?? null,
          latestHealthScore: latestHealth?.health_score ?? null,
        };
      })
    );
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);
  useRealtimeHealth(load);

  return (
    <Card>
      <CardTitle>{t('student_table', 'title')}</CardTitle>
      {loading ? (
        <p className="text-sm text-ink/50">{t('student_table', 'loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink/50">
          {t('student_table', 'empty')}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 border-b border-teal-50">
              <th className="py-2">{t('student_table', 'col_name')}</th>
              <th className="py-2">{t('student_table', 'col_quiz')}</th>
              <th className="py-2">{t('student_table', 'col_health')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-teal-50 last:border-0">
                <td className="py-2">{r.name}</td>
                <td className="py-2">{r.latestQuizScore ?? '—'}</td>
                <td className="py-2">
                  {r.latestHealthScore !== null ? (
                    <Badge
                      tone={
                        r.latestHealthScore >= 80
                          ? 'safe'
                          : r.latestHealthScore >= 60
                          ? 'warning'
                          : 'alert'
                      }
                    >
                      {r.latestHealthScore}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
