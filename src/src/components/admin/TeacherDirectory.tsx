'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Teacher {
  id: string;
  name: string;
  email: string;
  teacher_type: 'homeroom' | 'subject' | null;
  subject: string | null;
  teacher_grade_levels: string[] | null;
  homeroom_class: string | null;
  nip: string | null;
  birth_place: string | null;
  birth_date: string | null;
  address: string | null;
  phone: string | null;
}

export function TeacherDirectory() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/teachers')
      .then((r) => r.json())
      .then((d) => setTeachers(d.teachers ?? []))
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <Card>
      <CardTitle>👩‍🏫 Direktori Guru</CardTitle>
      {loading ? (
        <p className="text-sm text-ink/40 mt-3">Memuat...</p>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-ink/40 mt-3">Belum ada guru terdaftar.</p>
      ) : (
        <div className="space-y-2 mt-3">
          {teachers.map((t) => (
            <div key={t.id} className="rounded-xl2 border border-teal-50 overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggleExpand(t.id)}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-teal-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-ink/40">{t.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {t.teacher_type === 'homeroom' ? (
                    <>
                      <Badge tone="safe">Wali Kelas</Badge>
                      {t.homeroom_class
                        ? <span className="text-xs text-ink/60">{t.homeroom_class}</span>
                        : <span className="text-xs text-amber-700">Belum ditugaskan</span>}
                    </>
                  ) : t.teacher_type === 'subject' ? (
                    <>
                      <Badge>Guru Mapel</Badge>
                      <span className="text-xs text-ink/60">
                        {t.subject} · {(t.teacher_grade_levels ?? []).map((g) => `${g} SD`).join(', ')}
                      </span>
                    </>
                  ) : (
                    <Badge tone="neutral">Profil belum lengkap</Badge>
                  )}
                  <span className="text-ink/30 text-xs">{expanded === t.id ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === t.id && (
                <div className="px-4 pb-4 pt-2 bg-teal-50/30 border-t border-teal-50 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <DetailRow label="NIP" value={t.nip} />
                  <DetailRow label="No. Telepon / WA" value={t.phone} />
                  <DetailRow label="Tempat Lahir" value={t.birth_place} />
                  <DetailRow label="Tanggal Lahir" value={t.birth_date ? new Date(t.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                  <DetailRow label="Alamat" value={t.address} className="sm:col-span-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, value, className = '' }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-ink/40">{label}</p>
      <p className="font-medium mt-0.5 text-sm">{value || <span className="text-ink/30 font-normal">—</span>}</p>
    </div>
  );
}
