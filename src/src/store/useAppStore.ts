'use client';

import { create } from 'zustand';
import type { AppUser, MonsterState, PostureStatus, LightingStatus } from '@/types';

interface AppState {
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;

  // Live monitoring snapshot, updated continuously while a learning session
  // is active. Dashboards and the health-record writer both read from here.
  monsterState: MonsterState;
  distanceCm: number | null;
  posture: PostureStatus;
  lighting: LightingStatus;
  blinkRate: number;
  setMonitoringSnapshot: (snapshot: Partial<{
    monsterState: MonsterState;
    distanceCm: number | null;
    posture: PostureStatus;
    lighting: LightingStatus;
    blinkRate: number;
  }>) => void;

  // Sinyal lintas-komponen: QuizPlayer menaikkan angka ini saat siswa klik
  // "Mulai Kuis", supaya MonitoringPanel (mode compact) tahu harus
  // auto-start kamera tanpa perlu klik manual kedua kali. Pakai counter
  // (bukan boolean) supaya tetap bisa trigger ulang kalau kamera sempat
  // berhenti & quiz lain dimulai dalam sesi browser yang sama.
  cameraAutoStartSignal: number;
  requestCameraAutoStart: () => void;

  // Sama seperti di atas tapi untuk SELESAI: QuizPlayer menaikkan angka ini
  // saat siswa submit/diblokir, supaya MonitoringPanel (compact) otomatis
  // menyimpan health_records sesi itu tanpa perlu klik "Akhiri sesi" manual.
  cameraAutoStopSignal: number;
  requestCameraAutoStop: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  monsterState: 'safe',
  distanceCm: null,
  posture: 'good',
  lighting: 'normal',
  blinkRate: 0,
  setMonitoringSnapshot: (snapshot) => set((state) => ({ ...state, ...snapshot })),

  cameraAutoStartSignal: 0,
  requestCameraAutoStart: () => set((state) => ({ cameraAutoStartSignal: state.cameraAutoStartSignal + 1 })),

  cameraAutoStopSignal: 0,
  requestCameraAutoStop: () => set((state) => ({ cameraAutoStopSignal: state.cameraAutoStopSignal + 1 })),
}));
