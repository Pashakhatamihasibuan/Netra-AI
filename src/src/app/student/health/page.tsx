'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeHealth } from '@/hooks/useRealtimeHealth';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/store/useAppStore';
import { formatMinutes } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface SessionRow {
  id: string;
  health_score: number;
  eye_distance_score: number;
  posture_score: number;
  blink_score: number;
  screen_time_score: number;
  screen_time_minutes: number;
  lighting_score: number;
  eye_distance_cm: number | null;
  blink_rate: number;
  session_started_at: string;
  created_at: string;
}

export default function StudentHealthHistoryPage() {
  const user = useAppStore((s) => s.user);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('health_records')
      .select(
        'id, health_score, eye_distance_score, posture_score, blink_score, ' +
        'screen_time_score, screen_time_minutes, lighting_score, eye_distance_cm, ' +
        'blink_rate, session_started_at, created_at'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (error) console.error('[health/page] fetch error:', error.message);
        setSessions((data ?? []) as unknown as SessionRow[]);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => { load(); }, [load]);
  // BUG FIX: riwayat ini juga hanya fetch sekali sebelumnya — sesi baru yang
  // baru selesai tidak langsung muncul tanpa reload manual.
  useRealtimeHealth(load);

  function toneForScore(score: number) {
    if (score === 0) return 'neutral'; // 0 = sensor tidak aktif saat sesi, bukan nilai buruk
    return score >= 80 ? 'safe' : score >= 60 ? 'warning' : 'alert';
  }

  // BUG FIX: Tampilkan "—" jika skor 0 (artinya sensor tidak aktif / tidak terkalibrasi)
  // agar user tidak salah mengira skor 0 sebagai kesehatan buruk.
  function scoreDisplay(score: number, suffix?: string): string {
    if (score === 0) return '—';
    return suffix ? `${score}${suffix}` : String(score);
  }

  function downloadCSV() {
    if (sessions.length === 0) return;
    const headers = ['Tanggal', 'Durasi (mnt)', 'Health Score', 'Jarak (cm)', 'Postur Score', 'Kedipan/mnt', 'Cahaya Score'];
    const rows = sessions.map(s => [
      new Date(s.session_started_at).toLocaleString('id-ID'),
      s.screen_time_minutes ?? 0,
      s.health_score ?? 0,
      s.eye_distance_cm ?? 0,
      s.posture_score ?? 0,
      s.blink_rate ?? 0,
      s.lighting_score ?? 0
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `health_history_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#0D2B1E]">💚 Riwayat Kesehatan Belajar</h1>
        <p className="text-sm text-gray-500 mt-1">30 sesi terakhir. Diperbarui otomatis setelah setiap sesi selesai.</p>
      </div>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <CardTitle className="mb-0">Riwayat sesi belajar (30 terbaru)</CardTitle>
          {sessions.length > 0 && (
            <Button variant="secondary" onClick={downloadCSV}>Download CSV</Button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-ink/50">Memuat...</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-ink/50">
            Belum ada sesi. Mulai belajar dari dashboard dan akhiri sesi untuk menyimpan data!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-left text-ink/50 border-b border-teal-50">
                  <th className="py-2 pr-4">Tanggal</th>
                  <th className="py-2 pr-4">Durasi</th>
                  <th className="py-2 pr-4">Health</th>
                  <th className="py-2 pr-4">Jarak</th>
                  <th className="py-2 pr-4">Postur</th>
                  <th className="py-2 pr-4">Kedipan</th>
                  <th className="py-2">Cahaya</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-teal-50 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {new Date(s.session_started_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 pr-4">{formatMinutes(s.screen_time_minutes ?? 0)}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={toneForScore(s.health_score)}>
                        {scoreDisplay(s.health_score)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <span title={s.eye_distance_cm != null ? `${s.eye_distance_cm} cm` : 'tidak terkalibrasi'}>
                        <Badge tone={toneForScore(s.eye_distance_score)}>
                          {scoreDisplay(s.eye_distance_score)}
                        </Badge>
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone={toneForScore(s.posture_score)}>
                        {scoreDisplay(s.posture_score)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <span title={s.blink_rate > 0 ? `${s.blink_rate} kedipan/mnt` : 'tidak terdeteksi'}>
                        <Badge tone={toneForScore(s.blink_score)}>
                          {scoreDisplay(s.blink_score)}
                        </Badge>
                      </span>
                    </td>
                    <td className="py-2">
                      <Badge tone={toneForScore(s.lighting_score)}>
                        {scoreDisplay(s.lighting_score)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legenda */}
            <p className="text-xs text-ink/40 mt-3">
              <span className="mr-3">🟢 ≥80 baik</span>
              <span className="mr-3">🟡 60–79 perlu perhatian</span>
              <span className="mr-3">🔴 &lt;60 perlu perbaikan</span>
              <span>— = sensor tidak aktif saat sesi</span>
            </p>
          </div>
        )}
      </Card>

      {/* Summary row - BUG FIX: hanya hitung rata-rata skor > 0 */}
      {sessions.length > 0 && (
        <Card>
          <CardTitle>Rata-rata keseluruhan</CardTitle>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(
              [
                ['Health score',  avgNonZero(sessions, 'health_score')],
                ['Jarak mata',    avgNonZero(sessions, 'eye_distance_score')],
                ['Postur',        avgNonZero(sessions, 'posture_score')],
                ['Kedipan',       avgNonZero(sessions, 'blink_score')],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl2 bg-cream px-4 py-3 text-center">
                <p className={`text-2xl font-display font-bold ${
                  value === null ? 'text-ink/30' :
                  value >= 80 ? 'text-teal-600' :
                  value >= 60 ? 'text-amber-600' : 'text-alertred-600'
                }`}>
                  {value ?? '—'}
                </p>
                <p className="text-xs text-ink/60 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink/40 mt-3">
            Rata-rata hanya dari sesi yang memiliki data sensor aktif.
          </p>
        </Card>
      )}
    </div>
  );
}

// BUG FIX: Rata-rata hanya dari nilai > 0 (nilai 0 = sensor tidak aktif,
// bukan nilai buruk yang valid — memasukkannya akan menurunkan rata-rata secara tidak adil).
function avgNonZero(rows: SessionRow[], key: keyof SessionRow): number | null {
  const validRows = rows.filter((r) => typeof r[key] === 'number' && (r[key] as number) > 0);
  if (validRows.length === 0) return null;
  const sum = validRows.reduce((acc, r) => acc + ((r[key] as number) ?? 0), 0);
  return Math.round(sum / validRows.length);
}
