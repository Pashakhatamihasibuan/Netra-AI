'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QuizForm } from '@/components/quiz/QuizForm';
import type { Quiz, Question } from '@/types';

export default function EditQuizPage() {
  const params = useParams<{ quizId: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizAndQuestions = async () => {
      // Pakai endpoint service-role, BUKAN browser client + RLS langsung —
      // supaya tidak rapuh terhadap masalah evaluasi RLS (lihat catatan di
      // supabase/migrations/0028_fix_app_role_row_security_regression.sql).
      // Sebelumnya, kuis lama bisa tampak "tidak ditemukan" di halaman ini
      // meski datanya ada di database dan benar milik guru tersebut.
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setFetchError('Sesi habis. Silakan login ulang.');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/teacher/quiz/${params.quizId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setFetchError(data.error ?? 'Kuis tidak ditemukan atau Anda tidak memiliki akses.');
        setLoading(false);
        return;
      }

      setQuiz(data.quiz);
      setQuestions(data.questions ?? []);
      setLoading(false);
    };

    fetchQuizAndQuestions();
  }, [params.quizId]);

  if (loading) return <p className="py-10 text-center text-ink/50">Memuat kuis...</p>;
  if (fetchError) return <p className="py-10 text-center text-red-500">{fetchError}</p>;
  if (!quiz) return <p className="py-10 text-center text-ink/50">Kuis tidak ditemukan atau Anda tidak memiliki akses.</p>;

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Edit Kuis</h1>
        <p className="text-sm text-ink/60">Perbarui informasi dan daftar pertanyaan untuk kuis ini.</p>
      </div>
      <QuizForm isEdit={true} initialQuiz={quiz} initialQuestions={questions} />
    </div>
  );
}
