'use client';

import { useCallback, useRef, useState } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import type { PostureStatus } from '@/types';

const LEFT_EYE_OUTER  = 33;
const RIGHT_EYE_OUTER = 263;

const LEFT_EYE  = { top: 159, bottom: 145, left: 33,  right: 133 };
const RIGHT_EYE = { top: 386, bottom: 374, left: 362, right: 263 };

// Landmark index ported EXACT dari main.py deteksi_postur():
//   hidung      = face[1]
//   bahu_kiri   = face[234]
//   bahu_kanan  = face[454]
const NOSE_TIP     = 1;
const LEFT_CHEEK   = 234;   // proxy bahu kiri di face landmarker (titik pinggir kiri)
const RIGHT_CHEEK  = 454;   // proxy bahu kanan di face landmarker (titik pinggir kanan)

// Threshold ported dari main.py:
//   selisih < 30 && selisih_bahu < 0.03  → Good
//   selisih < 80 && selisih_bahu < 0.07  → Warning
//   else                                  → Poor
// Karena koordinat web adalah normalized (0–1), selisih pixel harus
// dikalikan videoWidth agar setara dengan main.py yang pakai pixel penuh.
const NOSE_OFFSET_GOOD_PX    = 30;
const NOSE_OFFSET_WARNING_PX = 80;
const SHOULDER_TILT_GOOD     = 0.03;
const SHOULDER_TILT_WARNING  = 0.07;

const EAR_BLINK_THRESHOLD = 0.18;
const BLINK_MIN_GAP_MS    = 200;
const BLINK_WINDOW_MS     = 30_000;

let cachedLandmarker: FaceLandmarker | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (cachedLandmarker) return cachedLandmarker;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  cachedLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
  });

  return cachedLandmarker;
}

function eyeAspectRatio(
  landmarks: Array<{ x: number; y: number }>,
  eye: typeof LEFT_EYE
): number {
  const top    = landmarks[eye.top];
  const bottom = landmarks[eye.bottom];
  const left   = landmarks[eye.left];
  const right  = landmarks[eye.right];

  const vertical   = Math.hypot(top.x - bottom.x,  top.y - bottom.y);
  const horizontal = Math.hypot(left.x - right.x,  left.y - right.y);
  return horizontal === 0 ? 0 : vertical / horizontal;
}

// Ported EXACT dari main.py deteksi_postur().
// Python pakai face[1]=hidung, face[234]=sisi kiri wajah, face[454]=sisi kanan.
// Karena FaceLandmarker tidak detect bahu sungguhan, titik 234 dan 454
// adalah ujung kiri/kanan wajah — cukup untuk mendeteksi kemiringan kepala
// dan apakah hidung berada di tengah, sama persis dengan main.py.
function detectPostureFromFace(
  landmarks: Array<{ x: number; y: number }>,
  videoWidth: number
): PostureStatus {
  const hidung     = landmarks[NOSE_TIP];
  const bahuKiri   = landmarks[LEFT_CHEEK];
  const bahuKanan  = landmarks[RIGHT_CHEEK];

  // Konversi ke pixel agar threshold sama dengan main.py
  const tengahBahu   = ((bahuKiri.x + bahuKanan.x) / 2) * videoWidth;
  const posisiHidung = hidung.x * videoWidth;

  const selisih      = Math.abs(posisiHidung - tengahBahu);
  const selisihBahu  = Math.abs(bahuKiri.y - bahuKanan.y); // normalized sudah cukup

  if (selisih < NOSE_OFFSET_GOOD_PX && selisihBahu < SHOULDER_TILT_GOOD) {
    return 'good';
  } else if (selisih < NOSE_OFFSET_WARNING_PX && selisihBahu < SHOULDER_TILT_WARNING) {
    return 'warning';
  } else {
    return 'poor';
  }
}

export interface CalibrationPoint {
  pixelWidth: number;
  distanceCm: number;
}

// cm = a / pixelWidth + b. With a single point we pin b = 0, which is
// exactly the old one-point "inverse proportional" assumption (i.e. a pure
// pinhole-camera model with no offset). With two points at different known
// distances we solve for both a and b, which absorbs systematic error such
// as lens distortion or the fixed offset between "eye outer corners" and
// the camera's actual optical center — giving a noticeably better fit
// across the full 30–70cm safe range instead of just near the single
// calibrated point.
export interface CalibrationModel {
  a: number;
  b: number;
}

