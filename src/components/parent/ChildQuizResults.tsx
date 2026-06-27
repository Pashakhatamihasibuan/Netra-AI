'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface QuizResultRow {
  id: string;
  score: number;
  created_at: string;
  quizzes: { title: string; subject: string | null } | null;
}

function scoreTone(score: number): 'safe' | 'warning' | 'alert' {
  if (score >= 80) return 'safe';
  if (score >= 60) return 'warning';
  return 'alert';
}

export function ChildQuizResults({ childId }: { childId: string }) {
  const [rows, setRows]       = useState<QuizResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token;
      return fetch(`/api/parent/quiz-results?childId=${childId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
    }).then((r) => r.json()).then((d) => {
      if (d.error) { setError(d.error); setLoading(false); return; }
      setRows((d.results ?? []) as QuizResultRow[]);
      setLoading(false);
    }).catch(() => { setError('Gagal memuat data.'); setLoading(false); });
  }, [childId]);

  return (
    <Card>
      <CardTitle>📊 Riwayat Nilai Kuis</CardTitle>
      {loading ? (
        <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-[#6D5AE6] border-t-transparent rounded-full animate-spin" />
          Memuat nilai…
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 py-4">{error}</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-gray-400">Anak ini belum mengerjakan kuis apapun.</p>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Kuis', value: rows.length.toString() },
              { label: 'Rata-rata',  value: Math.round(rows.reduce((a,r)=>a+r.score,0)/rows.length).toString() },
              { label: 'Tertinggi', value: Math.max(...rows.map(r=>r.score)).toString() },
            ].map(({ label, value }) => (
              <div key={label} className="text-center rounded-2xl bg-gray-50 border border-gray-100 py-2.5">
                <p className="text-base font-bold font-display text-[#0D2B1E]">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0">
                  <p className="font-medium text-[#0D2B1E] truncate">{row.quizzes?.title ?? 'Kuis'}</p>
                  <p className="text-xs text-gray-400">
                    {row.quizzes?.subject && <span className="mr-2">{row.quizzes.subject}</span>}
                    {new Date(row.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <Badge tone={scoreTone(row.score)}>{row.score}</Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
