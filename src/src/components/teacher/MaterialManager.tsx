'use client';

// src/components/teacher/MaterialManager.tsx
// Panel guru: buat / edit / hapus materi, upload gambar/video/dokumen
// (PDF) / presentasi (PPT/PPTX), pilih mata pelajaran + kelas tujuan
// (otomatis tersinkron ke semua siswa kelas itu), atur durasi default
// akses, dan lihat status akses tiap siswa per materi.

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/store/useAppStore';
import type { MaterialWithStats, MaterialMedia, MediaType } from '@/types';
import { useClassSections } from '@/hooks/useClassSections';
import { useT } from '@/i18n/useT';

interface DraftMedia extends Partial<MaterialMedia> {
  media_type: MediaType;
  url: string;
  fileName?: string;
  uploading?: boolean;
}

const emptyDraft = {
  title: '',
  description: '',
  content: '',
  subject: '' as string,
  class_level: '' as string,
  target_section_id: '' as string,
  default_duration_minutes: 120,
};

interface StudentAccessRow {
  student_id: string;
  student_name: string;
  class_name?: string;
  status: 'active' | 'locked' | 'requested' | 'belum_dibuka' | 'joined' | 'not_joined';
  expires_at: string | null;
  requested_at: string | null;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

function statusBadge(status: StudentAccessRow['status']) {
  switch (status) {
    case 'active': return <Badge tone="safe">Aktif</Badge>;
    case 'requested': return <Badge tone="warning">Minta izin</Badge>;
    case 'locked': return <Badge tone="alert">Terkunci</Badge>;
    default: return <Badge tone="neutral">Belum dibuka</Badge>;
  }
}

function mediaKindFromFile(file: File): MediaType | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'document';
  if (
    file.type.includes('presentation') ||
    /\.(ppt|pptx)$/i.test(file.name)
  ) return 'presentation';
  return null;
}

function maxSizeFor(type: MediaType): number {
  if (type === 'video') return 25 * 1024 * 1024;       // 25MB
  if (type === 'image') return 4 * 1024 * 1024;        // 4MB
  return 20 * 1024 * 1024;                              // 20MB untuk PDF/PPT
}