export interface SavedCalibration {
  points: CalibrationPoint[];
  model: CalibrationModel;
}

// Pixel widths from two calibration points this close together would make
// the two-point fit numerically unstable (dividing by an almost-zero
// difference), so a repeat calibration at a near-identical distance
// restarts the sequence instead of corrupting the model.
const MIN_CALIBRATION_DISTANCE_DELTA_CM = 5;
// Sanity bounds so a bad fit (e.g. noisy webcam frame during calibration)
// can't make the displayed distance wildly implausible.
const MIN_PLAUSIBLE_CM = 10;
const MAX_PLAUSIBLE_CM = 150;

function fitCalibrationModel(points: CalibrationPoint[]): CalibrationModel {
  if (points.length === 1) {
    const [p] = points;
    return { a: p.distanceCm * p.pixelWidth, b: 0 };
  }

  const [p1, p2] = points;
  const inv1 = 1 / p1.pixelWidth;
  const inv2 = 1 / p2.pixelWidth;
  const denom = inv1 - inv2;

  // Degenerate case (pixel widths ended up basically equal) — fall back to
  // the simpler one-point model anchored on the most recent point rather
  // than dividing by ~0.
  if (Math.abs(denom) < 1e-9) {
    return { a: p2.distanceCm * p2.pixelWidth, b: 0 };
  }

  const a = (p1.distanceCm - p2.distanceCm) / denom;
  const b = p1.distanceCm - a * inv1;
  return { a, b };
}

interface UseFaceMeshResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRunning: boolean;
  isCalibrated: boolean;
  /** 0 = belum kalibrasi, 1 = titik pertama tersimpan, 2 = kalibrasi dua titik selesai */
  calibrationStep: 0 | 1 | 2;
  error: string | null;
  distanceCm: number | null;
  blinkRatePerMinute: number;
  // Postur sekarang datang dari FaceLandmarker langsung (sama dengan main.py)
  posture: PostureStatus;
  start: () => Promise<void>;
  stop: () => void;
  /** Rekam titik kalibrasi pada jarak yang diketahui (panggil 2x untuk model non-linear). */
  calibrate: (knownDistanceCm: number) => void;
  resetCalibration: () => void;
  /** Muat kalibrasi tersimpan dari Supabase (pakai di compact mode quiz). */
  loadCalibration: (saved: SavedCalibration) => void;
  /** Ambil snapshot kalibrasi saat ini untuk disimpan ke Supabase. */
  getCalibrationSnapshot: () => SavedCalibration | null;
}

