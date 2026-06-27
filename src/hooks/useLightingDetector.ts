'use client';

import { useEffect, useRef, useState } from 'react';
import type { LightingStatus } from '@/types';

const DARK_THRESHOLD = 60;   // 0-255 average luma
const BRIGHT_THRESHOLD = 200;
const SAMPLE_INTERVAL_MS = 1_500;

export function useLightingDetector(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean
): { lighting: LightingStatus; lightingScore: number } {
  const [lighting, setLighting] = useState<LightingStatus>('normal');
  const [lightingScore, setLightingScore] = useState(100);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 32;
      canvasRef.current.height = 24; // tiny sample, brightness only
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!ctx || !video || video.readyState < 2) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        // Standard luma weighting.
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuma = sum / (data.length / 4);

      if (avgLuma < DARK_THRESHOLD) {
        setLighting('dark');
        setLightingScore(Math.max(0, Math.round((avgLuma / DARK_THRESHOLD) * 70)));
      } else if (avgLuma > BRIGHT_THRESHOLD) {
        setLighting('bright');
        setLightingScore(85); // bright is workable but not ideal — small penalty
      } else {
        setLighting('normal');
        setLightingScore(100);
      }
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [active, videoRef]);

  return { lighting, lightingScore };
}
