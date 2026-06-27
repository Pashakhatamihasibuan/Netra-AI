'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';
import { useClassSections } from '@/hooks/useClassSections';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useT } from '@/i18n/useT';

const roleRoutes: Record<UserRole, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent:  '/parent/dashboard',
  admin:   '/admin/dashboard',
};

async function fetchRoleFromDB(userId: string, supabase: ReturnType<typeof createClient>): Promise<UserRole | null> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  const role = data?.role as UserRole | undefined;
  return (role && roleRoutes[role]) ? role : null;
}

const roles = [
  { id: 'student' as const, emoji: '🎒', label: 'Siswa',          desc: 'Akses materi & kuis',          color: '#1B8A5A', bg: '#E8F5EE' },
  { id: 'teacher' as const, emoji: '👨‍🏫', label: 'Guru',           desc: 'Kelola materi & pantau kelas', color: '#1B8A5A', bg: '#E8F5EE' },
  { id: 'parent'  as const, emoji: '👨‍👩‍👧', label: 'Orang Tua',     desc: 'Pantau perkembangan anak',     color: '#6D5AE6', bg: '#EEF0FD' },
  { id: 'admin'   as const, emoji: '🏫',  label: 'Kepala Sekolah', desc: 'Kelola kelas & guru',           color: '#C47B10', bg: '#FDF3E0' },
];

// ── Shared field styles ──────────────────────────────────────────────────────
const inp = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B8A5A]/50 focus:border-[#1B8A5A] transition-colors placeholder:text-gray-400';
const lbl = 'block text-xs font-medium text-gray-500 mb-1.5';
const err = (msg: string) => (
  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
    <span className="mt-0.5">⚠️</span> {msg}
  </div>
);
const ok = (msg: string) => (
  <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 whitespace-pre-line flex items-start gap-2">
    <span className="mt-0.5">✅</span><span>{msg}</span>
  </div>
);

// ── Tombol submit ─────────────────────────────────────────────────────────
function SubmitBtn({ loading, label, accent }: { loading: boolean; label: string; accent: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-all hover:opacity-90 active:scale-[0.98]"
      style={{ backgroundColor: accent }}
    >
      {loading ? <span className="flex items-center justify-center gap-2"><Spinner />{label.replace(/^[^…]*/, 'Memproses')}</span> : label}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a10 10 0 00-10 10h4z"/>
    </svg>
  );
}

// ── Toggle tab ───────────────────────────────────────────────────────────────
function TabToggle({ options, value, onChange, accent }: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
          style={value === o.id ? { backgroundColor: accent, color: '#fff' } : { color: '#6B7280' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── STUDENT FORM ─────────────────────────────────────────────────────────────
const GRADE_OPTIONS = [
  { value: '1', label: 'Kelas 1 SD' }, { value: '2', label: 'Kelas 2 SD' },
  { value: '3', label: 'Kelas 3 SD' }, { value: '4', label: 'Kelas 4 SD' },
  { value: '5', label: 'Kelas 5 SD' }, { value: '6', label: 'Kelas 6 SD' },
];

function StudentForm() {
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [accessCode, setCode]   = useState('');
  const [fullName, setName]     = useState('');
  const [gradeLevel, setGrade]  = useState('3');
  const [sectionId, setSectionId] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const { sections, loading: secLoading } = useClassSections(mode === 'register' ? gradeLevel : null);
  useEffect(() => { setSectionId(''); }, [gradeLevel]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const res = await fetch('/api/student/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: accessCode.trim().toUpperCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login gagal.');
      window.location.href = '/student/dashboard';
    } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); }
    finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null);
    if (!sectionId) { setError('Pilih kelas spesifikmu terlebih dahulu.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/student/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: fullName.trim(), gradeLevel, classSectionId: sectionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');
      setInfo(`Kode Aksesmu: ${data.accessCode}\nPIN Orang Tua: ${data.parentPin}\n\nSimpan kode akses ini — kamu butuhkan untuk login.`);
      setMode('login'); setCode(data.accessCode);
    } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <TabToggle options={[{ id:'login', label:'🔓 Masuk' }, { id:'register', label:'📝 Daftar' }]} value={mode} onChange={(v) => { setMode(v as any); setError(null); setInfo(null); }} accent="#1B8A5A" />
      {info && ok(info)}
      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className={lbl}>Kode Akses</label>
            <input className={`${inp} text-center tracking-[0.3em] uppercase font-mono text-base`} placeholder="XXXXXXXX" value={accessCode} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} required autoFocus />
            <p className="text-[11px] text-gray-400 mt-1">8 karakter yang kamu dapat saat mendaftar.</p>
          </div>
          {error && err(error)}
          <SubmitBtn loading={loading} label="Masuk" accent="#1B8A5A" />
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label className={lbl}>Nama Lengkap</label>
            <input className={inp} placeholder="Contoh: Budi Santoso" value={fullName} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className={lbl}>Tingkat Kelas</label>
            <select className={inp} value={gradeLevel} onChange={(e) => setGrade(e.target.value)} required>
              {GRADE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Kelas Spesifik</label>
            {secLoading ? <p className="text-xs text-gray-400 py-1">Memuat kelas…</p>
              : sections.length === 0 ? <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">Belum ada kelas {gradeLevel} SD. Hubungi Kepala Sekolah.</p>
              : (
                <select className={inp} value={sectionId} onChange={(e) => setSectionId(e.target.value)} required>
                  <option value="">Pilih kelas…</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.label ?? `${s.class_level} SD ${s.section}`}{s.homeroom_teacher_name ? ` — Wali: ${s.homeroom_teacher_name}` : ''}</option>)}
                </select>
              )}
          </div>
          {error && err(error)}
          <SubmitBtn loading={loading} label="Daftar Sekarang" accent="#1B8A5A" />
          <p className="text-[11px] text-gray-400 text-center">Tidak perlu email. Kamu akan mendapat kode akses untuk login.</p>
        </form>
      )}
    </div>
  );
}

