'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuizMonitoringDetail, type QuestionMonitorRow } from '@/components/shared/QuizMonitoringDetail';

interface QuizEntry {
  quizId: string;
  title: string;
  subject: string | null;
  classLevel: string | null;
  startedAt: string;
  status: string;
  warnings: number;
}

async function authedFetch(url: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  return res.json();
}

export function ParentMonitoringView({ childId }: { childId: string }) {
  const [quizzes, setQuizzes]         = useState<QuizEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedQuiz, setSelected]   = useState<QuizEntry | null>(null);
  const [detail, setDetail]           = useState<QuestionMonitorRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadQuizzes = useCallback(async () => {
    setLoading(true);
    const data = await authedFetch(`/api/parent/monitoring?childId=${childId}`);
    setQuizzes(data.quizzes ?? []);
    setLoading(false);
  }, [childId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  // Realtime: deteksi kuis baru dimulai anak
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`parent-attempts-${childId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_attempts', filter: `student_id=eq.${childId}` },
        () => { loadQuizzes(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [childId, loadQuizzes]);

  // Realtime: update detail soal saat siswa sedang mengerjakan
  useEffect(() => {
    if (!selectedQuiz) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`parent-qmon-${childId}-${selectedQuiz.quizId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'quiz_question_monitoring',
        filter: `student_id=eq.${childId}`,
      }, (payload) => {
        const row = payload.new as QuestionMonitorRow & { quiz_id: string };
        if (row.quiz_id !== selectedQuiz.quizId) return;
        setDetail((prev) => {
          const exists = prev.some((r) => r.question_index === row.question_index);
          if (exists) return prev.map((r) => r.question_index === row.question_index ? row : r);
          return [...prev, row].sort((a, b) => a.question_index - b.question_index);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [childId, selectedQuiz]);

  async function openDetail(quiz: QuizEntry) {
    setSelected(quiz);
    setDetailLoading(true);
    setDetail([]);
    const data = await authedFetch(`/api/parent/monitoring?childId=${childId}&quizId=${quiz.quizId}`);
    setDetail(data.questions ?? []);
    setDetailLoading(false);
  }

  if (selectedQuiz) {
    return (
      <QuizMonitoringDetail
        rows={detail}
        loading={detailLoading}
        onBack={() => { setSelected(null); setDetail([]); }}
        studentName={undefined}
        quizTitle={selectedQuiz.title}
        accentColor="#6D5AE6"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-[#0D2B1E] text-base">📷 Monitoring Computer Vision</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Klik kuis untuk lihat detail postur & jarak per soal. Data tersimpan permanen.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadQuizzes}>↻</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-gray-400 text-sm">
          <div className="w-5 h-5 border-2 border-[#6D5AE6] border-t-transparent rounded-full animate-spin" />
          Memuat…
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm text-gray-400">Belum ada kuis yang dikerjakan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map((q) => (
            <button
              key={q.quizId}
              onClick={() => openDetail(q)}
              className="w-full text-left rounded-2xl border-2 border-gray-100 bg-white px-4 py-3 hover:border-[#6D5AE6]/30 hover:bg-[#EEF0FD]/30 transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#0D2B1E] truncate">{q.title}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {q.subject    && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full">{q.subject}</span>}
                    {q.classLevel && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full">{q.classLevel} SD</span>}
                    <span className="text-[10px] text-gray-400">{new Date(q.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {q.warnings > 0
                    ? <Badge tone="alert">⚠️ {q.warnings} dtk warning</Badge>
                    : <Badge tone="safe">✓ Aman</Badge>}
                  {q.status === 'in_progress' && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#6D5AE6]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6D5AE6] animate-pulse inline-block" />LIVE
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
