'use client';

// src/components/student/StudentQuizList.tsx
// Daftar kuis yang otomatis tersedia untuk kelas siswa ini (dari guru
// manapun), tanpa perlu memasukkan kode. Untuk sesi kuis langsung
// (Kahoot-style berbatas waktu bersama), siswa tetap bisa pakai kolom
// "Ikut Kuis" dengan kode di dashboard.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface StudentQuiz {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  class_level: string | null;
  question_count: number;
  status: 'in_progress' | 'submitted' | 'forfeited' | null;
  score: number | null;
}

export function StudentQuizList() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<StudentQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/student/quizzes')
      .then((r) => r.json())
      .then((d) => setQuizzes(d.quizzes ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (quizzes.length === 0) return null;

  return (
    <Card>
      <CardTitle>Kuis untuk Kelasmu</CardTitle>
      <p className="text-sm text-ink/60 mb-3">Kuis ini otomatis tersedia, tidak perlu kode.</p>
      <div className="space-y-2">
        {quizzes.map((q) => (
          <button
            key={q.id}
            onClick={() => router.push(`/student/quiz/${q.id}`)}
            className="w-full text-left rounded-xl2 border border-teal-50 px-4 py-3 hover:bg-cream transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm truncate">{q.title}</p>
                {q.subject && <span className="text-[10px] bg-coral-50 text-coral-700 px-1.5 py-0.5 rounded font-bold shrink-0">{q.subject}</span>}
              </div>
              <p className="text-xs text-ink/40 mt-0.5">{q.question_count} soal</p>
            </div>
            {q.status === 'submitted' && <Badge tone="safe">Nilai: {q.score}</Badge>}
            {q.status === 'forfeited' && <Badge tone="alert">Dihentikan · 0</Badge>}
            {!q.status && <Badge tone="neutral">Belum dikerjakan</Badge>}
          </button>
        ))}
      </div>
    </Card>
  );
}
