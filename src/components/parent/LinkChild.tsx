'use client';

// src/components/parent/LinkChild.tsx
// Orang tua menghubungkan diri ke anak dengan memasukkan kode akses anak.

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function LinkChild({ onLinked }: { onLinked?: (childName: string) => void }) {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/parent/link-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: accessCode.trim().toUpperCase() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSuccess(`✅ Berhasil! Kamu sekarang terhubung ke ${d.childName}.`);
      setAccessCode('');
      onLinked?.(d.childName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle>Hubungkan ke Anak</CardTitle>
      <p className="text-sm text-ink/50 mt-1 mb-4">
        Minta kode akses 8 karakter dari anak atau gurunya, lalu masukkan di bawah.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 text-center tracking-widest uppercase font-mono text-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="XXXXXXXX"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
          maxLength={8}
          required
        />
        {error   && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-teal-700">{success}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Menghubungkan...' : 'Hubungkan'}
        </Button>
      </form>
    </Card>
  );
}
