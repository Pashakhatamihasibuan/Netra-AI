'use client';

// src/components/parent/ClassOverview.tsx
// Tampilan kelas anak: nama kelas, wali kelas, dan ringkasan nilai/health
// score ANAK SENDIRI saja. TIDAK menampilkan nama atau data siswa lain —
// lihat catatan privasi di src/app/api/parent/class-overview/route.ts.

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface MeInfo {
  name: string;
  quiz_count: number;
  avg_score: number | null;
  latest_health_score: number | null;
}

interface ClassInfo {
  id: string;
  name: string;
  teacher_name: string | null;
  student_count: number;
}

function scoreTone(score: number | null): 'safe' | 'warning' | 'alert' | 'neutral' {
  if (score === null) return 'neutral';
  if (score >= 80) return 'safe';
  if (score >= 60) return 'warning';
  return 'alert';
}

export function ClassOverview({ studentId }: { studentId: string }) {
  const [cls, setCls] = useState<ClassInfo | null>(null);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/class-overview?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => {
        setCls(d.class ?? null);
        setMe(d.me ?? null);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-gray-400 text-sm">
        <div className="w-5 h-5 border-2 border-[#6D5AE6] border-t-transparent rounded-full animate-spin" />
        Memuat data kelas…
      </div>
    );
  }

  if (!cls) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🏫</p>
          <p className="text-sm text-gray-400">Anak ini belum bergabung ke kelas manapun.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="mb-1">🏫 Kelas {cls.name}</CardTitle>
        <p className="text-sm text-gray-500">
          Wali kelas: {cls.teacher_name ?? 'belum ditugaskan'} · {cls.student_count} siswa
        </p>
        <p className="text-xs text-gray-400 mt-1.5">
          Demi privasi siswa lain, data teman sekelas tidak ditampilkan di sini.
        </p>
      </Card>

      <Card>
        <CardTitle>Ringkasan {me?.name ?? 'Anak Kamu'}</CardTitle>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="text-center rounded-2xl bg-gray-50 border border-gray-100 py-3">
            <p className="text-2xl font-bold font-display text-[#6D5AE6]">{me?.quiz_count ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">Kuis dikerjakan</p>
          </div>
          <div className="text-center rounded-2xl bg-gray-50 border border-gray-100 py-3">
            {me?.avg_score != null ? (
              <Badge tone={scoreTone(me.avg_score)}>{me.avg_score}</Badge>
            ) : (
              <span className="text-gray-300 text-sm">—</span>
            )}
            <p className="text-xs text-gray-400 mt-1.5">Rata-rata nilai</p>
          </div>
          <div className="text-center rounded-2xl bg-gray-50 border border-gray-100 py-3">
            {me?.latest_health_score != null ? (
              <Badge tone={scoreTone(me.latest_health_score)}>{me.latest_health_score}</Badge>
            ) : (
              <span className="text-gray-300 text-sm">—</span>
            )}
            <p className="text-xs text-gray-400 mt-1.5">Health score terakhir</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
