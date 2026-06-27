'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeHealth } from '@/hooks/useRealtimeHealth';
import { Card, CardTitle } from '@/components/ui/Card';

interface HealthRecordRow {
  health_score: number;
  eye_distance_score: number;
  posture_score: number;
  blink_score: number;
  screen_time_score: number;
  created_at: string;
}

// Works for any caller — self, teacher, or parent — since RLS on
// health_records (not this component) is what actually decides whether the
// row comes back.
//
// BUG FIX: sebelumnya fetch HANYA sekali saat mount ([userId] sebagai satu-
// satunya dependency). Akibatnya begitu siswa mengakhiri sesi belajar dan
// health_records baris baru ter-insert, card ini tetap menampilkan skor sesi
// SEBELUMNYA sampai halaman di-reload manual — tidak "realtime". Sekarang
// pakai pola yang sama dengan StudentTable.tsx (dashboard guru): re-fetch
// lewat useRealtimeHealth setiap ada INSERT baru di health_records.
export function HealthScoreCard({ userId, label }: { userId: string; label?: string }) {
  const [record, setRecord]   = useState<HealthRecordRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const supabase = createClient();
    supabase
      .from('health_records')
      .select('health_score, eye_distance_score, posture_score, blink_score, screen_time_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[HealthScoreCard] fetch error:', error.message);
        setRecord(data);
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useRealtimeHealth(load);

  if (loading) {
    return (
      <Card>
        <CardTitle>{label ?? 'Health score'}</CardTitle>
        <p className="text-sm text-ink/50">Memuat...</p>
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <CardTitle>{label ?? 'Health score'}</CardTitle>
        <p className="text-sm text-ink/50">Belum ada sesi belajar tercatat.</p>
      </Card>
    );
  }

  const rows: Array<[string, number]> = [
    ['Jarak mata', record.eye_distance_score],
    ['Postur', record.posture_score],
    ['Kedipan', record.blink_score],
    ['Screen time', record.screen_time_score],
  ];

  return (
    <Card>
      <CardTitle>{label ?? 'Health score'}</CardTitle>
      <p className="text-4xl font-display font-bold text-teal-600 mb-3">{record.health_score}</p>
      <div className="space-y-1.5">
        {rows.map(([name, score]) => (
          <div key={name} className="flex items-center gap-2 text-sm">
            <span className="w-28 text-ink/70">{name}</span>
            <div className="flex-1 h-2 rounded-full bg-cream overflow-hidden">
              <div className="h-full bg-teal-400" style={{ width: `${score}%` }} />
            </div>
            <span className="w-8 text-right text-ink/60">{score}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
