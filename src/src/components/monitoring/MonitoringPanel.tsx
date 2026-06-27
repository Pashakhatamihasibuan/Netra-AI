'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFaceMesh, type SavedCalibration } from '@/hooks/useFaceMesh';
import { useLightingDetector } from '@/hooks/useLightingDetector';
import { useMonsterState } from '@/hooks/useMonsterState';
import { useScreenTime } from '@/hooks/useScreenTime';
import { Mascot } from './Mascot';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { decide } from '@/lib/ai/decisionEngine';
import { calculateHealthScoreSafe } from '@/lib/ai/healthScore';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';

// Dua titik kalibrasi non-linear (cm = a/px + b), dipilih agar mencakup
// kedua ujung rentang aman (30-70cm) tanpa terlalu ekstrem untuk anak duduk.
const CALIBRATION_POINT_1_CM = 30;
const CALIBRATION_POINT_2_CM = 50;

// Ported dari main.py sistem_peringatan() — tampil sebagai alert visual real-time
function buildWarnings(params: {
  distanceCm: number | null;
  lighting: string;
  posture: string;
  blinkRate: number;
  isRunning: boolean;
}): string[] {
  if (!params.isRunning) return [];
  const w: string[] = [];

  if (params.distanceCm !== null) {
    if (params.distanceCm < 30) w.push('Terlalu dekat dengan layar! Mundur sedikit.');
    else if (params.distanceCm > 70) w.push('Terlalu jauh dari layar.');
  }
  if (params.lighting === 'dark')   w.push('Ruangan terlalu gelap — nyalakan lampu.');
  if (params.lighting === 'bright') w.push('Cahaya terlalu terang / silau.');
  if (params.posture === 'poor')    w.push('Posisi duduk tidak benar — tegakkan punggung!');
  else if (params.posture === 'warning') w.push('Postur mulai tidak ideal.');
  if (params.blinkRate > 0 && params.blinkRate < 8)
    w.push('Mata jarang berkedip — istirahatkan sebentar.');

  return w;
}

const POSTURE_LABEL: Record<string, string> = {
  good:    'Baik ✓',
  warning: 'Kurang Ideal',
  poor:    'Buruk ✗',
};

// ── Draggable camera widget ───────────────────────────────────────────────────

