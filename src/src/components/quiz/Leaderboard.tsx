'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeQuizResults } from '@/hooks/useRealtimeQuizResults';
import { Card, CardTitle } from '@/components/ui/Card';

interface LeaderboardRow {
  display_name: string;
  score: number;
  created_at: string;
}

export function Leaderboard({ quizId }: { quizId: string }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('quiz_results')
      .select('display_name, score, created_at')
      .eq('quiz_id', quizId)
      .order('score', { ascending: false })
      .limit(10)
      .then(({ data }) => setRows(data ?? []));
  }, [quizId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeQuizResults(quizId, load);

  return (
    <Card>
      <CardTitle>Leaderboard</CardTitle>
      <ol className="space-y-1">
        {rows.map((row, i) => (
          <li
            key={`${row.display_name}-${row.created_at}`}
            className="flex justify-between text-sm py-1.5 border-b border-teal-50 last:border-0"
          >
            <span>
              <span className="text-ink/40 mr-2">#{i + 1}</span>
              {row.display_name}
            </span>
            <span className="font-medium text-teal-600">{row.score}</span>
          </li>
        ))}
        {rows.length === 0 && (
          <p className="text-sm text-ink/50">Belum ada yang mengerjakan kuis ini.</p>
        )}
      </ol>
    </Card>
  );
}