export function useFaceMesh(onDistanceSample?: (cm: number) => void): UseFaceMeshResult {
  const videoRef           = useRef<HTMLVideoElement>(null);
  const rafRef             = useRef<number | null>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const calibrationPointsRef = useRef<CalibrationPoint[]>([]);
  const calibrationModelRef  = useRef<CalibrationModel | null>(null);
  const blinkTimestampsRef = useRef<number[]>([]);
  const wasBlinkingRef     = useRef(false);
  const lastBlinkAtRef     = useRef(0);
  const lastPixelWidthRef  = useRef<number | null>(null);

  const [isRunning, setIsRunning]           = useState(false);
  const [isCalibrated, setIsCalibrated]     = useState(false);
  const [calibrationStep, setCalibrationStep] = useState<0 | 1 | 2>(0);
  const [error, setError]                   = useState<string | null>(null);
  const [distanceCm, setDistanceCm]         = useState<number | null>(null);
  const [blinkRatePerMinute, setBlinkRate]  = useState(0);
  const [posture, setPosture]               = useState<PostureStatus>('good');

  const resetCalibration = useCallback(() => {
    calibrationPointsRef.current = [];
    calibrationModelRef.current = null;
    setCalibrationStep(0);
    setIsCalibrated(false);
  }, []);

  const calibrate = useCallback((knownDistanceCm: number) => {
    if (lastPixelWidthRef.current === null) return;

    const newPoint: CalibrationPoint = {
      pixelWidth: lastPixelWidthRef.current,
      distanceCm: knownDistanceCm,
    };

    const existing = calibrationPointsRef.current;
    const tooCloseToExisting = existing.some(
      (p) => Math.abs(p.distanceCm - knownDistanceCm) < MIN_CALIBRATION_DISTANCE_DELTA_CM
    );

    // A repeat calibration at (near) the same distance can't contribute a
    // second independent point, so treat it as restarting the sequence
    // rather than silently producing an unstable two-point fit.
    const points = tooCloseToExisting
      ? [newPoint]
      : [...existing, newPoint].slice(-2);

    calibrationPointsRef.current = points;
    calibrationModelRef.current = fitCalibrationModel(points);
    setCalibrationStep(points.length === 2 ? 2 : 1);
    setIsCalibrated(true);
  }, []);

  // Muat kalibrasi tersimpan langsung — tanpa perlu wajah terdeteksi dulu.
  // Dipakai di compact mode: load dari Supabase saat kamera baru nyala.
  const loadCalibration = useCallback((saved: SavedCalibration) => {
    calibrationPointsRef.current = saved.points;
    calibrationModelRef.current = saved.model;
    setCalibrationStep(saved.points.length >= 2 ? 2 : 1);
    setIsCalibrated(true);
  }, []);

  // Ambil snapshot kalibrasi saat ini untuk disimpan ke Supabase setelah
  // siswa selesai kalibrasi manual di dashboard.
  const getCalibrationSnapshot = useCallback((): SavedCalibration | null => {
    const model = calibrationModelRef.current;
    const points = calibrationPointsRef.current;
    if (!model || points.length === 0) return null;
    return { points, model };
  }, []);

  const detectLoop = useCallback(
    async (landmarker: FaceLandmarker) => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(() => detectLoop(landmarker));
        return;
      }

      const result: FaceLandmarkerResult = landmarker.detectForVideo(
        video,
        performance.now()
      );

      if (result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];

        // Jarak mata (untuk kalibrasi jarak layar)
        const pxWidth =
          Math.hypot(
            (landmarks[LEFT_EYE_OUTER].x - landmarks[RIGHT_EYE_OUTER].x) * video.videoWidth,
            (landmarks[LEFT_EYE_OUTER].y - landmarks[RIGHT_EYE_OUTER].y) * video.videoHeight
          ) || 1;

        lastPixelWidthRef.current = pxWidth;

        if (calibrationModelRef.current) {
          const { a, b } = calibrationModelRef.current;
          const estimatedCm = a / pxWidth + b;
          const clampedCm = Math.min(MAX_PLAUSIBLE_CM, Math.max(MIN_PLAUSIBLE_CM, estimatedCm));
          const rounded = Math.round(clampedCm * 10) / 10;
          setDistanceCm(rounded);
          onDistanceSample?.(clampedCm);
        }

        // Deteksi kedipan
        const ear =
          (eyeAspectRatio(landmarks, LEFT_EYE) + eyeAspectRatio(landmarks, RIGHT_EYE)) / 2;
        const isBlinking = ear < EAR_BLINK_THRESHOLD;
        const now = performance.now();

        if (
          isBlinking &&
          !wasBlinkingRef.current &&
          now - lastBlinkAtRef.current > BLINK_MIN_GAP_MS
        ) {
          blinkTimestampsRef.current.push(now);
          lastBlinkAtRef.current = now;
        }
        wasBlinkingRef.current = isBlinking;

        blinkTimestampsRef.current = blinkTimestampsRef.current.filter(
          (t) => now - t <= BLINK_WINDOW_MS
        );
        const rate = (blinkTimestampsRef.current.length / BLINK_WINDOW_MS) * 60_000;
        setBlinkRate(Math.round(rate));

        // Deteksi postur — ported exact dari main.py deteksi_postur()
        const newPosture = detectPostureFromFace(landmarks, video.videoWidth);
        setPosture(newPosture);
      } else {
        // Tidak ada wajah terdeteksi — reset postur ke unknown/warning
        setPosture('warning');
      }

      rafRef.current = requestAnimationFrame(() => detectLoop(landmarker));
    },
    [onDistanceSample]
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const landmarker = await getLandmarker();
      setIsRunning(true);
      detectLoop(landmarker);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Tidak bisa mengakses kamera.'
      );
      setIsRunning(false);
    }
  }, [detectLoop]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRunning(false);
    setPosture('good');
    setDistanceCm(null);
    setBlinkRate(0);
  }, []);

  return {
    videoRef,
    isRunning,
    isCalibrated,
    calibrationStep,
    error,
    distanceCm,
    blinkRatePerMinute,
    posture,
    start,
    stop,
    calibrate,
    resetCalibration,
    loadCalibration,
    getCalibrationSnapshot,
  };
}
