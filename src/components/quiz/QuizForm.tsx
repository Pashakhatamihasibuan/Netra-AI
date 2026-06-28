"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import type { Quiz, Question } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { useClassSections } from "@/hooks/useClassSections";
import { MathEquationInsert, MathText } from "@/components/shared/EquationEditor";
import { useT } from "@/i18n/useT";

interface QuizFormProps { initialQuiz?: Quiz; initialQuestions?: Question[]; isEdit?: boolean }

export function QuizForm({ initialQuiz, initialQuestions, isEdit }: QuizFormProps) {
  const { t } = useT();
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const { sections: classSections, loading: sectionsLoading } = useClassSections();
  const gradeOptions = Array.from(new Map(classSections.map((cs) => [cs.class_level, cs.class_level])).values()).sort((a, b) => Number(a) - Number(b));

  const [title, setTitle]                   = useState(initialQuiz?.title ?? "");
  const [description, setDescription]       = useState(initialQuiz?.description ?? "");
  const [subject, setSubject]               = useState(initialQuiz?.subject ?? "");
  const [classLevel, setClassLevel]         = useState(initialQuiz?.class_level ?? "");
  const [targetSectionId, setTargetSectionId] = useState(initialQuiz?.target_section_id ?? "");
  const sectionsForGrade = classSections.filter((cs) => cs.class_level === classLevel);
  const [questions, setQuestions] = useState<Partial<Question>[]>(initialQuestions ?? []);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  function addQuestion() {
    setQuestions([...questions, { question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A", image_url: null, order_index: questions.length }]);
  }

  async function handleImageUpload(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Ukuran gambar maksimal 2MB."); return; }
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${user?.id}/${fileName}`;
      const { error } = await supabase.storage.from("quiz_images").upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("quiz_images").getPublicUrl(filePath);
      updateQuestion(index, "image_url", publicUrl);
    } catch (err: any) { alert("Gagal mengunggah gambar: " + err.message); }
  }

  function updateQuestion(index: number, field: keyof Question, value: string | number | null) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order_index: i })));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!subject.trim()) { setError(t('quiz', 'subject_label') + " " + t('materials', 'err_subject')); return; }
    if (!classLevel) { setError(t('materials', 'err_grade')); return; }
    setError(null); setSaving(true);
    try {
      const res = await fetch("/api/teacher/quiz/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quizId: isEdit ? initialQuiz?.id : undefined, title, description, subject, class_level: classLevel, target_section_id: targetSectionId || null, questions: questions.map((q, i) => ({ question: q.question, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_answer: q.correct_answer, image_url: q.image_url ?? null, order_index: i })) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('common', 'error'));
      window.location.href = '/teacher/dashboard';
    } catch (err: any) { setError(err.message || t('common', 'error')); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-20">
      <Card>
        <CardTitle>{isEdit ? t('quiz', 'edit_title') : t('quiz', 'create_title')}</CardTitle>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">{t('quiz', 'title_label')}</label>
            <input required className="w-full rounded-xl2 border border-teal-50 px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('quiz', 'title_ph')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">{t('quiz', 'desc_label')}</label>
            <textarea className="w-full rounded-xl2 border border-teal-50 px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">{t('quiz', 'subject_label')}</label>
              <input required className="w-full rounded-xl2 border border-teal-50 px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('quiz', 'subject_ph')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">{t('quiz', 'target_class')}</label>
              <select required className="w-full rounded-xl2 border border-teal-50 px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none" value={classLevel} onChange={(e) => { setClassLevel(e.target.value); setTargetSectionId(""); }} disabled={sectionsLoading}>
                <option value="">{sectionsLoading ? t('quiz', 'loading_grades') : t('quiz', 'choose_grade')}</option>
                {gradeOptions.map((grade) => <option key={grade} value={grade}>{t('dashboard', `grade_${grade}`)}</option>)}
              </select>
              <p className="text-xs text-ink/40 mt-1">{t('quiz', 'auto_visible')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">{t('quiz', 'specific_class')}</label>
              <select className="w-full rounded-xl2 border border-teal-50 px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none" value={targetSectionId} onChange={(e) => setTargetSectionId(e.target.value)} disabled={!classLevel || sectionsLoading}>
                <option value="">{t('quiz', 'all_classes')} {classLevel ? `${classLevel} SD` : ""}</option>
                {sectionsForGrade.map((cs) => <option key={cs.id} value={cs.id}>{cs.label ?? `${cs.class_level} SD ${cs.section}`}</option>)}
              </select>
              <p className="text-xs text-ink/40 mt-1">{t('quiz', 'specific_hint')}</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="font-display font-semibold text-lg flex items-center justify-between">
          {t('quiz', 'questions')}
          <Button type="button" variant="secondary" onClick={addQuestion} size="sm">{t('quiz', 'add_question')}</Button>
        </h3>
        {questions.length === 0 ? (
          <div className="text-center py-8 text-ink/40 border-2 border-dashed border-teal-50 rounded-xl2">{t('quiz', 'no_questions')}</div>
        ) : (
          questions.map((q, i) => (
            <Card key={i} className="relative pt-8">
              <button type="button" onClick={() => removeQuestion(i)} className="absolute top-3 right-3 text-alertred-600 hover:bg-alertred-50 p-2 rounded-lg text-sm">{t('quiz', 'remove')}</button>
              <div className="absolute top-4 left-5 text-sm font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-md">{t('quiz', 'question_num')}{i + 1}</div>
              <div className="space-y-4 mt-2">
                <div>
                  <textarea required className="w-full rounded-xl2 border border-teal-50 px-3 py-2 focus:ring-2 focus:ring-teal-400 focus:outline-none font-medium" value={q.question} onChange={(e) => updateQuestion(i, "question", e.target.value)} placeholder={t('quiz', 'question_ph')} rows={2} />
                  <MathEquationInsert onInsert={(latex) => updateQuestion(i, "question", (q.question ?? "") + " $" + latex + "$")} />
                </div>
                <div className="mt-2">
                  <label className="text-sm font-medium text-ink/70 block mb-1">{t('quiz', 'image_label')}</label>
                  {q.image_url && (
                    <div className="mb-2 relative inline-block">
                      <img src={q.image_url} alt="" loading="lazy" decoding="async" className="h-32 rounded-lg object-cover border border-teal-100" />
                      <button type="button" onClick={() => updateQuestion(i, "image_url", null)} className="absolute top-1 right-1 bg-alertred-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-alertred-600">✕</button>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(i, e)} className="block w-full text-sm text-ink/70 file:mr-4 file:py-2 file:px-4 file:rounded-xl2 file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const fieldName = `option_${opt.toLowerCase()}` as keyof Question;
                    return (
                      <div key={opt} className="flex items-center gap-2">
                        <label className="shrink-0 font-bold w-6 text-center">{opt}.</label>
                        <input required className="flex-1 rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none" value={String(q[fieldName] || "")} onChange={(e) => updateQuestion(i, fieldName, e.target.value)} placeholder={`${opt}`} />
                      </div>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-teal-50 flex items-center gap-3">
                  <label className="text-sm font-medium text-ink/70">{t('quiz', 'answer_key')}</label>
                  <select className="rounded-xl2 border border-teal-50 px-3 py-1.5 text-sm font-bold focus:ring-2 focus:ring-teal-400 focus:outline-none" value={q.correct_answer} onChange={(e) => updateQuestion(i, "correct_answer", e.target.value)}>
                    <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {error && <div className="bg-alertred-50 border border-alertred-200 text-alertred-700 px-4 py-3 rounded-xl2 text-sm">{error}</div>}

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>{t('quiz', 'cancel')}</Button>
        <Button type="submit" disabled={saving || questions.length === 0}>{saving ? t('quiz', 'saving') : t('quiz', 'save')}</Button>
      </div>
    </form>
  );
}