function DraggableCameraWidget({ faceMesh, handleStart, warnings, postureTone }: {
  faceMesh: ReturnType<typeof useFaceMesh>;
  handleStart: () => void;
  warnings: string[];
  postureTone: string;
}) {
  const [pos, setPos]         = useState({ x: window.innerWidth - 196, y: 16 });
  const [minimized, setMin]   = useState(false);
  const dragging              = useRef(false);
  const offset                = useRef({ x: 0, y: 0 });
  const widgetRef             = useRef<HTMLDivElement>(null);

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button,video')) return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const w = widgetRef.current?.offsetWidth  ?? 176;
      const h = widgetRef.current?.offsetHeight ?? 200;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - w, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - h, e.clientY - offset.current.y)),
      });
    }
    function onUp() { dragging.current = false; }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // Touch drag
  function onTouchStart(e: React.TouchEvent) {
    if ((e.target as HTMLElement).closest('button,video')) return;
    const t = e.touches[0];
    dragging.current = true;
    offset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }
  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      const w = widgetRef.current?.offsetWidth  ?? 176;
      const h = widgetRef.current?.offsetHeight ?? 200;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth  - w, t.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - h, t.clientY - offset.current.y)),
      });
      e.preventDefault();
    }
    function onTouchEnd() { dragging.current = false; }
    window.addEventListener('touchmove',  onTouchMove, { passive: false });
    window.addEventListener('touchend',   onTouchEnd);
    return () => { window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd); };
  }, []);

  const distTone = faceMesh.distanceCm == null ? 'neutral'
    : faceMesh.distanceCm < 30 || faceMesh.distanceCm > 70 ? 'alert' : 'safe';

  return (
    <div
      ref={widgetRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, width: 176, userSelect: 'none', touchAction: 'none' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Header bar — drag handle + controls */}
      <div className="flex items-center justify-between bg-[#0D2B1E] rounded-t-xl px-2 py-1 cursor-grab active:cursor-grabbing">
        <span className="text-[10px] text-white/60 font-semibold tracking-wide select-none">📷 Kamera CV</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMin((m) => !m)}
            className="w-5 h-5 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors text-xs"
            title={minimized ? 'Perbesar' : 'Kecilkan'}
          >
            {minimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Body */}
      {!minimized && (
        <div className="bg-[#0D2B1E]/90 backdrop-blur-sm rounded-b-xl overflow-hidden shadow-xl border border-white/10">
          <div className="relative">
            <video
              ref={faceMesh.videoRef}
              muted
              playsInline
              className="w-full aspect-square object-cover scale-x-[-1] bg-black/30"
            />
            {!faceMesh.isRunning && (
              <button
                onClick={handleStart}
                className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-semibold"
              >
                Mulai kamera
              </button>
            )}
          </div>
          {faceMesh.isRunning && (
            <div className="px-2 py-1.5 flex flex-wrap gap-1">
              <Badge tone={distTone}>
                {faceMesh.distanceCm != null ? `${faceMesh.distanceCm} cm` : '—'}
              </Badge>
              <Badge tone={postureTone as 'safe' | 'warning' | 'alert' | 'neutral'}>
                {POSTURE_LABEL[faceMesh.posture] ?? faceMesh.posture}
              </Badge>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="px-2 pb-1.5">
              <p className="text-[10px] leading-tight text-amber-300 bg-amber-900/40 rounded-lg px-2 py-1">
                ⚠️ {warnings[0]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MonitoringPanelProps {
  /** Mode kecil mengambang di pojok kanan atas (dipakai saat kuis/fullscreen).
   *  Default: false -> tampilan penuh seperti di dashboard. */
  compact?: boolean;
}

export function MonitoringPanel({ compact = false }: MonitoringPanelProps) {
  const user                  = useAppStore((s) => s.user);
  const setMonitoringSnapshot = useAppStore((s) => s.setMonitoringSnapshot);
  const cameraAutoStartSignal = useAppStore((s) => s.cameraAutoStartSignal);
  const cameraAutoStopSignal  = useAppStore((s) => s.cameraAutoStopSignal);

  const monster    = useMonsterState();
  // posture sekarang datang langsung dari useFaceMesh (sama algoritmanya dengan main.py)
  const faceMesh   = useFaceMesh((cm) => monster.update(cm));
  const lighting   = useLightingDetector(faceMesh.videoRef, faceMesh.isRunning);
  const screenTime = useScreenTime(faceMesh.isRunning);

  const sessionStartedAt  = useRef<string | null>(null);
  const [savedThisSession, setSavedThisSession] = useState(false);
  const [newBadges, setNewBadges]               = useState<string[]>([]);
  const [liveScore, setLiveScore]               = useState<number | null>(null);

  const handleStart = useCallback(async () => {
    sessionStartedAt.current = new Date().toISOString();
    setSavedThisSession(false);
    setNewBadges([]);
    setLiveScore(null);
    await faceMesh.start();
  }, [faceMesh]);

  // Simpan kalibrasi ke Supabase setelah titik ke-2 selesai (dashboard mode).
  // Compact mode cukup load — tidak perlu simpan ulang.
  useEffect(() => {
    if (compact) return;
    if (faceMesh.calibrationStep !== 2) return;
    if (!user) return;
    const snapshot = faceMesh.getCalibrationSnapshot();
    if (!snapshot) return;
    const supabase = createClient();
    supabase
      .from('users')
      .update({ calibration_data: snapshot })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error('[MonitoringPanel] Gagal simpan kalibrasi:', error.message);
      });
  }, [compact, faceMesh.calibrationStep, faceMesh.getCalibrationSnapshot, user]);

  // Auto-start kamera saat QuizPlayer mengirim sinyal "Mulai Kuis" — hanya
  // relevan di mode compact (widget kuis), supaya siswa tidak perlu klik dua
  // kali (sekali "Mulai Kuis", sekali lagi "Mulai kamera").
  const lastHandledSignal = useRef(0);
  useEffect(() => {
    if (!compact) return;
    if (cameraAutoStartSignal === 0) return;
    if (cameraAutoStartSignal === lastHandledSignal.current) return;
    lastHandledSignal.current = cameraAutoStartSignal;
    if (!faceMesh.isRunning) handleStart();
  }, [compact, cameraAutoStartSignal, faceMesh.isRunning, handleStart]);

  // Di compact mode: load kalibrasi tersimpan dari Supabase setelah kamera
  // nyala, supaya deteksi jarak langsung akurat tanpa kalibrasi ulang.
  const calibrationLoaded = useRef(false);
  useEffect(() => {
    if (!compact) return;
    if (!faceMesh.isRunning) { calibrationLoaded.current = false; return; }
    if (calibrationLoaded.current) return;
    if (!user) return;
    calibrationLoaded.current = true;
    const supabase = createClient();
    supabase
      .from('users')
      .select('calibration_data')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data?.calibration_data) {
          // Belum pernah kalibrasi — fallback ke auto-cal 50cm agar tidak blank
          setTimeout(() => faceMesh.calibrate(50), 800);
          return;
        }
        faceMesh.loadCalibration(data.calibration_data as SavedCalibration);
      });
  }, [compact, faceMesh.isRunning, user, faceMesh.loadCalibration, faceMesh.calibrate]);

  const handleCalibrate = useCallback(() => {
    const targetCm = faceMesh.calibrationStep === 0
      ? CALIBRATION_POINT_1_CM
      : CALIBRATION_POINT_2_CM;
    faceMesh.calibrate(targetCm);
  }, [faceMesh]);

  // Update live score setiap ada perubahan sensor
  useEffect(() => {
    if (!faceMesh.isRunning) return;
    const { healthScore } = calculateHealthScoreSafe({
      distanceCm:        monster.distanceCm,
      blinkRate:         faceMesh.blinkRatePerMinute || null,
      posture:           faceMesh.posture,          // <-- dari faceMesh langsung
      lightingScore:     lighting.lightingScore,
      screenTimeMinutes: screenTime.totalMinutes,
    });
    setLiveScore(healthScore);
  }, [
    faceMesh.isRunning,
    faceMesh.blinkRatePerMinute,
    faceMesh.posture,
    monster.distanceCm,
    lighting.lightingScore,
    screenTime.totalMinutes,
  ]);

  // Push snapshot ke global store
  useEffect(() => {
    setMonitoringSnapshot({
      monsterState: monster.state,
      distanceCm:   monster.distanceCm,
      posture:      faceMesh.posture,               // <-- dari faceMesh langsung
      lighting:     lighting.lighting,
      blinkRate:    faceMesh.blinkRatePerMinute,
    });
  }, [
    monster.state, monster.distanceCm, faceMesh.posture,
    lighting.lighting, faceMesh.blinkRatePerMinute, setMonitoringSnapshot,
  ]);

  const decision = decide({
    monsterState:          monster.state,
    posture:               faceMesh.posture,        // <-- dari faceMesh langsung
    lighting:              lighting.lighting,
    minutesSinceLastBreak: screenTime.minutesSinceLastBreak,
  });

  const handleEndSession = useCallback(async () => {
    if (!user || !sessionStartedAt.current) {
      faceMesh.stop();
      return;
    }

    const { healthScore, subScores } = calculateHealthScoreSafe({
      distanceCm:        monster.distanceCm,
      blinkRate:         faceMesh.blinkRatePerMinute > 0 ? faceMesh.blinkRatePerMinute : null,
      posture:           faceMesh.posture,
      lightingScore:     lighting.lightingScore,
      screenTimeMinutes: screenTime.totalMinutes,
    });

    const supabase = createClient();
    const { error: insertError } = await supabase.from('health_records').insert({
      user_id:             user.id,
      eye_distance_cm:     monster.distanceCm,
      eye_distance_score:  subScores.eyeDistance,
      posture_score:       subScores.posture,
      blink_rate:          faceMesh.blinkRatePerMinute,
      blink_score:         subScores.blinkRate,
      lighting_score:      subScores.lighting,
      screen_time_minutes: screenTime.totalMinutes,
      screen_time_score:   subScores.screenTime,
      health_score:        healthScore,
      session_started_at:  sessionStartedAt.current,
    });

    if (insertError) {
      console.error('[MonitoringPanel] Gagal simpan sesi:', insertError.message);
    }

    fetch('/api/badges/award', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    })
      .then((r) => r.json())
      .then((body: { awarded?: string[] }) => {
        if (body.awarded?.length) setNewBadges(body.awarded);
      })
      .catch(() => {});

    setSavedThisSession(true);
    faceMesh.stop();
    monster.reset();
    setLiveScore(null);
  }, [user, faceMesh, monster, lighting.lightingScore, screenTime]);

  // Auto-akhiri sesi (simpan health_records) saat QuizPlayer memberi sinyal
  // kuis sudah selesai/diblokir — hanya kalau kamera memang sedang berjalan,
  // supaya tidak menyimpan sesi kosong kalau siswa belum pernah nyalakan kamera.
  const lastHandledStopSignal = useRef(0);
  useEffect(() => {
    if (!compact) return;
    if (cameraAutoStopSignal === 0) return;
    if (cameraAutoStopSignal === lastHandledStopSignal.current) return;
    lastHandledStopSignal.current = cameraAutoStopSignal;
    if (faceMesh.isRunning) handleEndSession();
  }, [compact, cameraAutoStopSignal, faceMesh.isRunning, handleEndSession]);

  const warnings = buildWarnings({
    distanceCm: faceMesh.distanceCm ?? monster.distanceCm,
    lighting:   lighting.lighting,
    posture:    faceMesh.posture,
    blinkRate:  faceMesh.blinkRatePerMinute,
    isRunning:  faceMesh.isRunning,
  });

  const scoreTone =
    liveScore === null ? 'neutral'
    : liveScore >= 80  ? 'safe'
    : liveScore >= 60  ? 'warning'
    : 'alert';

  const postureTone =
    faceMesh.posture === 'good'    ? 'safe'
    : faceMesh.posture === 'warning' ? 'warning'
    : 'alert';

  if (compact) {
    return <DraggableCameraWidget faceMesh={faceMesh} handleStart={handleStart} warnings={warnings} postureTone={postureTone} />;
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap">

        {/* Camera preview */}
        <div className="flex-1 min-w-[260px]">
          <video
            ref={faceMesh.videoRef}
            muted
            playsInline
            className="w-full max-w-sm rounded-xl2 bg-ink/5 scale-x-[-1]"
          />
          {faceMesh.error && (
            <p className="text-sm text-alertred-600 mt-2">{faceMesh.error}</p>
          )}

          <div className="flex gap-2 mt-3 flex-wrap">
            {!faceMesh.isRunning ? (
              <Button onClick={handleStart}>Mulai sesi belajar</Button>
            ) : (
              <>
                {faceMesh.calibrationStep < 2 && (
                  <Button variant="secondary" onClick={handleCalibrate}>
                    {faceMesh.calibrationStep === 0
                      ? 'Kalibrasi titik 1 (duduk ~30 cm)'
                      : 'Kalibrasi titik 2 (duduk ~50 cm)'}
                  </Button>
                )}
                {faceMesh.calibrationStep === 1 && (
                  <p className="text-xs text-ink/50 self-center">
                    Titik 1 tersimpan — sekarang geser kursi ke ~50cm lalu klik lagi.
                  </p>
                )}
                {faceMesh.calibrationStep === 2 && (
                  <Button variant="ghost" onClick={faceMesh.resetCalibration}>
                    Kalibrasi ulang
                  </Button>
                )}
                <Button variant="ghost" onClick={handleEndSession}>
                  Akhiri sesi
                </Button>
              </>
            )}
          </div>

          {savedThisSession && (
            <p className="text-sm text-teal-600 mt-2">
              ✓ Sesi disimpan.{' '}
              {newBadges.length > 0 && (
                <span className="font-medium">Badge baru: {newBadges.join(', ')} 🎉</span>
              )}
            </p>
          )}
        </div>

          {/* Live monitoring sidebar */}
        <div className="flex-1 min-w-[260px] space-y-3">
          <Mascot 
            state={monster.state} 
            message={
              monster.state !== 'safe' && monster.distanceCm !== null && monster.distanceCm > 70 
                ? (monster.state === 'warning' ? 'Hmm, agak terlalu jauh nih...' : 'Yuk mendekat sedikit ke layar!') 
                : undefined
            } 
          />

          <div className="flex flex-wrap gap-2">
            <Badge tone={monster.state === 'safe' ? 'safe' : monster.state === 'warning' ? 'warning' : 'alert'}>
              Jarak: {monster.distanceCm != null ? `${monster.distanceCm} cm` : '—'}
            </Badge>

            {/* Postur badge — sekarang akurat dari FaceLandmarker seperti main.py */}
            <Badge tone={postureTone}>
              Postur: {POSTURE_LABEL[faceMesh.posture] ?? faceMesh.posture}
            </Badge>

            <Badge tone={lighting.lighting === 'normal' ? 'safe' : 'warning'}>
              Cahaya: {lighting.lighting}
            </Badge>
            <Badge tone={
              faceMesh.blinkRatePerMinute === 0 ? 'neutral'
              : faceMesh.blinkRatePerMinute < 8 ? 'alert'
              : 'safe'
            }>
              Kedipan: {faceMesh.blinkRatePerMinute > 0 ? `${faceMesh.blinkRatePerMinute}/mnt` : '—'}
            </Badge>
            <Badge tone="neutral">
              Waktu: {Math.round(screenTime.totalMinutes)} mnt
            </Badge>
            {liveScore !== null && (
              <Badge tone={scoreTone}>
                Skor: {Math.round(liveScore)}
              </Badge>
            )}
          </div>

          {/* Peringatan real-time (ported dari main.py sistem_peringatan) */}
          {warnings.length > 0 && (
            <div className="rounded-xl2 bg-alertred-50 border border-alertred-200 px-4 py-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-sm text-alertred-700">⚠️ {w}</p>
              ))}
            </div>
          )}
          {faceMesh.isRunning && warnings.length === 0 && (
            <div className="rounded-xl2 bg-teal-50 border border-teal-200 px-4 py-2">
              <p className="text-sm text-teal-700">✅ Kondisi belajar aman</p>
            </div>
          )}

          <div className="rounded-xl2 bg-cream px-4 py-3 text-sm">
            <strong className="font-display">Rekomendasi AI:</strong>{' '}
            {decision.message}
          </div>

          {screenTime.isBreakDue && !screenTime.isBreakActive && (
            <Button variant="secondary" onClick={screenTime.startBreakNow}>
              Mulai istirahat 20 detik
            </Button>
          )}
          {screenTime.isBreakActive && (
            <div className="rounded-xl2 bg-amber-50 text-amber-800 px-4 py-3 text-sm font-medium">
              Lihat objek sejauh 20 kaki selama 20 detik... 👀
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
