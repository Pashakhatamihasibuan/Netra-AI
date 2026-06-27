'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/store/useAppStore';
import { useRealtimeMaterialAccess } from '@/hooks/useRealtimeMaterialAccess';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import type { MaterialForStudent } from '@/types';

// ─── Timer jam:menit:detik real-time ───────────────────────────────────────

function useSessionTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0); // detik
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      setElapsed(0);
    } else {
      startRef.current = null;
    }
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (startRef.current !== null) {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// ─── Media Gallery ─────────────────────────────────────────────────────────

function MediaGallery({ media }: { media: MaterialForStudent['media'] }) {
  if (media.length === 0) return null;
  const visual    = media.filter((m) => m.media_type === 'image' || m.media_type === 'video');
  const documents = media.filter((m) => m.media_type === 'document' || m.media_type === 'presentation');
  return (
    <div className="mt-3 space-y-3">
      {visual.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {visual.map((m) => (
            <div key={m.id} className="rounded-xl2 overflow-hidden border border-teal-50 bg-cream">
              {m.media_type === 'image'
                ? <img src={m.url} alt="" className="w-full h-40 object-cover" />
                : <video src={m.url} className="w-full h-40 object-cover" controls />}
            </div>
          ))}
        </div>
      )}
      {documents.map((m) => (
        <div key={m.id}>
        <DocumentViewer url={m.url} type={m.media_type as 'document' | 'presentation'} title={m.title ?? 'dokumen'} />
        </div>
      ))}
    </div>
  );
}

// ─── Material Card ─────────────────────────────────────────────────────────

