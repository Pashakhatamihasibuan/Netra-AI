'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
    setLoading(true);
    setError(null);
    try {
      const [secRes, teacherRes] = await Promise.all([
        fetch('/api/admin/class-sections').then(async (r) => {
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            console.error('[ClassSectionManager] Invalid JSON from /api/admin/class-sections:', text);
            return {};
          }
        }),
        fetch('/api/admin/teachers').then(async (r) => {
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            return {};
          }
        }),
      ]);

      // ── BUG FIX: API bisa mengembalikan berbagai key ──
      // Cek semua kemungkinan key: sections, data, items, rows, classes
      const rawSections: ClassSection[] =
        secRes?.sections ??
        secRes?.data ??
        secRes?.classes ??
        secRes?.items ??
        secRes?.rows ??
        [];

      // Normalisasi class_level ke string (jika DB kembalikan integer)
      const normalized = rawSections.map((s) => ({
        ...s,
        class_level: String(s.class_level),
        student_count: Number(s.student_count ?? 0),
        homeroom_teacher_name: s.homeroom_teacher_name ?? null,
      }));

      setSections(normalized);

      const rawTeachers: TeacherOption[] =
        teacherRes?.teachers ??
        teacherRes?.data ??
        teacherRes?.items ??
        [];
      setTeachers(rawTeachers);

      // Debug info untuk development
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(`API mengembalikan ${rawSections.length} kelas. Keys: ${Object.keys(secRes).join(', ')}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data.';
      setError(`❌ Gagal memuat data: ${msg}`);
      console.error('[ClassSectionManager] load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newSection.trim()) return;
    setCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/class-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classLevel: newGrade, section: newSection.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat kelas.');

      // Optimistic update dengan normalisasi class_level
      const newSec: ClassSection = {
        id: data.section?.id ?? data.id ?? crypto.randomUUID(),
        class_level: String(newGrade),
        section: newSection.trim().toUpperCase(),
        academic_year: data.section?.academic_year ?? data.academic_year ?? new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
        homeroom_teacher_id: null,
        homeroom_teacher_name: null,
        student_count: 0,
      };
      setSections((prev) => [...prev, newSec].sort((a, b) => {
        if (a.class_level !== b.class_level) return a.class_level.localeCompare(b.class_level);
        return a.section.localeCompare(b.section);
      }));
      setSuccessMsg(`✅ Kelas ${newGrade} SD ${newSection.trim().toUpperCase()} berhasil dibuat!`);
      setNewSection('');
      // Re-fetch untuk sinkron penuh dengan DB
      setTimeout(() => load(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setCreating(false);
    }
  }

  async function assignTeacher(sectionId: string, teacherId: string) {
    // Optimistic update dulu agar UI responsif
    const teacherName = teacherId ? teachers.find((t) => t.id === teacherId)?.name ?? null : null;
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, homeroom_teacher_id: teacherId || null, homeroom_teacher_name: teacherName }
        : s
    ));

    const res = await fetch(`/api/admin/class-sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeroomTeacherId: teacherId || null }),
    });

    if (res.ok) {
      // Re-fetch dari DB untuk memastikan data benar-benar tersimpan (anti race condition)
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Gagal menugaskan wali kelas: ${data.error ?? 'Unknown error'}`);
      // Rollback optimistic update
      await load();
    }
  }

  async function removeTeacher(sectionId: string, sectionLabel: string) {
    if (!confirm(`Lepas wali kelas dari ${sectionLabel}? Kelas tetap ada, hanya wali kelasnya dikosongkan.`)) return;

    // Optimistic update
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, homeroom_teacher_id: null, homeroom_teacher_name: null } : s
    ));

    const res = await fetch(`/api/admin/class-sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeroomTeacherId: null }),
    });

    // Selalu re-fetch dari DB untuk konfirmasi
    await load();

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Gagal melepas wali kelas: ${data.error ?? `HTTP ${res.status}`}`);
    }
  }

  async function deleteSection(sectionId: string, label: string) {
    if (!confirm(`Hapus kelas ${label}? Siswa di kelas ini akan menjadi belum berkelas (data tetap aman). Gunakan ini untuk reset di tahun ajaran baru.`)) return;
    const res = await fetch(`/api/admin/class-sections/${sectionId}`, { method: 'DELETE' });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`Gagal menghapus kelas: ${data.error ?? `HTTP ${res.status}`}`);
    }
  }

  // Normalisasi: pastikan filter pakai String() untuk handle integer dari DB
  const grouped = GRADE_OPTIONS.map((g) => ({
    grade: g,
    items: sections
      .filter((s) => String(s.class_level) === g)
      .sort((a, b) => a.section.localeCompare(b.section)),
  }));

  return (
    <div className="space-y-5">
      {/* Form tambah kelas */}
      <Card>
        <CardTitle>➕ Tambah Kelas Baru</CardTitle>
        <form onSubmit={handleCreate} className="flex gap-2 mt-3 flex-wrap items-end">
          <div>
            <label className="block text-xs text-ink/50 mb-1">Tingkat</label>
            <select
              className="rounded-xl2 border border-teal-50 px-3 py-2 text-sm bg-white"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
            >
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g} SD</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-ink/50 mb-1">Nama Section</label>
            <input
              className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm uppercase"
              placeholder="A, B, atau C"
              value={newSection}
              onChange={(e) => setNewSection(e.target.value.toUpperCase())}
              required
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? '⏳ Membuat...' : '+ Tambah Kelas'}
          </Button>
        </form>
        {successMsg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2 mt-2">{successMsg}</p>}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2 mt-2">{error}</p>}
        {/* Debug hanya di development */}
        {debugInfo && process.env.NODE_ENV === 'development' && (
          <p className="text-xs text-gray-400 mt-1 font-mono">{debugInfo}</p>
        )}
      </Card>

      {/* Daftar kelas */}
      {loading ? (
        <div className="text-sm text-ink/40 flex items-center gap-2 p-4">
          <span className="animate-spin">⏳</span> Memuat data kelas...
        </div>
      ) : (
        grouped.map(({ grade, items }) => (
          <Card key={grade}>
            <div className="flex items-center justify-between">
              <CardTitle>Kelas {grade} SD</CardTitle>
              <Badge tone={items.length > 0 ? 'safe' : 'neutral'}>{items.length} kelas</Badge>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-ink/40 mt-2 bg-amber-50 border border-amber-100 rounded-xl2 px-3 py-2">
                ⚠️ Belum ada kelas untuk tingkat {grade} SD. Tambahkan di atas.
              </p>
            ) : (
              <div className="space-y-2 mt-3">
                {items.map((s) => (
                  <div key={s.id} className="rounded-xl2 border border-teal-50 bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">
                          🏫 Kelas {s.class_level} SD {s.section}
                        </p>
                        <p className="text-xs text-ink/40 mt-0.5">
                          T.A. {s.academic_year} · {s.student_count} siswa
                        </p>
                        {s.homeroom_teacher_name ? (
                          <p className="text-xs text-teal-700 font-medium mt-1">
                            👨‍🏫 Wali Kelas: {s.homeroom_teacher_name}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1">⚠️ Belum ada wali kelas</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          className="rounded-xl2 border border-teal-50 px-3 py-1.5 text-xs bg-white"
                          value={s.homeroom_teacher_id ?? ''}
                          onChange={(e) => assignTeacher(s.id, e.target.value)}
                        >
                          <option value="">— Tugaskan wali kelas —</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        {s.homeroom_teacher_id && (
                          <button
                            onClick={() => removeTeacher(s.id, `${s.class_level} SD ${s.section}`)}
                            className="text-xs font-medium text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-md transition-colors"
                          >
                            👋 Lepas
                          </button>
                        )}
                        <button
                          onClick={() => deleteSection(s.id, `${s.class_level} SD ${s.section}`)}
                          className="text-xs font-medium text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          🗑 Hapus
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
