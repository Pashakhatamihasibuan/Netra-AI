'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useT } from '@/i18n/useT';

interface Teacher {
  id: string; name: string; email: string;
  teacher_type: 'homeroom' | 'subject' | null;
  subject: string | null; teacher_grade_levels: string[] | null;
  homeroom_class: string | null; nip: string | null;
  birth_place: string | null; birth_date: string | null;
  address: string | null; phone: string | null;
}

export function TeacherDirectory() {
  const { t, lang } = useT();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/teachers').then((r) => r.json()).then((d) => setTeachers(d.teachers ?? [])).finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) { setExpanded((prev) => (prev === id ? null : id)); }

  return (
    <Card>
      <CardTitle>{t('admin', 'dir_title')}</CardTitle>
      {loading ? (
        <p className="text-sm text-ink/40 mt-3">{t('admin', 'dir_loading')}</p>
      ) : teachers.length === 0 ? (
        <p className="text-sm text-ink/40 mt-3">{t('admin', 'dir_empty')}</p>
      ) : (
        <div className="space-y-2 mt-3">
          {teachers.map((te) => (
            <div key={te.id} className="rounded-xl2 border border-teal-50 overflow-hidden">
              <button onClick={() => toggleExpand(te.id)} className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-teal-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                    {te.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{te.name}</p>
                    <p className="text-xs text-ink/40">{te.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {te.teacher_type === 'homeroom' ? (
                    <>
                      <Badge tone="safe">{t('admin', 'badge_homeroom')}</Badge>
                      {te.homeroom_class
                        ? <span className="text-xs text-ink/60">{te.homeroom_class}</span>
                        : <span className="text-xs text-amber-700">{t('admin', 'not_assigned')}</span>}
                    </>
                  ) : te.teacher_type === 'subject' ? (
                    <>
                      <Badge>{t('admin', 'badge_subject')}</Badge>
                      <span className="text-xs text-ink/60">
                        {te.subject} · {(te.teacher_grade_levels ?? []).map((g) => `${g} SD`).join(', ')}
                      </span>
                    </>
                  ) : (
                    <Badge tone="neutral">{t('admin', 'badge_incomplete')}</Badge>
                  )}
                  <span className="text-ink/30 text-xs">{expanded === te.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {expanded === te.id && (
                <div className="px-4 pb-4 pt-2 bg-teal-50/30 border-t border-teal-50 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <DetailRow label={t('admin', 'col_nip')} value={te.nip} />
                  <DetailRow label={t('admin', 'col_phone')} value={te.phone} />
                  <DetailRow label={t('admin', 'col_birth_place')} value={te.birth_place} />
                  <DetailRow label={t('admin', 'col_birth_date')} value={te.birth_date ? new Date(te.birth_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
                  <DetailRow label={t('admin', 'col_address')} value={te.address} className="sm:col-span-2" />
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
