'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import type { UserRole } from '@/types';

const roleRoutes: Record<UserRole, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent:  '/parent/dashboard',
  admin:   '/admin/dashboard',
};

const GRADE_OPTIONS = [
  { value: '3', label: 'Kelas 3 SD' },
  { value: '4', label: 'Kelas 4 SD' },
  { value: '5', label: 'Kelas 5 SD' },
  { value: '6', label: 'Kelas 6 SD' },
];

interface ClassSectionOption {
  id: string;
  class_level: string;
  section: string;
  homeroom_teacher_name: string | null;
}

async function fetchRoleFromDB(userId: string, supabase: ReturnType<typeof createClient>): Promise<UserRole | null> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  const role = data?.role as UserRole | undefined;
  return (role && roleRoutes[role]) ? role : null;
}

// ─── Formulir Siswa ─────────────────────────────────────────────────────────

function StudentForm() {
  const [mode, setMode]             = useState<'login' | 'register'>('login');
  const [accessCode, setAccessCode] = useState('');
  const [fullName, setFullName]     = useState('');
  const [gradeLevel, setGradeLevel] = useState('3');
  const [classSectionId, setClassSectionId] = useState('');
  const [sections, setSections]     = useState<ClassSectionOption[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [info, setInfo]             = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (mode !== 'register') return;
    setSectionsLoading(true);
    fetch('/api/public/class-sections')
      .then((r) => r.json())
      .then((d) => setSections(d.sections ?? []))
      .finally(() => setSectionsLoading(false));
  }, [mode]);

  const filteredSections = sections.filter((s) => s.class_level === gradeLevel);

  useEffect(() => {
    // Reset pilihan kelas spesifik setiap kali tingkat kelas berubah.
    setClassSectionId('');
  }, [gradeLevel]);

  async function handleStudentLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: accessCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login gagal.');
      window.location.href = '/student/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStudentRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!classSectionId) {
      setError('Pilih kelasmu (mis. 4A atau 4B).');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/student/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), gradeLevel, classSectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');

      setInfo(
        `✅ Pendaftaran berhasil!\n\n` +
        `🔑 Kode Aksesmu: ${data.accessCode}\n` +
        `👨‍👩‍👧 PIN Orang Tua: ${data.parentPin}\n\n` +
        `⚠️ Simpan kode akses ini — kamu butuhkan untuk login kembali.\n` +
        `Beri tahu PIN orang tua ke ayah/ibumu supaya mereka bisa memantau perkembanganmu.`
      );
      setMode('login');
      setAccessCode(data.accessCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab */}
      <div className="flex rounded-xl2 border border-teal-50 overflow-hidden">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); setInfo(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m ? 'bg-teal-600 text-white' : 'text-ink/60 hover:bg-cream'
            }`}
          >
            {m === 'login' ? 'Masuk' : 'Daftar Baru'}
          </button>
        ))}
      </div>

      {info && (
        <div className="text-sm whitespace-pre-line bg-teal-50 border border-teal-200 text-teal-900 rounded-xl2 px-3 py-3">
          {info}
        </div>
      )}

      {/* Form Login */}
      {mode === 'login' && (
        <form onSubmit={handleStudentLogin} className="space-y-3">
          <div>
            <label className="block text-xs text-ink/50 mb-1">Kode Akses (8 huruf)</label>
            <input
              className="w-full rounded-xl2 border border-teal-50 px-4 py-2 text-center tracking-widest uppercase font-mono text-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="XXXXXXXX"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              maxLength={8}
              required
              autoFocus
            />
            <p className="text-[11px] text-ink/40 mt-1">
              8 karakter yang kamu dapatkan saat mendaftar.
            </p>
          </div>
          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Masuk...' : 'Masuk'}
          </Button>
        </form>
      )}

      {/* Form Daftar — nama + kelas + section spesifik */}
      {mode === 'register' && (
        <form onSubmit={handleStudentRegister} className="space-y-3">
          <div>
            <label className="block text-xs text-ink/50 mb-1">Nama Lengkap</label>
            <input
              className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Contoh: Budi Santoso"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Tingkat Kelas</label>
            <select
              className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              required
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-ink/50 mb-1">Kelas Spesifik</label>
            {sectionsLoading ? (
              <p className="text-xs text-ink/40">Memuat daftar kelas...</p>
            ) : filteredSections.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl2 px-3 py-2">
                Belum ada kelas {gradeLevel} SD yang dibuat Kepala Sekolah. Hubungi sekolahmu.
              </p>
            ) : (
              <select
                className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                value={classSectionId}
                onChange={(e) => setClassSectionId(e.target.value)}
                required
              >
                <option value="">Pilih kelas...</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class_level} SD {s.section}{s.homeroom_teacher_name ? ` — Wali kelas: ${s.homeroom_teacher_name}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </Button>
          <p className="text-[11px] text-ink/40 text-center">
            Tidak perlu email atau password. Kamu akan mendapat kode akses untuk login.
          </p>
        </form>
      )}
    </div>
  );
}

