'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useT } from '@/i18n/useT';

interface ClassSection {
  id: string;
  class_level: string;
  section: string;
  academic_year: string;
  homeroom_teacher_id: string | null;
  homeroom_teacher_name: string | null;
  student_count: number;
}

interface TeacherOption { id: string; name: string; teacher_type: string | null; homeroom_class: string | null }

const GRADE_OPTIONS = ['3', '4', '5', '6'];

export function ClassSectionManager() {
  const { t, lang } = useT();
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGrade, setNewGrade] = useState('3');
  const [newSection, setNewSection] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [secRes, teacherRes] = await Promise.all([
        fetch('/api/admin/class-sections').then(async (r) => { const text = await r.text(); try { return JSON.parse(text); } catch { return {}; } }),
        fetch('/api/admin/teachers').then(async (r) => { const text = await r.text(); try { return JSON.parse(text); } catch { return {}; } }),
      ]);
      const rawSections: ClassSection[] = secRes?.sections ?? secRes?.data ?? secRes?.classes ?? secRes?.items ?? secRes?.rows ?? [];
      const normalized = rawSections.map((s) => ({ ...s, class_level: String(s.class_level), student_count: Number(s.student_count ?? 0), homeroom_teacher_name: s.homeroom_teacher_name ?? null }));
      setSections(normalized);
      setTeachers(teacherRes?.teachers ?? teacherRes?.data ?? teacherRes?.items ?? []);
      if (process.env.NODE_ENV === 'development') setDebugInfo(`API ${lang === 'en' ? 'returned' : 'mengembalikan'} ${rawSections.length} ${lang === 'en' ? 'classes' : 'kelas'}. Keys: ${Object.keys(secRes).join(', ')}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common', 'error');
      setError(`❌ ${t('admin', 'create_err')}: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.trim()) return;
    setCreating(true); setError(null); setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/class-sections', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classLevel: newGrade, section: newSection.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('admin', 'create_err'));
      const newSec: ClassSection = {
        id: data.section?.id ?? data.id ?? crypto.randomUUID(),
        class_level: String(newGrade), section: newSection.trim().toUpperCase(),
        academic_year: data.section?.academic_year ?? data.academic_year ?? new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
        homeroom_teacher_id: null, homeroom_teacher_name: null, student_count: 0,
      };
      setSections((prev) => [...prev, newSec].sort((a, b) => a.class_level !== b.class_level ? a.class_level.localeCompare(b.class_level) : a.section.localeCompare(b.section)));
      setSuccessMsg(`✅ ${lang === 'en' ? `Grade ${newGrade} Class ${newSection.trim().toUpperCase()} created!` : `Kelas ${newGrade} SD ${newSection.trim().toUpperCase()} berhasil dibuat!`}`);
      setNewSection('');
      setTimeout(() => load(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common', 'error'));
    } finally {
      setCreating(false);
    }
  }

  async function assignTeacher(sectionId: string, teacherId: string) {
    const teacherName = teacherId ? teachers.find((t) => t.id === teacherId)?.name ?? null : null;
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, homeroom_teacher_id: teacherId || null, homeroom_teacher_name: teacherName } : s));
    const res = await fetch(`/api/admin/class-sections/${sectionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ homeroomTeacherId: teacherId || null }) });
    if (res.ok) { await load(); } else {
      const data = await res.json().catch(() => ({}));
      alert(`${t('admin', 'assign_err')}${data.error ?? 'Unknown error'}`);
      await load();
    }
  }

  async function removeTeacher(sectionId: string, sectionLabel: string) {
    if (!confirm(t('admin', 'remove_confirm').replace('{label}', sectionLabel))) return;
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, homeroom_teacher_id: null, homeroom_teacher_name: null } : s));
    const res = await fetch(`/api/admin/class-sections/${sectionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ homeroomTeacherId: null }) });
    await load();
    if (!res.ok) { const data = await res.json().catch(() => ({})); alert(`${t('admin', 'remove_err')}${data.error ?? `HTTP ${res.status}`}`); }
  }

  async function deleteSection(sectionId: string, label: string) {
    if (!confirm(t('admin', 'delete_confirm').replace('{label}', label))) return;
    const res = await fetch(`/api/admin/class-sections/${sectionId}`, { method: 'DELETE' });
    if (res.ok) { setSections((prev) => prev.filter((s) => s.id !== sectionId)); }
    else { const data = await res.json().catch(() => ({})); alert(`${t('admin', 'delete_err')}${data.error ?? `HTTP ${res.status}`}`); }
  }

  const grouped = GRADE_OPTIONS.map((g) => ({
    grade: g,
    items: sections.filter((s) => String(s.class_level) === g).sort((a, b) => a.section.localeCompare(b.section)),
  }));

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle>{t('admin', 'add_class_title')}</CardTitle>
        <form onSubmit={handleCreate} className="flex gap-2 mt-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-ink/50 mb-1">{t('admin', 'grade_label')}</label>
            <select className="rounded-xl2 border border-teal-50 px-3 py-2 text-sm bg-white" value={newGrade} onChange={(e) => setNewGrade(e.target.value)}>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g} SD</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-ink/50 mb-1">{t('admin', 'section_label')}</label>
            <input className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm uppercase" placeholder={t('admin', 'section_ph')} value={newSection} onChange={(e) => setNewSection(e.target.value.toUpperCase())} required />
          </div>
          <Button type="submit" disabled={creating}>{creating ? t('admin', 'adding') : t('admin', 'add_btn')}</Button>
        </form>
        {successMsg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2 mt-2">{successMsg}</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2 mt-2">{error}</p>}
        {debugInfo && process.env.NODE_ENV === 'development' && <p className="text-xs text-gray-400 mt-1 font-mono">{debugInfo}</p>}
      </Card>

      {loading ? (
        <div className="text-sm text-ink/40 flex items-center gap-2 p-4"><span className="animate-spin">⏳</span> {t('admin', 'loading_classes')}</div>
      ) : (
        grouped.map(({ grade, items }) => (
          <Card key={grade}>
            <div className="flex items-center justify-between">
              <CardTitle>{t('admin', 'class_title').replace('{grade}', grade)}</CardTitle>
              <Badge tone={items.length > 0 ? 'safe' : 'neutral'}>{t('admin', 'class_count').replace('{n}', String(items.length))}</Badge>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-ink/40 mt-2 bg-amber-50 border border-amber-100 rounded-xl2 px-3 py-2">
                {t('admin', 'no_class').replace('{grade}', grade)}
              </p>
            ) : (
              <div className="space-y-2 mt-3">
                {items.map((s) => (
                  <div key={s.id} className="rounded-xl2 border border-teal-50 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">{t('admin', 'class_label').replace('{level}', s.class_level).replace('{section}', s.section)}</p>
                        <p className="text-xs text-ink/40 mt-0.5">{t('admin', 'academic_year')}{s.academic_year} · {t('admin', 'student_count').replace('{n}', String(s.student_count))}</p>
                        {s.homeroom_teacher_name ? (
                          <p className="text-xs text-teal-700 font-medium mt-1">{t('admin', 'homeroom_set')}{s.homeroom_teacher_name}</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1">{t('admin', 'no_homeroom')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select className="rounded-xl2 border border-teal-50 px-3 py-1.5 text-xs bg-white" value={s.homeroom_teacher_id ?? ''} onChange={(e) => assignTeacher(s.id, e.target.value)}>
                          <option value="">{t('admin', 'assign_ph')}</option>
                          {teachers.map((te) => <option key={te.id} value={te.id}>{te.name}</option>)}
                        </select>
                        {s.homeroom_teacher_id && (
                          <button onClick={() => removeTeacher(s.id, `${s.class_level} SD ${s.section}`)} className="text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-md transition-colors">
                            {t('admin', 'remove_btn')}
                          </button>
                        )}
                        <button onClick={() => deleteSection(s.id, `${s.class_level} SD ${s.section}`)} className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-md transition-colors">
                          {t('admin', 'delete_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
