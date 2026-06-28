'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { HealthScoreCard } from '@/components/health/HealthScoreCard';
import { BadgeList } from '@/components/health/BadgeList';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ParentPinCard } from '@/components/student/ParentPinCard';
import { StudentQuizList } from '@/components/student/StudentQuizList';
import { useAppStore } from '@/store/useAppStore';
import { useT } from '@/i18n/useT';

// Grade labels are looked up via t() using keys grade_3 … grade_6
// defined in translations.dashboard to keep all strings centralised.

export default function StudentDashboardPage() {
  const user   = useAppStore((s) => s.user);
  const router = useRouter();
  const { t, lang } = useT();
  const [ready, setReady]         = useState(false);
  const [quizCode, setQuizCode]   = useState('');
  const [joining, setJoining]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [homeroomLabel, setHomeroom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/student/homeroom').then(r => r.json()).then(d => {
      if (d.section) {
        const wali = t('dashboard', 'homeroom_label');
        const unassigned = t('dashboard', 'homeroom_unassigned');
        setHomeroom(`${d.section.class_level} SD ${d.section.section} · ${wali}: ${d.section.homeroom_teacher_name ?? unassigned}`);
      }
    }).catch(() => {});
  }, [user, lang]);

  useEffect(() => { const timer = setTimeout(() => setReady(true), 500); return () => clearTimeout(timer); }, []);
  useEffect(() => { if (user) setReady(true); }, [user]);

  async function handleJoinQuiz(e: React.FormEvent) {
    e.preventDefault();
    if (!quizCode.trim()) return;
    setError(null); setJoining(true);
    try {
      const res  = await fetch('/api/quiz/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizCode: quizCode.trim().toUpperCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('dashboard', 'invalid_code'));
      router.push(`/student/quiz/${data.quizId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard', 'error_generic'));
      setJoining(false);
    }
  }

  if (!ready) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 border-2 border-[#1B8A5A] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-400">{t('dashboard', 'loading')}</p>
    </div>
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <p className="text-sm text-gray-500">{t('dashboard', 'error_load')}</p>
      <a href="/login" className="text-sm text-[#1B8A5A] font-semibold hover:underline">{t('dashboard', 'login_again')}</a>
    </div>
  );

  const gradeLabel = user.grade_level ? t('dashboard', `grade_${user.grade_level}`) : '';

  return (
    <div className="animate-fade-up space-y-5">
      {/* Greeting */}
      <div className="bg-gradient-to-r from-[#0D2B1E] to-[#1B5E42] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/60 text-xs font-medium mb-1">{t('dashboard', 'hello')}</p>
            <h1 className="font-display font-bold text-xl">{user.name}</h1>
            <p className="text-white/70 text-sm mt-1">{gradeLabel} · {t('dashboard', 'ready_today')}</p>
            {homeroomLabel && <p className="text-white/40 text-xs mt-0.5">{homeroomLabel}</p>}
          </div>
          <div className="text-4xl shrink-0">🎒</div>
        </div>
      </div>

      {/* Join quiz — prominent CTA */}
      <Card>
        <CardTitle>{t('dashboard', 'join_quiz')}</CardTitle>
        <p className="text-sm text-gray-500 mb-3">{t('dashboard', 'join_desc')}</p>
        <form onSubmit={handleJoinQuiz} className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-center tracking-widest uppercase font-mono text-base focus:outline-none focus:ring-2 focus:ring-[#1B8A5A]/50 focus:border-[#1B8A5A] bg-white"
            placeholder={t('dashboard', 'join_placeholder')}
            value={quizCode}
            onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <Button type="submit" disabled={joining}>
            {joining ? t('dashboard', 'join_btn_loading') : t('dashboard', 'join_btn')}
          </Button>
        </form>
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2">{error}</p>}
      </Card>

      <ParentPinCard pin={user.parent_pin} />
      <MonitoringPanel />
      <StudentQuizList onSelect={(quiz) => router.push(`/student/quiz/${quiz.id}`)} />

      {/* Materi */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="mb-1">{t('dashboard', 'materials_from_teacher')}</CardTitle>
            <p className="text-sm text-gray-500">{t('dashboard', 'materials_desc')}</p>
          </div>
          <a href="/student/materials">
            <Button variant="secondary">{t('dashboard', 'open_arrow')}</Button>
          </a>
        </div>
      </Card>

      {/* Health & badges */}
      <div className="grid sm:grid-cols-2 gap-5">
        <HealthScoreCard studentId={user.id} />
        <BadgeList studentId={user.id} />
      </div>
    </div>
  );
}