// ── TEACHER FORM ─────────────────────────────────────────────────────────────
const GRADES = ['1', '2', '3', '4', '5', '6'];

function TeacherForm() {
  const params = useSearchParams();
  const redirectTo = params.get('redirectTo');
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPass]     = useState('');
  const [teacherType, setType]  = useState<'homeroom' | 'subject'>('subject');
  const [subject, setSubject]   = useState('');
  const [grades, setGrades]     = useState<string[]>([]);
  const [homeroomGrade, setHGrade] = useState('3');
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  function toggleGrade(g: string) { setGrades((p) => p.includes(g) ? p.filter((x) => x !== g) : [...p, g]); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setInfo(null); setLoading(true);
    if (mode === 'signup') {
      if (teacherType === 'subject' && (!subject.trim() || grades.length === 0)) { setError('Isi mata pelajaran dan pilih minimal satu kelas.'); setLoading(false); return; }
      try {
        const res = await fetch('/api/teacher/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, teacherType, subject: teacherType === 'subject' ? subject.trim() : undefined, gradeLevels: teacherType === 'subject' ? grades : undefined, homeroomGrade: teacherType === 'homeroom' ? homeroomGrade : undefined }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');
        if (data.autoSignedIn) { window.location.href = redirectTo ?? roleRoutes.teacher; return; }
        setInfo(data.message ?? 'Akun dibuat. Silakan masuk.'); setMode('signin');
      } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); }
      finally { setLoading(false); } return;
    }
    const supabase = createClient();
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error('Email atau kata sandi salah.');
      if (!data.session) throw new Error('Sesi tidak terbentuk. Coba lagi.');
      let dbRole = await fetchRoleFromDB(data.user.id, supabase);
      if (!dbRole) { const m = data.user.user_metadata?.role as UserRole | undefined; dbRole = (m && roleRoutes[m]) ? m : 'teacher'; }
      window.location.href = redirectTo ?? roleRoutes[dbRole];
    } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <TabToggle options={[{ id:'signin', label:'🔓 Masuk' }, { id:'signup', label:'📝 Daftar' }]} value={mode} onChange={(v) => { setMode(v as any); setError(null); setInfo(null); }} accent="#1B8A5A" />
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && <div><label className={lbl}>Nama Lengkap</label><input className={inp} placeholder="Nama sesuai SK" value={name} onChange={(e) => setName(e.target.value)} required /></div>}
        <div><label className={lbl}>Email</label><input type="email" className={inp} placeholder="guru@sekolah.sch.id" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div><label className={lbl}>Kata Sandi</label><input type="password" className={inp} placeholder="Min. 6 karakter" value={password} onChange={(e) => setPass(e.target.value)} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></div>
        {mode === 'signup' && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
            <div>
              <label className={lbl}>Tipe Guru</label>
              <TabToggle options={[{ id:'subject', label:'Guru Mata Pelajaran' }, { id:'homeroom', label:'Wali Kelas' }]} value={teacherType} onChange={(v) => setType(v as any)} accent="#1B8A5A" />
            </div>
            {teacherType === 'subject' ? (
              <>
                <div><label className={lbl}>Mata Pelajaran</label><input className={inp} placeholder="Matematika, IPA, IPS…" value={subject} onChange={(e) => setSubject(e.target.value)} required={teacherType === 'subject'} /></div>
                <div>
                  <label className={lbl}>Kelas yang Diajar</label>
                  <div className="flex gap-2 flex-wrap">
                    {GRADES.map((g) => (
                      <button key={g} type="button" onClick={() => toggleGrade(g)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={grades.includes(g) ? { backgroundColor: '#1B8A5A', color: '#fff', borderColor: '#1B8A5A' } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                        {g} SD
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className={lbl}>Kelas yang Ingin Diampu</label>
                <select className={inp} value={homeroomGrade} onChange={(e) => setHGrade(e.target.value)}>
                  {GRADES.map((g) => <option key={g} value={g}>{g} SD</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Penugasan akhir ke section kelas diatur Kepala Sekolah.</p>
              </div>
            )}
          </div>
        )}
        {info && ok(info)}
        {error && err(error)}
        <SubmitBtn loading={loading} label={mode === 'signin' ? 'Masuk sebagai Guru' : 'Daftar sebagai Guru'} accent="#1B8A5A" />
      </form>
    </div>
  );
}

// ── PARENT FORM ───────────────────────────────────────────────────────────────
function ParentForm() {
  const [childName, setChild] = useState('');
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    try {
      const res = await fetch('/api/parent/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ childName: childName.trim(), pin: pin.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login gagal.');
      window.location.href = '/parent/dashboard';
    } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className={lbl}>Nama Anak</label><input className={inp} placeholder="Sesuai nama yang didaftarkan" value={childName} onChange={(e) => setChild(e.target.value)} required /></div>
      <div>
        <label className={lbl}>PIN Orang Tua (6 digit)</label>
        <input className={`${inp} text-center tracking-[0.4em] font-mono text-base`} placeholder="••••••" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required />
        <p className="text-[11px] text-gray-400 mt-1">PIN tersedia di dashboard anak, atau tanyakan langsung.</p>
      </div>
      {error && err(error)}
      <SubmitBtn loading={loading} label="Masuk sebagai Orang Tua" accent="#6D5AE6" />
    </form>
  );
}

// ── ADMIN FORM ────────────────────────────────────────────────────────────────
function AdminForm() {
  const params = useSearchParams();
  const redirectTo = params.get('redirectTo');
  const [mode, setMode]     = useState<'signin' | 'signup'>('signin');
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [password, setPass] = useState('');
  const [code, setCode]     = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null); setLoading(true);
    if (mode === 'signup') {
      try {
        const res = await fetch('/api/admin/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, adminCode: code }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');
        if (data.autoSignedIn) { window.location.href = redirectTo ?? roleRoutes.admin; return; }
        setMode('signin'); setLoading(false);
      } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); setLoading(false); } return;
    }
    const supabase = createClient();
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error('Email atau kata sandi salah.');
      if (!data.session) throw new Error('Sesi tidak terbentuk. Coba lagi.');
      window.location.href = redirectTo ?? roleRoutes.admin;
    } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <TabToggle options={[{ id:'signin', label:'🔓 Masuk' }, { id:'signup', label:'📝 Daftar Pertama Kali' }]} value={mode} onChange={(v) => { setMode(v as any); setError(null); }} accent="#C47B10" />
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && <div><label className={lbl}>Nama Lengkap</label><input className={inp} placeholder="Nama Kepala Sekolah" value={name} onChange={(e) => setName(e.target.value)} required /></div>}
        <div><label className={lbl}>Email</label><input type="email" className={inp} placeholder="kepsek@sekolah.sch.id" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
        <div><label className={lbl}>Kata Sandi</label><input type="password" className={inp} placeholder="Min. 6 karakter" value={password} onChange={(e) => setPass(e.target.value)} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} /></div>
        {mode === 'signup' && (
          <div>
            <label className={lbl}>Kode Admin Sekolah</label>
            <input className={inp} placeholder="Kode dari pengelola sistem" value={code} onChange={(e) => setCode(e.target.value)} required />
            <p className="text-[11px] text-gray-400 mt-1">Tanpa kode ini, akun Kepala Sekolah tidak bisa dibuat.</p>
          </div>
        )}
        {error && err(error)}
        <SubmitBtn loading={loading} label={mode === 'signin' ? 'Masuk sebagai Kepala Sekolah' : 'Daftar sebagai Kepala Sekolah'} accent="#C47B10" />
      </form>
    </div>
  );
}

