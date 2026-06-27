'use client';

// Teacher profile: CRUD nama, NIP, tempat/tanggal lahir, alamat, nomor telepon
// FIX: homeroom_section sekarang dibaca langsung dari class_sections via API,
// sehingga langsung update saat kepala sekolah menugaskan guru sebagai wali kelas.

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface Student { id: string; name: string; access_code: string }
interface HomeroomSection { id: string; class_level: string; section: string; academic_year: string }
interface GradeCount { class_level: string; student_count: number }

interface ProfileData {
  id?: string;
  name: string;
  email?: string;
  teacher_type: 'homeroom' | 'subject' | null;
  subject?: string | null;
  nip?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  address?: string | null;
  phone?: string | null;
  homeroom_section?: HomeroomSection | null;
  students?: Student[];
  grade_counts?: GradeCount[];
}

const inputCls = 'w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';
const labelCls = 'block text-xs text-ink/50 mb-1';

export function TeacherProfile() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  // Edit state
  const [editName, setEditName]             = useState('');
  const [editNip, setEditNip]               = useState('');
  const [editBirthPlace, setEditBirthPlace] = useState('');
  const [editBirthDate, setEditBirthDate]   = useState('');
  const [editAddress, setEditAddress]       = useState('');
  const [editPhone, setEditPhone]           = useState('');
  const [editSubject, setEditSubject]       = useState('');

  // FIX: gunakan useCallback agar bisa dipanggil ulang (refresh)
  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/profile');
      if (!res.ok) {
        console.error('[TeacherProfile] API error:', res.status);
        return;
      }
      const d = await res.json();
      setData(d);
    } catch (err) {
      console.error('[TeacherProfile] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();

    // FIX: polling setiap 30 detik untuk menangkap perubahan dari kepala sekolah
    // (misalnya saat guru di-assign sebagai wali kelas)
    const interval = setInterval(() => {
      // Hanya poll jika tidak sedang edit
      if (!editing) loadProfile();
    }, 30_000);

    return () => clearInterval(interval);
  }, [loadProfile, editing]);

  // FIX: refresh saat tab kembali aktif (user switch tab lalu kembali)
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !editing) {
        loadProfile();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loadProfile, editing]);

  function startEdit() {
    if (!data) return;
    setEditName(data.name ?? '');
    setEditNip(data.nip ?? '');
    setEditBirthPlace(data.birth_place ?? '');
    setEditBirthDate(data.birth_date ?? '');
    setEditAddress(data.address ?? '');
    setEditPhone(data.phone ?? '');
    setEditSubject(data.subject ?? '');
    setEditing(true);
    setSaveMsg(null);
    setSaveErr(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    setSaveErr(null);
    try {
      const res = await fetch('/api/teacher/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          nip: editNip.trim() || null,
          birth_place: editBirthPlace.trim() || null,
          birth_date: editBirthDate || null,
          address: editAddress.trim() || null,
          phone: editPhone.trim() || null,
          subject: editSubject.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Gagal menyimpan.');
      setData((prev) => prev ? { ...prev, ...d } : d);
      setSaveMsg('✅ Profil berhasil disimpan!');
      setEditing(false);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><p className="text-sm text-ink/40">Memuat profil...</p></Card>;
  if (!data) return <Card><p className="text-sm text-ink/50 text-center py-6">Profil tidak ditemukan.</p></Card>;

  // FIX: gunakan effectiveTeacherType — gabungan dari data API dan homeroom_section
  // Sehingga bagian "Kelas Binaan" muncul segera setelah di-assign
  const isHomeroom = data.teacher_type === 'homeroom' || !!data.homeroom_section;

  return (
    <div className="space-y-5">
      {/* ── Kartu data diri ── */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>👤 Data Diri Guru</CardTitle>
          {!editing && (
            <button
              onClick={startEdit}
              className="text-xs font-medium text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-colors"
            >
              ✏️ Edit Profil
            </button>
          )}
        </div>

        {saveMsg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2 mb-3">{saveMsg}</p>}

        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Nama Lengkap *</label>
                <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder="Nama sesuai SK" />
              </div>
              <div>
                <label className={labelCls}>NIP</label>
                <input className={inputCls} value={editNip} onChange={(e) => setEditNip(e.target.value)} placeholder="Nomor Induk Pegawai" />
              </div>
              <div>
                <label className={labelCls}>Tempat Lahir</label>
                <input className={inputCls} value={editBirthPlace} onChange={(e) => setEditBirthPlace(e.target.value)} placeholder="Kota kelahiran" />
              </div>
              <div>
                <label className={labelCls}>Tanggal Lahir</label>
                <input type="date" className={inputCls} value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Alamat Rumah</label>
                <input className={inputCls} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Jalan, kelurahan, kecamatan, kota" />
              </div>
              <div>
                <label className={labelCls}>Nomor Telepon / WA</label>
                <input className={inputCls} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="08xx-xxxx-xxxx" inputMode="tel" />
              </div>
              {data.teacher_type === 'subject' && (
                <div>
                  <label className={labelCls}>Mata Pelajaran</label>
                  <input className={inputCls} value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder="Matematika, IPA, IPS..." />
                </div>
              )}
            </div>
            {saveErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{saveErr}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-ink/60 hover:text-ink border border-teal-50 rounded-xl2 transition-colors">Batal</button>
            </div>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <InfoRow label="Nama Lengkap" value={data.name} />
            <InfoRow label="NIP" value={data.nip} />
            <InfoRow label="Tempat Lahir" value={data.birth_place} />
            <InfoRow label="Tanggal Lahir" value={data.birth_date ? new Date(data.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
            <InfoRow label="Alamat" value={data.address} className="sm:col-span-2" />
            <InfoRow label="No. Telepon / WA" value={data.phone} />
            {/* FIX: tampilkan Mata Pelajaran hanya untuk guru mapel */}
            {data.teacher_type === 'subject' && !isHomeroom && (
              <InfoRow label="Mata Pelajaran" value={data.subject} />
            )}
            {/* FIX: Tipe Guru dihitung dari isHomeroom agar sinkron dengan class_sections */}
            <InfoRow
              label="Tipe Guru"
              value={isHomeroom ? 'Wali Kelas' : data.teacher_type === 'subject' ? 'Guru Mata Pelajaran' : null}
            />
          </div>
        )}
      </Card>

      {/* ── Info kelas binaan (WALI KELAS) ── */}
      {/* FIX: cek isHomeroom (bukan hanya teacher_type) agar langsung tampil
          begitu homeroom_section ada, walau teacher_type di DB belum terupdate */}
      {isHomeroom && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <CardTitle>🏫 Kelas Binaan</CardTitle>
            {/* Tombol refresh manual */}
            <button
              onClick={loadProfile}
              className="text-xs text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition-colors"
              title="Refresh data kelas"
            >
              🔄 Refresh
            </button>
          </div>
          {data.homeroom_section ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                <div>
                  <p className="text-xl font-display font-semibold text-teal-700">
                    {data.homeroom_section.class_level} SD {data.homeroom_section.section}
                  </p>
                  <p className="text-sm text-ink/50">Tahun ajaran {data.homeroom_section.academic_year}</p>
                </div>
                <Badge tone="safe">{(data.students ?? []).length} siswa</Badge>
              </div>
              {(data.students ?? []).length === 0 ? (
                <p className="text-sm text-ink/40 mt-3 bg-teal-50 border border-teal-100 rounded-xl2 px-3 py-2">
                  Belum ada siswa yang terdaftar di kelas ini.
                </p>
              ) : (
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="text-xs text-ink/40 border-b border-teal-50">
                      <th className="text-left py-2">Nama</th>
                      <th className="text-left py-2">Kode Akses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.students ?? []).map((s) => (
                      <tr key={s.id} className="border-b border-teal-50/50 last:border-0">
                        <td className="py-1.5 font-medium">{s.name}</td>
                        <td className="py-1.5 font-mono text-teal-700">{s.access_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl2 px-4 py-3 mt-2">
              Kamu terdaftar sebagai calon wali kelas, tapi belum ditugaskan ke kelas manapun. Hubungi Kepala Sekolah.
            </p>
          )}
        </Card>
      )}

      {/* ── Kelas yang diajar (GURU MAPEL) ── */}
      {data.teacher_type === 'subject' && !isHomeroom && (
        <Card>
          <CardTitle>📚 Kelas yang Diajar</CardTitle>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {(data.grade_counts ?? []).length === 0 ? (
              <p className="text-sm text-ink/40 col-span-2">Belum ada data kelas yang diajar.</p>
            ) : (
              (data.grade_counts ?? []).map((g) => (
                <div key={g.class_level} className="rounded-xl2 border border-teal-50 px-4 py-3 flex items-center justify-between">
                  <span className="font-medium">{g.class_level} SD</span>
                  <Badge>{g.student_count} siswa</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value, className = '' }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-ink/40">{label}</p>
      <p className="font-medium mt-0.5">{value || <span className="text-ink/30 font-normal">—</span>}</p>
    </div>
  );
}
