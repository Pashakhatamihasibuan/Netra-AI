'use client';

// src/components/student/ParentPinCard.tsx
// Menampilkan PIN orang tua siswa, disembunyikan secara default (mirip PIN
// ATM) dengan tombol untuk menampilkan/menyalin.

import { useState } from 'react';

export function ParentPinCard({ pin }: { pin: string | null | undefined }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!pin) return null;

  function handleCopy() {
    navigator.clipboard?.writeText(pin!).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl2 bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-sm p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wide text-teal-100">PIN Orang Tua</p>
          <p className="text-2xl font-mono font-bold tracking-[0.3em] mt-1">
            {visible ? pin : '••••••'}
          </p>
          <p className="text-xs text-teal-100/80 mt-1.5 max-w-xs">
            Beri tahu PIN ini ke orang tuamu. Mereka bisa login di halaman utama
            (tab "Orang Tua") dengan nama kamu + PIN ini untuk melihat perkembanganmu.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-xs font-medium bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors"
          >
            {visible ? '🙈 Sembunyikan' : '👁 Tampilkan'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-medium bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? '✓ Tersalin' : '📋 Salin'}
          </button>
        </div>
      </div>
    </div>
  );
}
