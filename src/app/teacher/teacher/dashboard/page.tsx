'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Quiz } from '@/types';
import { MaterialManager } from '@/components/teacher/MaterialManager';
import { MaterialRequests } from '@/components/teacher/MaterialRequests';
import { TeacherProfile } from '@/components/teacher/TeacherProfile';
import { MonitoringWarningBadge, MonitoringSummaryModal, useMonitoringSummary } from '@/components/teacher/MonitoringSummaryModal';
import { useT } from '@/i18n/useT';

interface QuizResult {
  id: string;
  user_id: string;
  student_name: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  created_at: string;
}

// ─── Tab: Kuis & Kode ────────────────────────────────────────────────────────

function QuizTab() {
  const router = useRouter();
  const { t } = useT();
  const [quizzes, setQuizzes] = useState<(Quiz & { quiz_code?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => { fetchQuizzes(); }, []);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/quiz/list', { cache: 'no-store' });
      const data = await res.json();
      setQuizzes(data.quizzes ?? []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }

  async function generateCode(quizId: string) {
    setGeneratingCode(quizId);
    try {
      const res = await fetch('/api/quiz/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId }),
      });
      const data = await res.json();
      if (res.ok && data.quizCode) {
        setQuizzes((prev) => prev.map((q) => q.id === quizId ? { ...q, quiz_code: data.quizCode } : q));
      }
    } finally {
      setGeneratingCode(null);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  async function deleteQuiz(quizId: string) {
    if (!confirm(t('dashboard', 'delete_confirm'))) return;
    const res = await fetch('/api/teacher/quiz/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId }),
    });
    if (res.ok) {
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(t('common', 'error') + ': ' + (d.error ?? ''));
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="mb-0">{t('dashboard', 'my_quizzes')}</CardTitle>
        <Link href="/teacher/quiz/new">
          <Button>+ {t('dashboard', 'new_quiz_btn')}</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-gray-400 text-sm">
          <div className="w-4 h-4 border-2 border-[#1B8A5A] border-t-transparent rounded-full animate-spin" />
          {t('common', 'loading')}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm text-gray-500 mb-4">{t('dashboard', 'no_quizzes')}</p>
          <Link href="/teacher/quiz/new"><Button>{t('dashboard', 'create_first')}</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3 hover:border-gray-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-[#0D2B1E]">{q.title}</p>
                    {q.teacher_id === null && <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full font-semibold">{t('quiz', 'general')}</span>}
                    {q.subject && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full font-semibold">{q.subject}</span>}
                    {q.class_level && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full font-semibold">{q.class_level} SD</span>}
                  </div>
                  {q.description && <p className="text-xs text-gray-500 mt-0.5">{q.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(q.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Link href={`/teacher/quiz/${q.id}/edit`}>
                      <button className="text-xs font-semibold text-[#1B8A5A] hover:text-[#156B46] bg-[#E8F5EE] hover:bg-[#D0EDE0] px-2.5 py-1 rounded-lg transition-colors">{t('dashboard', 'edit_quiz')}</button>
                    </Link>
                    <button onClick={() => deleteQuiz(q.id)} className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors">{t('dashboard', 'delete_quiz')}</button>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {q.quiz_code ? (
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">{t('dashboard', 'quiz_code_label')}</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1B8A5A] text-base tracking-widest">{q.quiz_code}</span>
                        <button
                          type="button"
                          onClick={() => copyCode(q.quiz_code!)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors font-semibold ${copiedCode === q.quiz_code ? 'bg-[#1B8A5A] text-white' : 'bg-[#E8F5EE] text-[#1B8A5A] hover:bg-[#D0EDE0]'}`}
                        >
                          {copiedCode === q.quiz_code ? t('dashboard', 'copied') : t('dashboard', 'copy_code')}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{t('dashboard', 'share_students')}</p>
                    </div>
                  ) : (
                    <Button variant="secondary" onClick={() => generateCode(q.id)} disabled={generatingCode === q.id}>
                      {generatingCode === q.id ? '…' : t('dashboard', 'gen_code')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Tab: Hasil Siswa ────────────────────────────────────────────────────────

function ResultsTab() {
  const { t } = useT();
  const [quizzes, setQuizzes]       = useState<Quiz[]>([]);
  const [selectedQuiz, setSelQuiz]  = useState<Quiz | null>(null);
  const [results, setResults]       = useState<QuizResult[]>([]);
  const [loading, setLoading]       = useState(false);
  const { summary: monitoringSummary } = useMonitoringSummary(selectedQuiz?.id ?? null);
  const [timelineStudent, setTimelineStudent] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      let query = supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      if (user) query = query.or(`teacher_id.eq.${user.id},teacher_id.is.null`);
      query.then(({ data }) => setQuizzes(data ?? []));
    });
  }, []);

  const loadResults = useCallback(async () => {
    if (!selectedQuiz) return;
    setLoading(true);
    setResults([]);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/teacher/results?quizId=${selectedQuiz.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      const rawResults = json.results ?? [];
      setResults(rawResults.map((r: any) => ({
        id: r.id, user_id: r.user_id,
        student_name: r.display_name ?? t('dashboard', 'col_student'),
        quiz_id: r.quiz_id, quiz_title: selectedQuiz.title,
        score: r.score, created_at: r.created_at,
      })));
    } finally {
      setLoading(false);
    }
  }, [selectedQuiz]);

  useEffect(() => { loadResults(); }, [loadResults]);

  function scoreColor(score: number) {
    if (score >= 80) return 'safe';
    if (score >= 60) return 'warning';
    return 'alert';
  }

  function downloadCSV() {
    if (results.length === 0 || !selectedQuiz) return;
    const headers = [t('dashboard', 'col_student'), t('dashboard', 'col_score'), t('dashboard', 'col_time')];
    const rows = results.map(r => [`"${r.student_name}"`, r.score, `"${new Date(r.created_at).toLocaleString('id-ID')}"`].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hasil_kuis_${selectedQuiz.title.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>{t('dashboard', 'pick_quiz')}</CardTitle>
        <select
          className="w-full mt-2 rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          value={selectedQuiz?.id ?? ''}
          onChange={(e) => { const q = quizzes.find((q) => q.id === e.target.value) ?? null; setSelQuiz(q); }}
        >
          <option value="">{t('dashboard', 'pick_quiz_placeholder')}</option>
          {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </Card>

      {!selectedQuiz ? (
        <div className="text-center py-12 text-ink/40">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm">{t('dashboard', 'pick_quiz_hint')}</p>
        </div>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="mb-0">{t('dashboard', 'results_title', { title: selectedQuiz.title })}</CardTitle>
            <div className="flex items-center gap-3">
              {results.length > 0 && <span className="text-xs text-ink/40">{t('dashboard', 'submissions', { n: String(results.length) })}</span>}
              {results.length > 0 && <Button variant="secondary" onClick={downloadCSV}>{t('dashboard', 'download_csv')}</Button>}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-gray-400 text-sm">
              <div className="w-4 h-4 border-2 border-[#1B8A5A] border-t-transparent rounded-full animate-spin"/>
              {t('common', 'loading')}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">🎯</p>
              <p className="text-sm text-gray-400">{t('dashboard', 'no_submissions')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: t('dashboard', 'col_average'), value: Math.round(results.reduce((a, r) => a + r.score, 0) / results.length), color: 'text-[#1B8A5A]' },
                  { label: t('dashboard', 'col_highest'), value: Math.max(...results.map((r) => r.score)), color: 'text-blue-600' },
                  { label: t('dashboard', 'col_lowest'),  value: Math.min(...results.map((r) => r.score)), color: 'text-amber-600' },
                ].map((stat) => (
                  <div key={stat.label} className="text-center rounded-2xl bg-gray-50 border border-gray-100 py-3">
                    <p className={`text-2xl font-bold font-display ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left py-2 pr-4">{t('dashboard', 'col_num')}</th>
                    <th className="text-left py-2 pr-4">{t('dashboard', 'col_student')}</th>
                    <th className="text-left py-2 pr-4">{t('dashboard', 'col_score')}</th>
                    <th className="text-left py-2 pr-4">{t('dashboard', 'col_monitoring')}</th>
                    <th className="text-left py-2">{t('dashboard', 'col_time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2 pr-4 text-gray-400 text-xs">{i + 1}</td>
                      <td className="py-2 pr-4 font-medium text-[#0D2B1E]">{r.student_name}</td>
                      <td className="py-2 pr-4"><Badge tone={scoreColor(r.score)}>{r.score}</Badge></td>
                      <td className="py-2 pr-4">
                        <MonitoringWarningBadge
                          row={monitoringSummary[r.user_id]}
                          onClick={() => setTimelineStudent({ id: r.user_id, name: r.student_name })}
                        />
                      </td>
                      <td className="py-2 text-gray-400 text-xs">
                        {new Date(r.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      )}

      {timelineStudent && selectedQuiz && (
        <MonitoringSummaryModal
          quizId={selectedQuiz.id}
          student={{ id: timelineStudent.id, name: timelineStudent.name }}
          onClose={() => setTimelineStudent(null)}
        />
      )}
    </div>
  );
}

// ─── Tab: Materi ─────────────────────────────────────────────────────────────
function MaterialsTab() {
  return (
    <div className="space-y-5">
      <MaterialRequests />
      <MaterialManager />
    </div>
  );
}

// ─── Halaman utama ────────────────────────────────────────────────────────────
type Tab = 'quizzes' | 'results' | 'materials' | 'classes';

export default function TeacherDashboardPage() {
  const [activeTab, setActive] = useState<Tab>('quizzes');
  const { t } = useT();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'quizzes',   label: t('dashboard', 'tab_quiz'),       icon: '📝' },
    { id: 'results',   label: t('dashboard', 'tab_results'),    icon: '📊' },
    { id: 'materials', label: t('dashboard', 'tab_materials'),  icon: '📚' },
    { id: 'classes',   label: t('dashboard', 'tab_profile'),    icon: '🏫' },
  ];

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D2B1E] to-[#1B5E42] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/60 text-xs font-medium mb-1">Dashboard</p>
            <h1 className="font-display font-bold text-xl">{t('dashboard', 'teacher_room')}</h1>
            <p className="text-white/70 text-sm mt-1">{t('dashboard', 'teacher_subtitle')}</p>
          </div>
          <div className="text-4xl shrink-0">👨‍🏫</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#1B8A5A] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-[#0D2B1E]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'quizzes'   && <QuizTab />}
      {activeTab === 'results'   && <ResultsTab />}
      {activeTab === 'materials' && <MaterialsTab />}
      {activeTab === 'classes'   && <TeacherProfile />}
    </div>
  );
}