function MaterialCard({
  material,
  onRequested,
}: {
  material: MaterialForStudent;
  onRequested: () => void;
}) {
  const [open, setOpen]           = useState(false);
  const [requesting, setRequesting] = useState(false);
  const timer                     = useSessionTimer(open);

  const { access } = material;
  // Jika sudah join via kode → akses permanen (abaikan expiry)
  const isJoinedViaCode = material.joined_via_code === true;
  const effectiveStatus = isJoinedViaCode ? 'active' : (
    access.status === 'active' && access.expires_at && new Date(access.expires_at).getTime() <= Date.now()
      ? 'locked'
      : access.status
  );

  async function requestAccess() {
    setRequesting(true);
    try {
      const res = await fetch(`/api/student/materials/${material.id}/request`, { method: 'POST' });
      if (res.ok) onRequested();
    } finally {
      setRequesting(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-base">{material.title}</p>
          {material.description && (
            <p className="text-sm text-ink/60 mt-0.5">{material.description}</p>
          )}
          {material.subject && (
            <p className="text-xs text-ink/40 mt-0.5">📚 {material.subject}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {isJoinedViaCode && <Badge tone="safe">✅ Joined</Badge>}
          {!isJoinedViaCode && effectiveStatus === 'active'    && <Badge tone="safe">Terbuka</Badge>}
          {!isJoinedViaCode && effectiveStatus === 'locked'    && <Badge tone="alert">Terkunci</Badge>}
          {!isJoinedViaCode && effectiveStatus === 'requested' && <Badge tone="warning">Menunggu guru</Badge>}
        </div>
      </div>

      {effectiveStatus === 'active' && (
        <>
          {/* Timer sesi belajar */}
          {open && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs font-mono bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1 rounded-full">
                ⏱ Waktu belajar: {timer}
              </span>
              {!isJoinedViaCode && access.expires_at && (
                <span className="text-xs text-ink/40">
                  (akses sd. {new Date(access.expires_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
              {isJoinedViaCode && (
                <span className="text-xs text-teal-600">🔓 Akses permanen</span>
              )}
            </div>
          )}

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-sm font-medium text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-4 py-2 rounded-xl2 transition-colors"
            >
              {open ? '▲ Tutup Materi' : '▶ Buka Materi'}
            </button>

            {open && (
              <div className="mt-4 space-y-4">
                {/* Computer Vision Monitor — tetap aktif saat baca materi */}
                <div className="rounded-xl2 border border-teal-100 overflow-hidden">
                  <div className="bg-teal-50 px-4 py-2 text-xs font-medium text-teal-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    Monitor Kesehatan Aktif
                  </div>
                  <div className="p-3">
                    <MonitoringPanel />
                  </div>
                </div>

                {/* Isi materi */}
                <div className="text-sm text-ink/80 whitespace-pre-wrap leading-relaxed bg-cream rounded-xl2 p-4 border border-teal-50">
                  {material.content || <span className="text-ink/30 italic">Belum ada isi materi teks.</span>}
                </div>
                <MediaGallery media={material.media} />
              </div>
            )}
          </div>
        </>
      )}

      {effectiveStatus === 'locked' && (
        <div className="mt-3">
          <p className="text-sm text-ink/50 mb-2">
            Waktu akses materi ini sudah habis. Minta izin ke gurumu untuk membukanya kembali.
          </p>
          <Button variant="secondary" onClick={requestAccess} disabled={requesting}>
            {requesting ? 'Mengirim...' : '🔒 Minta Izin ke Guru'}
          </Button>
        </div>
      )}

      {effectiveStatus === 'requested' && (
        <p className="text-sm text-ink/50 mt-3">
          Permintaanmu sudah dikirim. Materi akan terbuka otomatis begitu gurumu menyetujui.
        </p>
      )}
    </Card>
  );
}

// ─── Join Code Form ─────────────────────────────────────────────────────────

function JoinCodeForm({ onJoined }: { onJoined: () => void }) {
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining]   = useState(false);
  const [joinMsg, setJoinMsg]   = useState<string | null>(null);
  const [joinErr, setJoinErr]   = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinErr(null);
    setJoinMsg(null);
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch('/api/student/materials/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal join materi.');
      setJoinMsg(data.message ?? `✅ Berhasil join materi "${data.material?.title}"!`);
      setJoinCode('');
      onJoined();
    } catch (err) {
      setJoinErr(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <Card>
      <CardTitle>🔑 Join Materi Baru</CardTitle>
      <p className="text-xs text-ink/50 mb-3 mt-1">
        Minta kode 6 huruf dari gurumu. Masukkan sekali — akses materi jadi permanen.
      </p>
      <form onSubmit={handleJoin} className="flex gap-2">
        <input
          className="flex-1 rounded-xl2 border border-teal-100 px-3 py-2.5 text-sm uppercase tracking-[0.3em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="XXXXXX"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          maxLength={6}
          autoComplete="off"
        />
        <Button type="submit" disabled={joining || joinCode.length < 6}>
          {joining ? '⏳' : '✓ Join'}
        </Button>
      </form>
      {joinMsg && (
        <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2 mt-2">
          {joinMsg}
        </p>
      )}
      {joinErr && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2 mt-2">
          {joinErr}
        </p>
      )}
    </Card>
  );
}

// ─── Main MaterialList ──────────────────────────────────────────────────────

export function MaterialList() {
  const user = useAppStore((s) => s.user);
  const [materials, setMaterials] = useState<MaterialForStudent[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/student/materials');
      const data = await res.json();
      setMaterials(data.materials ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeMaterialAccess(user ? `student_id=eq.${user.id}` : 'student_id=eq.none', load);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-xl2 bg-teal-50/60 animate-pulse" />
        <div className="h-20 rounded-xl2 bg-teal-50/40 animate-pulse" />
      </div>
    );
  }

  // Pisahkan: joined via kode vs belum join (akses berbasis kelas)
  const joinedMaterials  = materials.filter((m) => m.joined_via_code);
  const classMaterials   = materials.filter((m) => !m.joined_via_code);

  return (
    <div className="space-y-4">
      {/* Form join kode baru */}
      <JoinCodeForm onJoined={load} />

      {/* Materi yang sudah di-join */}
      {joinedMaterials.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-ink/50 px-1">
            📌 Materi yang sudah kamu join ({joinedMaterials.length})
          </p>
          {joinedMaterials.map((m) => (
            <MaterialCard key={m.id} material={m} onRequested={load} />
          ))}
        </div>
      )}

      {/* Materi berbasis kelas (backward compat) */}
      {classMaterials.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-ink/50 px-1">
            🏫 Materi dari kelasmu ({classMaterials.length})
          </p>
          {classMaterials.map((m) => (
            <MaterialCard key={m.id} material={m} onRequested={load} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {materials.length === 0 && (
        <Card>
          <div className="text-center py-10 text-ink/40">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-medium text-ink/60">Belum ada materi</p>
            <p className="text-sm mt-1">Masukkan kode dari gurumu di form di atas.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
