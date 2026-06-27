import { QuizForm } from '@/components/quiz/QuizForm';

export default function NewQuizPage() {
  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Buat Kuis Baru</h1>
        <p className="text-sm text-ink/60">Tambahkan judul dan pertanyaan untuk diujikan kepada siswa.</p>
      </div>
      <QuizForm isEdit={false} />
    </div>
  );
}
