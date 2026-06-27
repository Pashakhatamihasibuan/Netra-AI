/**
 * Hook untuk mengambil daftar kelas yang tersedia.
 * Dipakai di form registrasi siswa, QuizForm, MaterialManager, dan
 * komponen lain yang butuh daftar kelas.
 *
 * Fitur:
 * - Auto-polling setiap 30 detik → kelas baru dari Kepala Sekolah
 *   langsung muncul tanpa reload halaman.
 * - `refetch()` untuk trigger manual (misal: setelah user buka tab baru).
 * - Menghindari hammer DB: debounce grade change + skip fetch saat tab tersembunyi.
 *
 * Contoh:
 *   const { sections, loading, error, refetch } = useClassSections(gradeLevel);
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface ClassSectionOption {
  id: string;
  class_level: string;
  section: string;
  academic_year: string;
  homeroom_teacher_name?: string | null;
  label: string; // "3 SD A"
}

const POLL_INTERVAL_MS = 30_000; // 30 detik

export function useClassSections(grade?: string | null) {
  const [sections, setSections] = useState<ClassSectionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simpan grade di ref agar closure di setInterval selalu pakai nilai terbaru
  const gradeRef = useRef(grade);
  useEffect(() => { gradeRef.current = grade; }, [grade]);

  const fetchSections = useCallback(async (gradeValue?: string | null, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const g = gradeValue !== undefined ? gradeValue : gradeRef.current;
    const url = g
      ? `/api/class-sections?grade=${encodeURIComponent(g)}`
      : '/api/class-sections';

    try {
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      const json = JSON.parse(text);
      const raw: ClassSectionOption[] =
        json?.sections ?? json?.data ?? json?.classes ?? json?.items ?? [];
      setSections(raw);
    } catch (err) {
      // Jangan timpa data lama saat polling silent gagal
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data kelas.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Fetch pertama kali & setiap kali grade berubah
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await fetchSections(grade);
    };
    run();

    // Polling 30 detik — silent agar tidak flip loading spinner
    const timerId = setInterval(() => {
      if (!document.hidden) {
        fetchSections(gradeRef.current, true);
      }
    }, POLL_INTERVAL_MS);

    // Refetch saat tab kembali aktif (user balik dari tab lain)
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchSections(gradeRef.current, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [grade, fetchSections]);

  const refetch = useCallback(() => fetchSections(gradeRef.current, false), [fetchSections]);

  return { sections, loading, error, refetch };
}
