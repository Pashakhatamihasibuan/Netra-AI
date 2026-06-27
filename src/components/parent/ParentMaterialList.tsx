'use client';

// src/components/parent/ParentMaterialList.tsx
// Versi read-only dari daftar materi siswa, untuk dashboard orang tua.
// Orang tua bisa melihat isi materi (termasuk PDF/PPT yang diunggah
// guru) persis seperti yang dilihat anaknya, tapi tidak ada tombol
// "minta izin" atau aksi apapun yang mengubah data — murni untuk
// memantau progres belajar anak.

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import type { MaterialMedia } from '@/types';

interface ParentMaterial {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  subject: string | null;
  class_level: string | null;
  media: MaterialMedia[];
  status: 'active' | 'locked' | 'requested' | 'belum_dibuka';
  expires_at: string | null;
}

function statusBadge(status: ParentMaterial['status']) {
  switch (status) {
    case 'active': return <Badge tone="safe">Sedang dibuka anak</Badge>;
    case 'requested': return <Badge tone="warning">Anak minta izin ke guru</Badge>;
    case 'locked': return <Badge tone="alert">Terkunci</Badge>;
    default: return <Badge tone="neutral">Belum dibuka anak</Badge>;
  }
}

export function ParentMaterialList({ studentId }: { studentId: string }) {
  const [materials, setMaterials] = useState<ParentMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/materials?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => setMaterials(d.materials ?? []))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <p className="text-sm text-ink/40">Memuat materi...</p>;

  if (materials.length === 0) {
    return (
      <Card>
        <p className="text-sm text-ink/50 text-center py-6">Belum ada materi untuk kelas anak ini.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CardTitle>Materi Belajar Anak</CardTitle>
      <p className="text-xs text-ink/40 -mt-2">Tampilan ini hanya untuk melihat — kamu tidak bisa mengubah status akses anak.</p>
      {materials.map((m) => (
        <Card key={m.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display font-semibold text-base">{m.title}</p>
                {m.subject && <span className="text-[10px] bg-coral-50 text-coral-700 px-1.5 py-0.5 rounded font-bold">{m.subject}</span>}
              </div>
              {m.description && <p className="text-sm text-ink/60 mt-0.5">{m.description}</p>}
            </div>
            {statusBadge(m.status)}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => setOpenId((id) => (id === m.id ? null : m.id))}
              className="text-sm text-teal-600 hover:underline"
            >
              {openId === m.id ? 'Sembunyikan materi' : 'Lihat isi materi →'}
            </button>
            {openId === m.id && (
              <div className="mt-3 text-sm text-ink/80 whitespace-pre-wrap leading-relaxed">
                {m.content || 'Belum ada isi materi.'}
                {m.media.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {m.media.filter((md) => md.media_type === 'image' || md.media_type === 'video').length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {m.media.filter((md) => md.media_type === 'image' || md.media_type === 'video').map((md) => (
                          <div key={md.id} className="rounded-xl2 overflow-hidden border border-teal-50 bg-cream">
                            {md.media_type === 'image' ? (
                              <img src={md.url} alt="" className="w-full h-40 object-cover" />
                            ) : (
                              <video src={md.url} className="w-full h-40 object-cover" controls />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {m.media.filter((md) => md.media_type === 'document' || md.media_type === 'presentation').map((md) => (
                      <div key={md.id}>
                        <p className="text-xs text-ink/50 mb-1">{md.media_type === 'document' ? '📄 Dokumen PDF' : '📊 Presentasi'}</p>
                        <DocumentViewer url={md.url} type={md.media_type as 'document' | 'presentation'} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
