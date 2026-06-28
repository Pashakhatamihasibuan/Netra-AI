'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useT } from '@/i18n/useT';

interface Props {
  materialId?: string;
  quizMode?: boolean;
  submissionId?: string;
  onWarning?: (active: boolean) => void;
  onComplete?: () => void;
}

export function MonitoringPanel({ materialId, quizMode = false, submissionId, onWarning, onComplete }: Props) {
  const { t } = useT();
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const [active, setActive]         = useState(false);
  const [sessionId, setSessionId]   = useState<string | null>(null);
  const [minimized, setMinimized]   = useState(false);
  const [breakActive, setBreakActive] = useState(false);
  const [warnings, setWarnings]     = useState<string[]>([]);
  const [aiRec, setAiRec]           = useState<string | null>(null);
  const [calibStep, setCalibStep]   = useState<0 | 1 | 2>(0);
  const [calib1, setCalib1]         = useState<number | null>(null);
  const [calib2, setCalib2]         = useState<number | null>(null);
  const [postureState, setPosture]  = useState<'good' | 'warn' | 'poor'>('good');
  const [badge, setBadge]           = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) { videoRef.current.srcObject = stream; }
      setActive(true);
    } catch { /* user denied */ }
  }

  async function startSession() {
    const res  = await fetch('/api/health/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ material_id: materialId }) });
    const data = await res.json();
    setSessionId(data.session_id ?? null);
  }

  async function endSession() {
    if (!sessionId) return;
    const res  = await fetch(`/api/health/sessions/${sessionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ended: true }) });
    const data = await res.json();
    if (data.badge) setBadge(data.badge);
    if (data.saved) setSessionSaved(true);
    onComplete?.();
  }

  function postureLabel() {
    if (postureState === 'good') return t('monitoring', 'posture_good');
    if (postureState === 'warn') return t('monitoring', 'posture_warn');
    return t('monitoring', 'posture_poor');
  }

  const postureColor = postureState === 'good' ? 'text-teal-600' : postureState === 'warn' ? 'text-amber-600' : 'text-red-500';

  return (
    <div className={`rounded-xl2 border border-teal-50 overflow-hidden ${minimized ? 'w-fit' : ''}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-teal-50/60 border-b border-teal-50">
        <span className="text-xs font-semibold text-teal-700">{t('monitoring', 'cam_label')}</span>
        <button onClick={() => setMinimized((v) => !v)} className="text-xs text-ink/40 hover:text-ink transition-colors">
          {minimized ? t('monitoring', 'expand') : t('monitoring', 'minimize')}
        </button>
      </div>

      {!minimized && (
        <div className="p-3 space-y-3">
          <div className="relative rounded-xl2 overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          </div>

          {!active ? (
            <button onClick={startCamera} className="w-full text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 py-2 rounded-xl2 transition-colors">
              {t('monitoring', 'start_camera')}
            </button>
          ) : !sessionId ? (
            <div className="space-y-2">
              {calibStep === 0 && (
                <button onClick={() => { setCalibStep(1); }} className="w-full text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-2 rounded-xl2 transition-colors">
                  {t('monitoring', 'calib_1')}
                </button>
              )}
              {calibStep === 1 && (
                <>
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl2 px-3 py-2">{t('monitoring', 'calib_hint')}</p>
                  <button onClick={() => { setCalibStep(2); }} className="w-full text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-2 rounded-xl2 transition-colors">
                    {t('monitoring', 'calib_2')}
                  </button>
                </>
              )}
              {calibStep === 2 && (
                <button onClick={startSession} className="w-full text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 py-2 rounded-xl2 transition-colors">
                  {t('monitoring', 'start_session')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sessionSaved && (
                <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2">
                  {t('monitoring', 'saved')} {badge && `${t('monitoring', 'badge_new')}${badge}`}
                </p>
              )}
              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl2 px-3 py-1.5">{w}</p>
                  ))}
                </div>
              )}
              {warnings.length === 0 && (
                <p className="text-xs text-teal-700 bg-teal-50 rounded-xl2 px-3 py-1.5">{t('monitoring', 'all_safe')}</p>
              )}
              {aiRec && (
                <div className="text-xs bg-purple-50 border border-purple-100 rounded-xl2 px-3 py-2">
                  <p className="font-medium text-purple-700">{t('monitoring', 'ai_rec')}</p>
                  <p className="text-purple-600 mt-0.5">{aiRec}</p>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink/40">Postur:</span>
                <span className={`font-semibold ${postureColor}`}>{postureLabel()}</span>
              </div>
              <div className="flex gap-2">
                {!breakActive && (
                  <button onClick={() => { setBreakActive(true); setTimeout(() => setBreakActive(false), 20_000); }}
                    className="flex-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 py-1.5 rounded-xl2 transition-colors">
                    {t('monitoring', 'break_btn')}
                  </button>
                )}
                <button onClick={() => { setCalibStep(0); }}
                  className="flex-1 text-xs font-medium text-ink/50 hover:text-ink border border-teal-50 py-1.5 rounded-xl2 transition-colors">
                  {t('monitoring', 'recalibrate')}
                </button>
                <button onClick={endSession}
                  className="flex-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 py-1.5 rounded-xl2 transition-colors">
                  {t('monitoring', 'end_session')}
                </button>
              </div>
              {breakActive && (
                <p className="text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-xl2 px-3 py-2 text-center">
                  {t('monitoring', 'break_active')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
