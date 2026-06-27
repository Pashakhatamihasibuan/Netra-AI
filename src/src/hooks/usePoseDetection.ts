'use client';

import { useCallback, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker, type PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { PostureStatus } from '@/types';

// BlazePose 33-point topology.
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;

// Approximate craniovertebral angle: angle between the shoulder->ear vector
// and the horizontal. A more upright head (ear stacked above shoulder)
// gives an angle closer to 90deg; forward head posture flattens it.
// Thresholds are a simplified stand-in for the clinical ranges used in
// ergonomics research — good enough to drive feedback, not a diagnostic tool.
const GOOD_THRESHOLD_DEG = 50;
const WARNING_THRESHOLD_DEG = 40;

let cachedLandmarker: PoseLandmarker | null = null;

async function getPoseLandmarker(): Promise<PoseLandmarker> {
  if (cachedLandmarker) return cachedLandmarker;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );

  cachedLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  return cachedLandmarker;
}

function angleFromVertical(shoulder: { x: number; y: number }, ear: { x: number; y: number }) {
  const dx = ear.x - shoulder.x;
  const dy = shoulder.y - ear.y; // image y grows downward, so flip for "up"
  const angleRad = Math.atan2(dy, Math.abs(dx) || 0.0001);
  return (angleRad * 180) / Math.PI;
}

interface UsePoseDetectionResult {
  posture: PostureStatus;
  angleDeg: number | null;
  start: (video: HTMLVideoElement) => Promise<void>;
  stop: () => void;
}

export function usePoseDetection(): UsePoseDetectionResult {
  const [posture, setPosture] = useState<PostureStatus>('good');
  const [angleDeg, setAngleDeg] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const detectLoop = useCallback((landmarker: PoseLandmarker, video: HTMLVideoElement) => {
    if (!activeRef.current) return;

    if (video.readyState >= 2) {
      const result: PoseLandmarkerResult = landmarker.detectForVideo(video, performance.now());
      const pose = result.landmarks[0];

      if (pose) {
        const rightAngle = angleFromVertical(pose[RIGHT_SHOULDER], pose[RIGHT_EAR]);
        const leftAngle = angleFromVertical(pose[LEFT_SHOULDER], pose[LEFT_EAR]);
        const avgAngle = (rightAngle + leftAngle) / 2;

        setAngleDeg(Math.round(avgAngle));
        setPosture(
          avgAngle >= GOOD_THRESHOLD_DEG
            ? 'good'
            : avgAngle >= WARNING_THRESHOLD_DEG
            ? 'warning'
            : 'poor'
        );
      }
    }

    rafRef.current = requestAnimationFrame(() => detectLoop(landmarker, video));
  }, []);

  const start = useCallback(
    async (video: HTMLVideoElement) => {
      activeRef.current = true;
      const landmarker = await getPoseLandmarker();
      detectLoop(landmarker, video);
    },
    [detectLoop]
  );

  const stop = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return { posture, angleDeg, start, stop };
}
