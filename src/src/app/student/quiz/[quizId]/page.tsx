'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QuizPlayer } from '@/components/quiz/QuizPlayer';
import { Leaderboard } from '@/components/quiz/Leaderboard';
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';

export default function StudentQuizPage() {
  const params = useParams<{ quizId: string }>();
  const [title, setTitle] = useState<string>('Kuis');

  useEffect(() => {
    const supabase = createClient();
    // Gagal di sini cuma membuat judul fallback ke 'Kuis' (lihat default
    // state di atas) — tidak menghalangi siswa mengerjakan kuis, karena
    // soal & jawaban diambil QuizPlayer lewat endpoint terpisah, bukan
    // dari query ini.
    supabase
      .from('quizzes')
      .select('title')
      .eq('id', params.quizId)
      .maybeSingle()
      .then(({ data }) => data && setTitle(data.title));
  }, [params.quizId]);

  return (
    <div className="flex flex-col gap-6">
      {/* Widget kamera mengambang pojok kanan atas — tetap terlihat saat
          kuis masuk fullscreen karena fullscreen target-nya documentElement,
          jadi seluruh halaman (termasuk widget ini) ikut masuk subtree fullscreen. */}
      <MonitoringPanel compact />

      <div className="grid sm:grid-cols-3 gap-6">
        <div className="sm:col-span-2 relative">
          <QuizPlayer quizId={params.quizId} quizTitle={title} secondsPerQuestion={30} />
        </div>
        <Leaderboard quizId={params.quizId} />
      </div>
    </div>
  );
}
