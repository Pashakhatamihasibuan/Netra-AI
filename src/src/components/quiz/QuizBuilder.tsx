'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { useAppStore } from '@/store/useAppStore';

interface DraftQuestion {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

const emptyQuestion: DraftQuestion = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
};

export function QuizBuilder() {
  const user = useAppStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ ...emptyQuestion }]);
  const [savedQuizId, setSavedQuizId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateQuestion(idx: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, { ...emptyQuestion }]);
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  async function saveQuiz() {
    if (!user || !title.trim() || !subject.trim() || !classLevel) return;
    setSaving(true);

    try {
      const res = await fetch('/api/teacher/quiz/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          subject,
          class_level: classLevel,
          questions: questions
            .filter((q) => q.question.trim())
            .map((q, i) => ({ ...q, order_index: i })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan.');
      setSavedQuizId(data.quizId);
    } catch (err: any) {
      console.error('QuizBuilder save error:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (savedQuizId) {
    return (
      <Card>
        <CardTitle>Kuis tersimpan</CardTitle>
        <p className="text-sm text-ink/70">"{title}" sudah bisa dikerjakan siswa.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Buat kuis baru</CardTitle>

      <input
        className="w-full rounded-xl2 border border-teal-50 px-4 py-2 mb-2"
        placeholder="Judul kuis"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full rounded-xl2 border border-teal-50 px-4 py-2 mb-4"
        placeholder="Deskripsi singkat"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <input
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2"
          placeholder="Mata pelajaran"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <select
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2"
          value={classLevel}
          onChange={(e) => setClassLevel(e.target.value)}
        >
          <option value="">Pilih kelas...</option>
          <option value="3">3 SD</option>
          <option value="4">4 SD</option>
          <option value="5">5 SD</option>
          <option value="6">6 SD</option>
        </select>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="rounded-xl2 border border-teal-50 p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-ink/70">Soal {idx + 1}</span>
              {questions.length > 1 && (
                <button onClick={() => removeQuestion(idx)} className="text-xs text-alertred-600">
                  Hapus
                </button>
              )}
            </div>
            <input
              className="w-full rounded-xl2 border border-teal-50 px-3 py-2 mb-2"
              placeholder="Pertanyaan"
              value={q.question}
              onChange={(e) => updateQuestion(idx, { question: e.target.value })}
            />
            {(['A', 'B', 'C', 'D'] as const).map((opt) => (
              <div key={opt} className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name={`correct-${idx}`}
                  checked={q.correct_answer === opt}
                  onChange={() => updateQuestion(idx, { correct_answer: opt })}
                />
                <input
                  className="flex-1 rounded-xl2 border border-teal-50 px-3 py-1.5 text-sm"
                  placeholder={`Pilihan ${opt}`}
                  value={q[`option_${opt.toLowerCase()}` as 'option_a']}
                  onChange={(e) => updateQuestion(idx, { [`option_${opt.toLowerCase()}`]: e.target.value })}
                />
              </div>
            ))}
            <p className="text-xs text-ink/50 mt-1">Pilih radio button di jawaban yang benar.</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-4">
        <Button variant="ghost" onClick={addQuestion}>
          + Tambah soal
        </Button>
        <Button onClick={saveQuiz} disabled={saving || !title.trim() || !subject.trim() || !classLevel}>
          {saving ? 'Menyimpan...' : 'Simpan kuis'}
        </Button>
      </div>
    </Card>
  );
}
