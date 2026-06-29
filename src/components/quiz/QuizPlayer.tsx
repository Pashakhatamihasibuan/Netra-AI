'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { MathText } from '@/components/shared/EquationEditor';
import { useAppStore } from '@/store/useAppStore';
import { useT } from '@/i18n/useT';
import type { StudentQuestion } from '@/types';

interface QuizPlayerProps {
  quizId: string;
  quizTitle: string;
  secondsPerQuestion?: number; // omit for an untimed quiz
  randomizeOrder?: boolean;
}

type Answer = { questionId: string; selected: 'A' | 'B' | 'C' | 'D' };
type BlockedState = { reason: 'forfeited' | 'submitted' | 'error'; message: string; score?: number | null };

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function QuizPlayer({ quizId, quizTitle, secondsPerQuestion, randomizeOrder = true }: QuizPlayerProps) {
  const { t } = useT();
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(secondsPerQuestion ?? 0);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalQuestions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<BlockedState | null>(null);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fontSize, setFontSize] = useState(18); // px, default ~text-lg
  const attemptIdRef     = useRef<string | null>(null);
  const questionStartRef = useRef<string>(new Date().toISOString());
  const sampleBufferRef  = useRef<Array<{
    distanceCm: number | null;
    posture: string | null;
    lighting: string | null;
    blinkRate: number | null;
    hasWarning: boolean;
    warningReason: string | null;
  }>>([]);

  // Health / Monitoring State
  const posture = useAppStore((s) => s.posture);
  const distanceCm = useAppStore((s) => s.distanceCm);
  const blinkRate = useAppStore((s) => s.blinkRate);
  const lighting = useAppStore((s) => s.lighting);
  const requestCameraAutoStart = useAppStore((s) => s.requestCameraAutoStart);
  const requestCameraAutoStop = useAppStore((s) => s.requestCameraAutoStop);

  // ── ANTI-CURANG: cek izin masuk dulu, baru ambil soal ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function startThenLoad() {
      setLoading(true);
      try {
        const startRes = await fetch('/api/quiz/attempt/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId }),
        });
        const startData = await startRes.json();

        if (cancelled) return;

        if (startData.blocked) {
          setBlocked({ reason: startData.reason, message: startData.message, score: startData.score ?? null });
          setLoading(false);
          return;
        }

        attemptIdRef.current = startData.attemptId ?? null;
      } catch {
        if (!cancelled) {
          setBlocked({ reason: 'error', message: t('quiz', 'player_conn_err') });
          setLoading(false);
        }
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from('questions_for_student')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');

      if (cancelled) return;
      setQuestions(randomizeOrder ? shuffle(data ?? []) : data ?? []);
      setLoading(false);
    }

    startThenLoad();
    return () => { cancelled = true; };
  }, [quizId, randomizeOrder]);

  // ── ANTI-CURANG: pindah tab/aplikasi saat kuis aktif -> forfeit ───────
  const quizActive = started && !loading && !blocked && !result && questions.length > 0 && index < questions.length;

  // Flush snapshot CV untuk soal ke-N, dipanggil saat pindah soal / submit / forfeit
  function flushQuestionMonitoring(questionIndex: number) {
    const samples = sampleBufferRef.current;
    sampleBufferRef.current = [];
    questionStartRef.current = new Date().toISOString();
    if (samples.length === 0) return;
    fetch('/api/quiz/monitoring-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId,
        attemptId: attemptIdRef.current,
        questionIndex,
        answeredAt: new Date().toISOString(),
        samples,
      }),
    }).catch(() => {});
  }

  useEffect(() => {
    if (!quizActive) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        flushQuestionMonitoring(index);
        setBlocked({
          reason: 'forfeited',
          message: t('quiz', 'player_forfeit_tab'),
        });
        fetch('/api/quiz/attempt/forfeit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId }),
        }).catch(() => {});
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [quizActive, quizId]);

  // ── ANTI-CURANG: keluar dari fullscreen saat kuis aktif -> forfeit ────
  useEffect(() => {
    if (!quizActive) return;

    function handleFullscreenChange() {
      if (!document.fullscreenElement && !submitting) {
        flushQuestionMonitoring(index);
        setBlocked({
          reason: 'forfeited',
          message: t('quiz', 'player_forfeit_fs'),
        });
        fetch('/api/quiz/attempt/forfeit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId }),
        }).catch(() => {});
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [quizActive, quizId, submitting]);

  async function handleStartQuiz() {
    setStarted(true);
    setSecondsLeft(secondsPerQuestion ?? 0);
    requestCameraAutoStart();
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
    } catch {
      // Browser/device tidak mendukung atau ditolak user — kuis tetap
      // lanjut tanpa fullscreen, tidak boleh blocking.
    }
  }

  // Keluar dari fullscreen saat kuis selesai/diblokir, supaya siswa tidak
  // "terjebak" fullscreen setelah hasil tampil. Juga minta MonitoringPanel
  // menyimpan sesi (health_records) tanpa perlu klik "Akhiri sesi" manual.
  useEffect(() => {
    if (result || blocked) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      requestCameraAutoStop();
    }
  }, [result, blocked, requestCameraAutoStop]);

  const current = questions[index];

  // Determine if quiz should be paused based on real-time camera data
  const isTooClose = distanceCm !== null && distanceCm < 30;
  const isTooFar = distanceCm !== null && distanceCm > 70;
  const isBadPosture = posture === 'poor';
  // Optional: add blink rate or lighting to pause conditions if desired
  const isPaused = (isTooClose || isTooFar || isBadPosture) && !result && !blocked && index < questions.length && !loading;

  let warningMessage = '';
  if (isBadPosture) {
    warningMessage = t('monitoring', 'w_posture_quiz');
  } else if (isTooClose) {
    warningMessage = t('monitoring', 'w_too_close_quiz');
  } else if (isTooFar) {
    warningMessage = t('monitoring', 'w_too_far_quiz');
  }

  // ── KUMPULKAN SAMPLE CV PER DETIK selama soal aktif ────────────────────
  useEffect(() => {
    if (!quizActive) return;
    const tooClose   = distanceCm !== null && distanceCm < 30;
    const tooFar     = distanceCm !== null && distanceCm > 70;
    const badPosture = posture === 'poor';
    const hasWarning = tooClose || tooFar || badPosture;
    const warningReason = badPosture ? 'posture' : tooClose ? 'too_close' : tooFar ? 'too_far' : null;

    const tick = setInterval(() => {
      sampleBufferRef.current.push({ distanceCm, posture, lighting, blinkRate, hasWarning, warningReason });
    }, 1000);

    return () => clearInterval(tick);
  }, [quizActive, distanceCm, posture, lighting, blinkRate, index]);

  // goNext: flush CV soal saat ini LALU pindah
  const goNext = useMemo(
    () => () => {
      flushQuestionMonitoring(index);
      setIndex((i) => Math.min(i + 1, questions.length));
      setSecondsLeft(secondsPerQuestion ?? 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions.length, secondsPerQuestion, index]
  );

  useEffect(() => {
    if (!started || !secondsPerQuestion || !current || result || isPaused || blocked) return;
    if (secondsLeft <= 0) {
      goNext();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, secondsPerQuestion, current, goNext, result, isPaused, blocked]);

  function selectAnswer(option: 'A' | 'B' | 'C' | 'D') {
    if (!current || isPaused || blocked) return;
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== current.id), { questionId: current.id, selected: option }]);
  }

  async function submitQuiz() {
    setSubmitting(true);
    flushQuestionMonitoring(index); // flush soal terakhir
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, answers }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setBlocked({ reason: 'forfeited', message: data.error ?? t('quiz', 'player_cannot_submit'), score: data.score ?? 0 });
      return;
    }
    setResult(data);
  }

  if (blocked) {
    const icon = blocked.reason === 'forfeited' ? '🚫' : blocked.reason === 'submitted' ? '✅' : '⚠️';
    return (
      <Card className="text-center">
        <p className="text-5xl mb-3">{icon}</p>
        <CardTitle className="justify-center">{quizTitle}</CardTitle>
        <p className="text-ink/80 mb-2">{blocked.message}</p>
        {blocked.score !== null && blocked.score !== undefined && (
          <p className="text-3xl font-display font-bold text-teal-600 mt-2">{blocked.score}</p>
        )}
        <p className="text-xs text-ink/40 mt-4">{t('quiz', 'player_no_replay')}</p>
      </Card>
    );
  }

  if (loading) return <Card>{t('quiz', 'player_loading')}</Card>;

  if (result) {
    return (
      <Card>
        <CardTitle>{t('quiz', 'player_result').replace('{title}', quizTitle)}</CardTitle>
        <p className="text-3xl font-display font-bold text-teal-600">{result.score}</p>
        <p className="text-sm text-ink/70">
          {t('quiz', 'player_correct').replace('{correct}', String(result.correctCount)).replace('{total}', String(result.totalQuestions))}
        </p>
      </Card>
    );
  }

  if (index >= questions.length) {
    return (
      <Card>
        <CardTitle>{t('quiz', 'player_ready')}</CardTitle>
        <p className="text-sm text-ink/70 mb-3">{t('quiz', 'player_answered').replace('{n}', String(answers.length)).replace('{total}', String(questions.length))}</p>
        <Button onClick={submitQuiz}>{t('quiz', 'player_submit')}</Button>
      </Card>
    );
  }

  if (!current) return <Card>Kuis ini belum punya soal.</Card>;

  if (!started) {
    return (
      <Card className="text-center">
        <p className="text-5xl mb-3">🚀</p>
        <CardTitle className="justify-center">{quizTitle}</CardTitle>
        <p className="text-ink/70 mb-1">{questions.length} {t('quiz', 'player_start_msg')}</p>
        {secondsPerQuestion && (
          <p className="text-sm text-ink/50 mb-4">{t('quiz', 'player_timed_msg')}</p>
        )}
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block mb-4">
          {t('quiz', 'player_warning')}
        </p>
        <div>
          <Button onClick={handleStartQuiz}>{t('quiz', 'player_start')}</Button>
        </div>
      </Card>
    );
  }

  const selected = answers.find((a) => a.questionId === current.id)?.selected;

  return (
    <Card className="relative overflow-hidden">
      {/* ALARM / OVERLAY PAUSE */}
      {isPaused && (
        <div className="absolute inset-0 z-50 bg-alertred-100/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center border-4 border-alertred-500 rounded-xl2">
          <p className="text-6xl mb-4 animate-bounce">⚠️</p>
          <h2 className="font-display text-2xl font-bold text-alertred-700 mb-2">{t('quiz', 'player_paused')}</h2>
          <p className="text-alertred-800 font-medium text-lg mb-4">{warningMessage}</p>
          <p className="text-sm text-alertred-600">{t('quiz', 'player_fix')}</p>
        </div>
      )}

      <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
        {t('quiz', 'player_tab_warning')}
      </div>

      <div className={`transition-opacity duration-300 ${isPaused ? 'opacity-20 blur-sm pointer-events-none' : 'opacity-100'}`}>
        <div className="flex justify-between items-center mb-2">
          <CardTitle>{quizTitle}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-cream rounded-lg px-2 py-1 border border-teal-100">
              <button
                onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                className="w-6 h-6 flex items-center justify-center text-ink/60 hover:text-ink rounded transition-colors font-bold text-sm"
                title="Perkecil teks"
              >A−</button>
              <span className="text-xs text-ink/40 px-1 select-none">{fontSize}px</span>
              <button
                onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                className="w-6 h-6 flex items-center justify-center text-ink/60 hover:text-ink rounded transition-colors font-bold text-sm"
                title="Perbesar teks"
              >A+</button>
            </div>
            <span className="text-sm text-ink/60">
              {index + 1}/{questions.length}
              {secondsPerQuestion ? ` · ${secondsLeft}s` : ''}
            </span>
          </div>
        </div>
        
        {current.image_url && (
          <div className="mb-4">
            <img 
              src={current.image_url} 
              alt="Gambar Soal" 
              className="max-h-64 rounded-lg object-contain border border-teal-100" 
            />
          </div>
        )}
        
        <p className="font-medium mb-4" style={{ fontSize }}><MathText text={current.question} /></p>
        <div className="space-y-2">
          {(['A', 'B', 'C', 'D'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => selectAnswer(opt)}
              disabled={isPaused}
              style={{ fontSize }}
              className={`w-full text-left rounded-xl2 border px-4 py-3 transition-colors ${
                selected === opt ? 'border-teal-600 bg-teal-50' : 'border-teal-50 hover:bg-cream'
              }`}
            >
              <strong className="mr-3">{opt}.</strong>
              <MathText text={current[`option_${opt.toLowerCase()}` as 'option_a'] ?? ''} />
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={goNext} disabled={!selected || isPaused}>
            {index + 1 === questions.length ? t('quiz', 'player_finish') : t('quiz', 'player_next')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
