'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { QuizMonitoringDetail, type QuestionMonitorRow } from '@/components/shared/QuizMonitoringDetail';
import { useT } from '@/i18n/useT';

interface SummaryRow { studentId: string; name: string; questionCount: number; totalWarnings: number; byReason: Record<string, number>; totalSeconds: number }

async function authedFetch(url: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' });
  return res.json();
}

export interface MonitoringRowSummary { studentId: string; totalWarnings: number; byReason: Record<string, number>; questionCount: number }

export function MonitoringWarningBadge({ row, onClick }: { row: MonitoringRowSummary | undefined; onClick: () => void }) {
  const { t } = useT();
  if (!row) return <span className="text-gray-300 text-xs">—</span>;
  if (row.totalWarnings === 0) return <Badge tone="safe">{t('parent', 'mon_safe')}</Badge>;
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors">
      {t('parent', 'mon_warning').replace('{n}', String(row.totalWarnings))}
    </button>
  );
}

interface MonitoringSummaryModalProps { quizId: string; student: { id: string; name: string } | null; onClose: () => void }

export function MonitoringSummaryModal({ quizId, student, onClose }: MonitoringSummaryModalProps) {
  const { t } = useT();
  const [rows, setRows]         = useState<QuestionMonitorRow[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!student) return;
    const supabase = createClient();
    const channel = supabase.channel(`teacher-qmon-${student.id}-${quizId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_question_monitoring', filter: `student_id=eq.${student.id}` }, (payload) => {
        const row = payload.new as QuestionMonitorRow & { quiz_id: string };
        if (row.quiz_id !== quizId) return;
        setRows((prev) => { const exists = prev.some((r) => r.question_index === row.question_index); if (exists) return prev.map((r) => r.question_index === row.question_index ? row : r); return [...prev, row].sort((a, b) => a.question_index - b.question_index); });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [student, quizId]);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    authedFetch(`/api/teacher/monitoring?quizId=${quizId}&studentId=${student.id}`)
      .then((d) => { setRows(d.questions ?? []); setLoading(false); });
  }, [quizId, student]);

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-display font-bold text-[#0D2B1E]">{student.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('monitoring', 'modal_per_question').replace('{n}', String(rows.length))}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <QuizMonitoringDetail rows={rows} loading={loading} onBack={onClose} studentName={student.name} accentColor="#1B8A5A" />
        </div>
      </div>
    </div>
  );
}

export function useMonitoringSummary(quizId: string | null) {
  const [summary, setSummary] = useState<Record<string, MonitoringRowSummary>>({});
  const load = useCallback(async () => {
    if (!quizId) { setSummary({}); return; }
    setSummary({});
    const data = await authedFetch(`/api/teacher/monitoring?quizId=${quizId}`);
    const map: Record<string, MonitoringRowSummary> = {};
    for (const s of (data.summary ?? []) as SummaryRow[]) { map[s.studentId] = { studentId: s.studentId, totalWarnings: s.totalWarnings, byReason: s.byReason, questionCount: s.questionCount }; }
    setSummary(map);
  }, [quizId]);
  useEffect(() => { load(); }, [load]);
  return { summary };
}