export function MaterialManager() {
  const { t } = useT();
  const user = useAppStore((s) => s.user);
  const { sections: classSections, loading: sectionsLoading } = useClassSections();
  const gradeOptions = Array.from(
    new Map(
      classSections.map((cs) => [cs.class_level, cs.class_level])
    ).values()
  ).sort((a, b) => Number(a) - Number(b));
  const [materials, setMaterials] = useState<MaterialWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const sectionsForGrade = classSections.filter((cs) => cs.class_level === draft.class_level);
  const [media, setMedia] = useState<DraftMedia[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accessRows, setAccessRows] = useState<StudentAccessRow[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/materials');
      const data = await res.json();
      setMaterials(data.materials ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  function resetForm() {
    setDraft({ ...emptyDraft });
    setMedia([]);
    setEditingId(null);
    setError(null);
  }

  function startEdit(m: MaterialWithStats) {
    setEditingId(m.id);
    setDraft({
      title: m.title,
      description: m.description ?? '',
      content: m.content ?? '',
      subject: m.subject ?? '',
      class_level: m.class_level ?? '',
      target_section_id: m.target_section_id ?? '',
      default_duration_minutes: m.default_duration_minutes,
    });
    setMedia(m.media.map((md) => ({ ...md })));
    setFormOpen(true);
    setError(null);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const kind = mediaKindFromFile(file);
      if (!kind) {
        alert(t('materials', 'unsupported_file', { file: file.name }));
        return;
      }

      const maxSize = maxSizeFor(kind);
      if (file.size > maxSize) {
        alert(t('materials', 'max_size', { file: file.name, size: String(Math.round(maxSize / 1024 / 1024)) }));
        return;
      }

      const tempId = `uploading-${Date.now()}-${Math.random()}`;
      const dm = { media_type: kind, url: '', fileName: file.name, uploading: true, id: tempId } as DraftMedia;
      setMedia((prev) => [...prev, dm]);

      try {
        const supabase = createClient();
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: upErr } = await supabase.storage.from('materials_media').upload(filePath, file);
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage.from('materials_media').getPublicUrl(filePath);

        setMedia((prev) => prev.map((m) =>
          m.id === tempId ? { media_type: kind, url: publicUrl, fileName: file.name, uploading: false } : m
        ));
      } catch (err: any) {
        console.error('Upload failed:', err);
        alert(t('materials', 'upload_err', { file: file.name, err: err.message }));
        setMedia((prev) => prev.filter((m) => m !== dm));
      }
    }

    e.target.value = '';
  }

  function removeMedia(idx: number) {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    if (!draft.subject.trim()) { setError('Mata pelajaran wajib diisi.'); return; }
    if (!draft.class_level) { setError('Pilih kelas tujuan materi.'); return; }
    if (media.some((m) => m.uploading)) {
      setError('Tunggu unggahan media selesai dulu.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        content: draft.content.trim(),
        subject: draft.subject.trim(),
        class_level: draft.class_level,
        target_section_id: draft.target_section_id || null,
        default_duration_minutes: Number(draft.default_duration_minutes) || 120,
        media: media.map((m) => ({ media_type: m.media_type, url: m.url })),
      };

      const url = editingId ? `/api/teacher/materials/${editingId}` : '/api/teacher/materials';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal menyimpan materi.');

      resetForm();
      setFormOpen(false);
      loadMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus materi ini? Semua media dan status akses siswa untuk materi ini ikut terhapus.')) return;
    const res = await fetch(`/api/teacher/materials/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(t('materials', 'delete_err') + (data.error ?? t('dashboard', 'error_generic')));
    }
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadAccess(id);
  }

  async function loadAccess(id: string) {
    setAccessLoading(true);
    setAccessRows([]);
    try {
      const [accessRes, joinsRes] = await Promise.all([
        fetch(`/api/teacher/materials/${id}/access`),
        fetch(`/api/teacher/materials/${id}/joins`),
      ]);
      const accessData = await accessRes.json();
      const joinsData = joinsRes.ok ? await joinsRes.json() : { joined: [], not_joined: [] };

      // Merge: siswa yang sudah join + siswa yang belum join
      const accessMap = new Map((accessData.students ?? []).map((a: any) => [a.student_id, a]));

      const allRows: StudentAccessRow[] = [
        ...(joinsData.joined ?? []).map((s: any) => ({
          student_id: s.student_id,
          student_name: s.student_name,
          class_name: s.class_name,
          status: (accessMap.get(s.student_id) as any)?.status ?? 'joined',
          expires_at: (accessMap.get(s.student_id) as any)?.expires_at ?? null,
          requested_at: (accessMap.get(s.student_id) as any)?.requested_at ?? null,
        })),
        ...(joinsData.not_joined ?? []).map((s: any) => ({
          student_id: s.student_id,
          student_name: s.student_name,
          class_name: s.class_name,
          status: 'not_joined' as const,
          expires_at: null,
          requested_at: null,
        })),
      ];
      setAccessRows(allRows);
    } finally {
      setAccessLoading(false);
    }
  }

  async function manualOpen(materialId: string, studentId: string) {
    const raw = prompt(t('materials', 'open_access_prompt'), '120');
    if (!raw) return;
    const duration = parseInt(raw, 10);
    if (!duration || duration <= 0) { alert(t('materials', 'open_access_err')); return; }

    const res = await fetch(`/api/teacher/materials/${materialId}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, duration_minutes: duration }),
    });
    if (res.ok) {
      toggleExpand(materialId);
      toggleExpand(materialId);
      loadAccess(materialId);
    } else {
      alert(t('materials', 'open_access_fail'));
    }
  }

  function mediaIcon(type: MediaType) {
    if (type === 'document') return '📄';
    if (type === 'presentation') return '📊';
    return null;
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="mb-0">{editingId ? 'Edit Materi' : 'Buat Materi Baru'}</CardTitle>
          {!formOpen && (
            <Button onClick={() => { resetForm(); setFormOpen(true); }}>+ Materi Baru</Button>
          )}
        </div>

        {formOpen && (
          <form onSubmit={handleSubmit} className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-ink/50 mb-1 block">Judul materi</label>
              <input
                className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Mis. Bagian-bagian Mata Manusia"
                required
              />
            </div>

            <div>
              <label className="text-xs text-ink/50 mb-1 block">Deskripsi singkat (opsional)</label>
              <input
                className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ringkasan satu baris"
              />
            </div>

            <div>
              <label className="text-xs text-ink/50 mb-1 block">Isi materi</label>
              <textarea
                className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                rows={6}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Tulis penjelasan materi di sini..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink/50 mb-1 block">Mata pelajaran</label>
                <input
                  className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  placeholder="Misal: IPA"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-ink/50 mb-1 block">Kelas tujuan</label>
                <select
                  className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={draft.class_level}
                  onChange={(e) => setDraft({ ...draft, class_level: e.target.value, target_section_id: '' })}
                  required
                  disabled={sectionsLoading}
                >
                  <option value="">{sectionsLoading ? 'Memuat kelas...' : 'Pilih kelas...'}</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>{`Kelas ${grade} SD`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink/50 mb-1 block">Kelas spesifik (opsional)</label>
                <select
                  className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={draft.target_section_id}
                  onChange={(e) => setDraft({ ...draft, target_section_id: e.target.value })}
                  disabled={!draft.class_level || sectionsLoading}
                >
                  <option value="">Semua kelas {draft.class_level ? `${draft.class_level} SD` : ''}</option>
                  {sectionsForGrade.map((cs) => (
                    <option key={cs.id} value={cs.id}>{cs.label ?? `${cs.class_level} SD ${cs.section}`}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-ink/50 mb-1 block">Durasi akses default (menit)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                value={draft.default_duration_minutes}
                onChange={(e) => setDraft({ ...draft, default_duration_minutes: Number(e.target.value) })}
              />
              <p className="text-[10px] text-ink/40 mt-1">120 menit = 2 jam (default). Berlaku saat siswa pertama kali membuka materi.</p>
            </div>

            <div>
              <label className="text-xs text-ink/50 mb-1 block">Gambar / video / PDF / PPT</label>
              <input
                type="file"
                accept="image/*,video/*,application/pdf,.pdf,.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                multiple
                onChange={handleUpload}
                className="text-sm"
              />
              {media.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {media.map((m, i) => (
                    <div key={m.id ?? i} className="relative rounded-xl2 border border-teal-50 overflow-hidden bg-cream aspect-video flex items-center justify-center">
                      {m.uploading ? (
                        <span className="text-xs text-ink/40">Mengunggah...</span>
                      ) : m.media_type === 'image' ? (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      ) : m.media_type === 'video' ? (
                        <video src={m.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center px-2">
                          <span className="text-2xl">{mediaIcon(m.media_type)}</span>
                          <span className="text-[10px] text-ink/50 truncate w-full">{m.fileName ?? (m.media_type === 'document' ? 'Dokumen PDF' : 'Presentasi')}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs leading-none flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Materi'}</Button>
              <Button type="button" variant="ghost" onClick={() => { resetForm(); setFormOpen(false); }}>Batal</Button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <CardTitle>Materi Saya</CardTitle>
        {loading ? (
          <p className="text-sm text-ink/40 mt-3">Memuat...</p>
        ) : materials.length === 0 ? (
          <div className="text-center py-10 text-ink/40">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm">Belum ada materi. Buat materi pertamamu di atas.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-3">
            {materials.map((m) => (
              <div key={m.id} className="rounded-xl2 border border-teal-50 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{m.title}</p>
                      {m.subject && <span className="text-[10px] bg-coral-50 text-coral-700 px-1.5 py-0.5 rounded font-bold">{m.subject}</span>}
                    </div>
                    {m.description && <p className="text-xs text-ink/50 mt-0.5">{m.description}</p>}
                    <p className="text-xs text-ink/30 mt-1">
                      {m.class_name ?? 'Semua kelas'} · Durasi default {m.default_duration_minutes} menit · {m.media.length} media
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {m.active_count > 0 && <Badge tone="safe">{m.active_count} aktif</Badge>}
                      {m.pending_requests > 0 && <Badge tone="warning">{m.pending_requests} minta izin</Badge>}
                    </div>

                    {/* Join Code */}
                    {m.join_code && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2">
                        <div>
                          <p className="text-[10px] text-teal-600 font-medium">KODE MATERI — bagikan ke siswa</p>
                          <p className="font-mono font-bold text-teal-800 text-lg tracking-widest">{m.join_code}</p>
                        </div>
                        <button
                          onClick={() => {
                            copyToClipboard(m.join_code!);
                            setCopiedCode(m.join_code!);
                            setTimeout(() => setCopiedCode(null), 2000);
                          }}
                          className="ml-2 text-xs text-teal-600 hover:text-teal-800 bg-white border border-teal-200 px-2 py-1 rounded-md transition-colors"
                        >
                          {copiedCode === m.join_code ? '✅ Disalin!' : '📋 Salin'}
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => startEdit(m)} className="text-xs font-medium text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition-colors">
                        ✎ Edit
                      </button>
                      <button onClick={() => toggleExpand(m.id)} className="text-xs font-medium text-ink/60 hover:text-ink bg-cream hover:bg-teal-50 px-2.5 py-1 rounded-md transition-colors">
                        {expandedId === m.id ? 'Tutup status' : '👥 Status siswa'}
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="text-xs font-medium text-alertred-700 hover:text-alertred-900 bg-alertred-50 hover:bg-alertred-100 px-2.5 py-1 rounded-md transition-colors">
                        🗑 Hapus
                      </button>
                    </div>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className="mt-3 pt-3 border-t border-teal-50">
                    {accessLoading ? (
                      <p className="text-xs text-ink/40">Memuat status siswa...</p>
                    ) : accessRows.length === 0 ? (
                      <p className="text-xs text-ink/40">Belum ada siswa di cakupan materi ini.</p>
                    ) : (
                      <>
                        <div className="flex gap-3 mb-2 text-xs">
                          <span className="text-teal-700 font-medium">
                            ✅ Sudah join: {accessRows.filter((a) => a.status !== 'not_joined').length}
                          </span>
                          <span className="text-amber-700 font-medium">
                            ⏳ Belum join: {accessRows.filter((a) => a.status === 'not_joined').length}
                          </span>
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-ink/40 border-b border-teal-50">
                              <th className="text-left py-1 pr-2">Nama Siswa</th>
                              <th className="text-left py-1 pr-2">Kelas</th>
                              <th className="text-left py-1 pr-2">Status</th>
                              <th className="text-left py-1"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {accessRows.map((a) => (
                              <tr key={a.student_id} className="border-b border-teal-50/50 last:border-0">
                                <td className="py-1.5 pr-2 font-medium">{a.student_name}</td>
                                <td className="py-1.5 pr-2 text-ink/50">{a.class_name ?? '—'}</td>
                                <td className="py-1.5 pr-2">
                                  {a.status === 'not_joined'
                                    ? <Badge tone="neutral">Belum join</Badge>
                                    : a.status === 'active'
                                    ? <Badge tone="safe">Aktif</Badge>
                                    : a.status === 'requested'
                                    ? <Badge tone="warning">Minta izin</Badge>
                                    : a.status === 'locked'
                                    ? <Badge tone="alert">Terkunci</Badge>
                                    : <Badge tone="neutral">Sudah join</Badge>
                                  }
                                </td>
                                <td className="py-1.5 text-right">
                                  {a.status !== 'active' && a.status !== 'not_joined' && (
                                    <button
                                      onClick={() => manualOpen(m.id, a.student_id)}
                                      className="text-teal-600 hover:underline"
                                    >
                                      Buka akses
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
