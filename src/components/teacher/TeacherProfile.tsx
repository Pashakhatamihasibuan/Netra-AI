'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/useT';

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

export function TeacherProfile() {
  const { t, lang } = useT();
  const inputCls = 'w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400';
  const labelCls = 'block text-xs text-ink/50 mb-1';

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const [editName, setEditName]             = useState('');
  const [editNip, setEditNip]               = useState('');
  const [editBirthPlace, setEditBirthPlace] = useState('');
  const [editBirthDate, setEditBirthDate]   = useState('');
  const [editAddress, setEditAddress]       = useState('');
  const [editPhone, setEditPhone]           = useState('');
  const [editSubject, setEditSubject]       = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/profile');
      if (!res.ok) { console.error('[TeacherProfile] API error:', res.status); return; }
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
    const interval = setInterval(() => { if (!editing) loadProfile(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadProfile, editing]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && !editing) loadProfile();
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
    setSaving(true); setSaveMsg(null); setSaveErr(null);
    try {
      const res = await fetch('/api/teacher/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(), nip: editNip.trim() || null,
          birth_place: editBirthPlace.trim() || null, birth_date: editBirthDate || null,
          address: editAddress.trim() || null, phone: editPhone.trim() || null,
          subject: editSubject.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? t('common', 'error'));
      setData((prev) => prev ? { ...prev, ...d } : d);
      setSaveMsg(t('teacher_profile', 'save_ok'));
      setEditing(false);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : t('common', 'error'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Card><p className="text-sm text-ink/40">{t('teacher_profile', 'loading')}</p></Card>;
  if (!data) return <Card><p className="text-sm text-ink/50 text-center py-6">{t('teacher_profile', 'not_found')}</p></Card>;

  const isHomeroom = data.teacher_type === 'homeroom' || !!data.homeroom_section;

  return (
    <div className="space-y-5">
      {/* Data diri */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>{t('teacher_profile', 'card_title')}</CardTitle>
          {!editing && (
            <button onClick={startEdit} className="text-xs font-medium text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-md transition-colors">
              {t('teacher_profile', 'edit_btn')}
            </button>
          )}
        </div>
        {saveMsg && <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2 mb-3">{saveMsg}</p>}
        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>{t('teacher_profile', 'field_name_req')}</label><input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder={t('teacher_profile', 'ph_name')} /></div>
              <div><label className={labelCls}>{t('teacher_profile', 'field_nip')}</label><input className={inputCls} value={editNip} onChange={(e) => setEditNip(e.target.value)} placeholder={t('teacher_profile', 'ph_nip')} /></div>
              <div><label className={labelCls}>{t('teacher_profile', 'field_birth_place')}</label><input className={inputCls} value={editBirthPlace} onChange={(e) => setEditBirthPlace(e.target.value)} placeholder={t('teacher_profile', 'ph_birth_place')} /></div>
              <div><label className={labelCls}>{t('teacher_profile', 'field_birth_date')}</label><input type="date" className={inputCls} value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>{t('teacher_profile', 'field_address_full')}</label><input className={inputCls} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder={t('teacher_profile', 'ph_address')} /></div>
              <div><label className={labelCls}>{t('teacher_profile', 'field_phone')}</label><input className={inputCls} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder={t('teacher_profile', 'ph_phone')} inputMode="tel" /></div>
              {data.teacher_type === 'subject' && (
                <div><label className={labelCls}>{t('teacher_profile', 'field_subject')}</label><input className={inputCls} value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder={t('teacher_profile', 'ph_subject')} /></div>
              )}
            </div>
            {saveErr && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{saveErr}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? t('teacher_profile', 'saving') : t('teacher_profile', 'save_btn')}</Button>
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-ink/60 hover:text-ink border border-teal-50 rounded-xl2 transition-colors">{t('teacher_profile', 'cancel')}</button>
            </div>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <InfoRow label={t('teacher_profile', 'field_name')} value={data.name} />
            <InfoRow label={t('teacher_profile', 'field_nip')} value={data.nip} />
            <InfoRow label={t('teacher_profile', 'field_birth_place')} value={data.birth_place} />
            <InfoRow label={t('teacher_profile', 'field_birth_date')} value={data.birth_date ? new Date(data.birth_date).toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
            <InfoRow label={t('teacher_profile', 'field_address')} value={data.address} className="sm:col-span-2" />
            <InfoRow label={t('teacher_profile', 'field_phone')} value={data.phone} />
            {data.teacher_type === 'subject' && !isHomeroom && (
              <InfoRow label={t('teacher_profile', 'field_subject')} value={data.subject} />
            )}
            <InfoRow label={t('teacher_profile', 'field_type')} value={isHomeroom ? t('teacher_profile', 'type_homeroom') : data.teacher_type === 'subject' ? t('teacher_profile', 'type_subject') : null} />
          </div>
        )}
      </Card>

      {/* Kelas Binaan */}
      {isHomeroom && (
        <Card>
          <div className="flex items-center justify-between mb-1">
            <CardTitle>{t('teacher_profile', 'homeroom_title')}</CardTitle>
            <button onClick={loadProfile} className="text-xs text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition-colors" title={t('teacher_profile', 'refresh_title')}>
              {t('teacher_profile', 'refresh')}
            </button>
          </div>
          {data.homeroom_section ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
                <div>
                  <p className="text-xl font-display font-semibold text-teal-700">
                    {data.homeroom_section.class_level} SD {data.homeroom_section.section}
                  </p>
                  <p className="text-sm text-ink/50">{t('teacher_profile', 'academic_year')}{data.homeroom_section.academic_year}</p>
                </div>
                <Badge tone="safe">{t('teacher_profile', 'student_count').replace('{n}', String((data.students ?? []).length))}</Badge>
              </div>
              {(data.students ?? []).length === 0 ? (
                <p className="text-sm text-ink/40 mt-3 bg-teal-50 border border-teal-100 rounded-xl2 px-3 py-2">
                  {t('teacher_profile', 'no_students')}
                </p>
              ) : (
                <table className="w-full text-sm mt-4">
                  <thead>
                    <tr className="text-xs text-ink/40 border-b border-teal-50">
                      <th className="text-left py-2">{t('teacher_profile', 'col_name')}</th>
                      <th className="text-left py-2">{t('teacher_profile', 'col_code')}</th>
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
              {t('teacher_profile', 'not_assigned')}
            </p>
          )}
        </Card>
      )}

      {/* Kelas yang diajar (guru mapel) */}
      {data.teacher_type === 'subject' && !isHomeroom && (
        <Card>
          <CardTitle>{t('teacher_profile', 'classes_taught')}</CardTitle>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {(data.grade_counts ?? []).length === 0 ? (
              <p className="text-sm text-ink/40 col-span-2">{t('teacher_profile', 'no_classes')}</p>
            ) : (
              (data.grade_counts ?? []).map((g) => (
                <div key={g.class_level} className="rounded-xl2 border border-teal-50 px-4 py-3 flex items-center justify-between">
                  <span className="font-medium">{g.class_level} SD</span>
                  <Badge>{t('teacher_profile', 'student_count').replace('{n}', String(g.student_count))}</Badge>
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