// ── MAIN LOGIN PAGE ───────────────────────────────────────────────────────────
type Tab = 'student' | 'teacher' | 'parent' | 'admin';

export function LoginPage() {
  const params   = useSearchParams();
  const initRole = params.get('role') as UserRole | null;
  const [selected, setSelected] = useState<Tab | null>(
    initRole && ['student','teacher','parent','admin'].includes(initRole) ? initRole as Tab : null
  );

  const roleConfig = roles.find((r) => r.id === selected);

  // ── Step 1: Choose role ──────────────────────────────────────────────────
  if (!selected) {
    return (
      <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-10">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" className="mx-auto mb-4" aria-hidden="true">
              <ellipse cx="16" cy="16" rx="15" ry="10" stroke="#1B8A5A" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="6" fill="#1B8A5A" />
              <circle cx="16" cy="16" r="3" fill="#0D2B1E" />
              <circle cx="18" cy="14" r="1.2" fill="white" opacity="0.7" />
            </svg>
            <h1 className="font-display font-bold text-2xl text-[#0D2B1E]">Netra AI</h1>
            <p className="text-gray-500 text-sm mt-1">Platform Pembelajaran Cerdas & Sehat</p>
          </div>

          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Pilih peranmu</p>

          <div className="grid grid-cols-2 gap-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelected(role.id)}
                className="group flex flex-col items-start text-left rounded-2xl border-2 border-gray-100 bg-white p-5 hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
              >
                <span className="text-3xl mb-3">{role.emoji}</span>
                <p className="font-semibold text-[#0D2B1E] text-sm">{role.label}</p>
                <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{role.desc}</p>
                <span className="mt-3 text-xs font-semibold" style={{ color: role.color }}>
                  Pilih <span className="group-hover:translate-x-0.5 inline-block transition-transform">→</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-8">
            <LanguageToggle variant="pill" />
            <span className="text-xs text-gray-300">|</span>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Netra AI</p>
          </div>
        </div>
      </main>
    );
  }

  // ── Step 2: Login form ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Back */}
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Role header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ backgroundColor: roleConfig?.bg }}
            >
              {roleConfig?.emoji}
            </div>
            <div>
              <h2 className="font-display font-bold text-[#0D2B1E] text-base">{roleConfig?.label}</h2>
              <p className="text-xs text-gray-400">{roleConfig?.desc}</p>
            </div>
          </div>

          {selected === 'student' && <StudentForm />}
          {selected === 'teacher' && <TeacherForm />}
          {selected === 'parent'  && <ParentForm />}
          {selected === 'admin'   && <AdminForm />}
        </div>

        <div className="flex items-center justify-center gap-3 mt-5">
          <LanguageToggle variant="pill" />
          <span className="text-xs text-gray-300">|</span>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Netra AI</p>
        </div>
      </div>
    </main>
  );
}