// ─── Formulir Guru ───────────────────────────────────────────────────────────

const SUBJECT_GRADE_OPTIONS = ['3', '4', '5', '6'];

function StaffForm() {
  const params     = useSearchParams();
  const redirectTo = params.get('redirectTo');

  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [teacherType, setTeacherType] = useState<'homeroom' | 'subject'>('subject');
  const [subject, setSubject]   = useState('');
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [homeroomGrade, setHomeroomGrade] = useState('3');
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  function navigateToDashboard(userRole: UserRole) {
    window.location.href = redirectTo ?? roleRoutes[userRole];
  }

  function toggleGrade(g: string) {
    setGradeLevels((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'signup') {
      if (teacherType === 'subject' && (!subject.trim() || gradeLevels.length === 0)) {
        setError('Isi mata pelajaran dan pilih minimal satu kelas yang diajar.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/teacher/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name, email, password, teacherType,
            subject: teacherType === 'subject' ? subject.trim() : undefined,
            gradeLevels: teacherType === 'subject' ? gradeLevels : undefined,
            homeroomGrade: teacherType === 'homeroom' ? homeroomGrade : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');

        if (data.autoSignedIn) {
          window.location.href = redirectTo ?? roleRoutes.teacher;
          return;
        }
        setInfo(data.message ?? 'Akun dibuat. Silakan masuk.');
        setMode('signin');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Sign in guru yang sudah punya akun ──────────────────────────────
    const supabase = createClient();
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid login'))
          throw new Error('Email atau kata sandi salah.');
        throw signInError;
      }
      if (!data.session) throw new Error('Sesi tidak terbentuk. Coba lagi.');
      let dbRole = await fetchRoleFromDB(data.user.id, supabase);
      if (!dbRole) {
        const metaRole = data.user.user_metadata?.role as UserRole | undefined;
        dbRole = (metaRole && roleRoutes[metaRole]) ? metaRole : 'teacher';
      }
      navigateToDashboard(dbRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required autoComplete="email"
        />
        <input
          type="password"
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Kata sandi (min. 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />

        {mode === 'signup' && (
          <div className="rounded-xl2 border border-teal-50 p-3 space-y-3">
            <div>
              <label className="block text-xs text-ink/50 mb-1.5">Tipe Guru</label>
              <div className="flex rounded-xl2 border border-teal-50 overflow-hidden">
                {([
                  { id: 'subject', label: 'Guru Mata Pelajaran' },
                  { id: 'homeroom', label: 'Wali Kelas' },
                ] as const).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setTeacherType(o.id)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      teacherType === o.id ? 'bg-teal-600 text-white' : 'text-ink/60 hover:bg-cream'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {teacherType === 'subject' ? (
              <>
                <div>
                  <label className="block text-xs text-ink/50 mb-1">Mata Pelajaran</label>
                  <input
                    className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="Misal: Matematika, IPA, IPS"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required={teacherType === 'subject'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/50 mb-1.5">Kelas yang Diajar</label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_GRADE_OPTIONS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleGrade(g)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          gradeLevels.includes(g)
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'border-teal-50 text-ink/60 hover:bg-cream'
                        }`}
                      >
                        {g} SD
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs text-ink/50 mb-1">Kelas yang Ingin Diampu</label>
                <select
                  className="w-full rounded-xl2 border border-teal-50 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  value={homeroomGrade}
                  onChange={(e) => setHomeroomGrade(e.target.value)}
                >
                  {SUBJECT_GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g} SD</option>
                  ))}
                </select>
                <p className="text-[10px] text-ink/40 mt-1">
                  Kamu akan otomatis ditugaskan ke salah satu section kelas ini yang masih kosong wali kelasnya.
                  Penugasan akhir tetap diatur Kepala Sekolah.
                </p>
              </div>
            )}
          </div>
        )}

        {info && <div className="text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-xl2 px-3 py-2">{info}</div>}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? (mode === 'signin' ? 'Masuk...' : 'Membuat akun...')
            : (mode === 'signin' ? 'Masuk dengan Email' : 'Daftar dengan Email')}
        </Button>
      </form>

      <button
        type="button"
        className="text-sm text-teal-600 underline hover:text-teal-800"
        onClick={() => { setMode((m) => m === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
      >
        {mode === 'signin' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
      </button>
    </div>
  );
}

// ─── Formulir Orang Tua (nama anak + PIN) ───────────────────────────────────

function ParentPinForm() {
  const [childName, setChildName] = useState('');
  const [pin, setPin]             = useState('');
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childName: childName.trim(), pin: pin.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login gagal.');
      window.location.href = '/parent/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-ink/50 mb-1">Nama Anak</label>
        <input
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Sesuai nama yang didaftarkan anak"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-xs text-ink/50 mb-1">PIN Orang Tua (6 digit)</label>
        <input
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 text-center tracking-[0.3em] font-mono text-lg focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="••••••"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          required
        />
        <p className="text-[11px] text-ink/40 mt-1">
          Lihat PIN ini di dashboard anak kamu, atau tanyakan langsung ke anak.
        </p>
      </div>
      {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{error}</div>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Masuk...' : 'Masuk sebagai Orang Tua'}
      </Button>
    </form>
  );
}

// ─── Formulir Kepala Sekolah (admin) ────────────────────────────────────────

function AdminForm() {
  const params     = useSearchParams();
  const redirectTo = params.get('redirectTo');

  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      try {
        const res = await fetch('/api/admin/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, adminCode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Pendaftaran gagal.');

        if (data.autoSignedIn) {
          window.location.href = redirectTo ?? roleRoutes.admin;
          return;
        }
        setMode('signin');
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
        setLoading(false);
      }
      return;
    }

    const supabase = createClient();
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid login'))
          throw new Error('Email atau kata sandi salah.');
        throw signInError;
      }
      if (!data.session) throw new Error('Sesi tidak terbentuk. Coba lagi.');
      window.location.href = redirectTo ?? roleRoutes.admin;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl2 border border-teal-50 overflow-hidden">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m ? 'bg-teal-600 text-white' : 'text-ink/60 hover:bg-cream'
            }`}
          >
            {m === 'signin' ? 'Masuk' : 'Daftar Pertama Kali'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'signup' && (
          <input
            className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Nama lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          type="email"
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required autoComplete="email"
        />
        <input
          type="password"
          className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder="Kata sandi (min. 6 karakter)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required minLength={6}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />
        {mode === 'signup' && (
          <div>
            <input
              className="w-full rounded-xl2 border border-teal-50 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Kode Admin Sekolah"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              required
            />
            <p className="text-[11px] text-ink/40 mt-1">
              Kode rahasia yang diberikan pihak sekolah/pengelola sistem. Tanpa kode ini, akun Kepala Sekolah tidak bisa dibuat.
            </p>
          </div>
        )}
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl2 px-3 py-2">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? (mode === 'signin' ? 'Masuk...' : 'Membuat akun...')
            : (mode === 'signin' ? 'Masuk sebagai Kepala Sekolah' : 'Daftar sebagai Kepala Sekolah')}
        </Button>
      </form>
    </div>
  );
}

// ─── Komponen Utama ──────────────────────────────────────────────────────────

type Tab = 'student' | 'teacher' | 'parent' | 'admin';

export function LoginForm() {
  const params   = useSearchParams();
  const initRole = params.get('role') as UserRole | null;
  const [tab, setTab] = useState<Tab>(
    initRole === 'teacher' ? 'teacher' : initRole === 'parent' ? 'parent' : initRole === 'admin' ? 'admin' : 'student'
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'student', label: 'Siswa',      icon: '🎒' },
    { id: 'teacher', label: 'Guru',       icon: '👨‍🏫' },
    { id: 'parent',  label: 'Orang Tua',  icon: '👨‍👩‍👧' },
    { id: 'admin',   label: 'Kep. Sekolah', icon: '🏫' },
  ];

  return (
    <Card className="w-full max-w-sm">
      <CardTitle>Netra AI</CardTitle>
      <div className="flex rounded-xl2 border border-teal-50 overflow-hidden mb-5 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[25%] py-2 text-[11px] sm:text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-teal-600 text-white' : 'text-ink/60 hover:bg-cream'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'student' && <StudentForm />}
      {tab === 'teacher' && <StaffForm />}
      {tab === 'parent'  && <ParentPinForm />}
      {tab === 'admin'   && <AdminForm />}
    </Card>
  );
}
