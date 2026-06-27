/**
 * Form registrasi siswa — FIXED VERSION
 *
 * Bug sebelumnya: komponen memanggil /api/admin/class-sections (butuh auth admin)
 * atau langsung query Supabase client dengan anon key yang diblok RLS.
 *
 * Fix: gunakan /api/class-sections (public endpoint, pakai service role di server)
 * lewat hook useClassSections.
 */
'use client';

import { useState } from 'react';
import { useClassSections } from '@/hooks/useClassSections';

const GRADE_OPTIONS = [
  { value: '3', label: 'Kelas 3 SD' },
  { value: '4', label: 'Kelas 4 SD' },
  { value: '5', label: 'Kelas 5 SD' },
  { value: '6', label: 'Kelas 6 SD' },
];

interface Props {
  onSuccess?: () => void;
}

export function StudentRegisterForm({ onSuccess }: Props) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('3');
  const [classSectionId, setClassSectionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ FIX: gunakan hook yang memanggil public API /api/class-sections
  const { sections, loading: sectionsLoading, error: sectionsError } = useClassSections(grade);

  // Reset pilihan kelas saat grade berubah
  function handleGradeChange(newGrade: string) {
    setGrade(newGrade);
    setClassSectionId('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Nama lengkap wajib diisi.'); return; }
    if (!classSectionId) { setError('Pilih kelas terlebih dahulu.'); return; }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), classSectionId, gradeLevel: grade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal mendaftar.');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nama Lengkap */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nama Lengkap
        </label>
        <input
          type="text"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          placeholder="Contoh: Budi Santoso"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Tingkat Kelas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tingkat Kelas
        </label>
        <select
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={grade}
          onChange={(e) => handleGradeChange(e.target.value)}
        >
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* Kelas Spesifik */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Kelas Spesifik
        </label>

        {sectionsLoading ? (
          <div className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 bg-gray-50">
            ⏳ Memuat daftar kelas...
          </div>
        ) : sectionsError ? (
          <div className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600 bg-red-50">
            ❌ Gagal memuat kelas: {sectionsError}
          </div>
        ) : sections.length === 0 ? (
          // ✅ Pesan yang jelas saat belum ada kelas
          <div className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm text-amber-700 bg-amber-50">
            ⚠️ Belum ada kelas {grade} SD yang dibuka. Hubungi Kepala Sekolah.
          </div>
        ) : (
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={classSectionId}
            onChange={(e) => setClassSectionId(e.target.value)}
            required
          >
            <option value="">— Pilih kelas —</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          ❌ {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || sectionsLoading || sections.length === 0}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 text-sm transition-colors"
      >
        {submitting ? '⏳ Mendaftar...' : 'Daftar Sekarang'}
      </button>
    </form>
  );
}
