'use client';

import Link from 'next/link';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useT } from '@/i18n/useT';

export default function LandingPage() {
  const { t, lang } = useT();

  const roles = [
    { id: 'student', emoji: '🎒', titleKey: 'student', descKey: 'student_desc', tagKey: 'student_tag', href: '/login?role=student', accent: '#1B8A5A' },
    { id: 'teacher', emoji: '👨‍🏫', titleKey: 'teacher', descKey: 'teacher_desc', tagKey: 'teacher_tag', href: '/login?role=teacher', accent: '#1B8A5A' },
    { id: 'parent',  emoji: '👨‍👩‍👧', titleKey: 'parent',  descKey: 'parent_desc',  tagKey: 'parent_tag',  href: '/login?role=parent',  accent: '#6D5AE6' },
    { id: 'admin',   emoji: '🏫',  titleKey: 'admin',   descKey: 'admin_desc',   tagKey: 'admin_tag',   href: '/login?role=admin',   accent: '#C47B10' },
  ];

  const features = [
    { icon: '🧠', titleKey: 'adaptive_title', descKey: 'adaptive_desc' },
    { icon: '📏', titleKey: 'distance_title', descKey: 'distance_desc' },
    { icon: '🪑', titleKey: 'posture_title',  descKey: 'posture_desc' },
    { icon: '📊', titleKey: 'report_title',   descKey: 'report_desc' },
  ];

  return (
    <main className="min-h-screen bg-[#FAFAF8] text-[#1A1A18]">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IrisIcon size={28} />
            <span className="font-display font-bold text-[#0D2B1E] text-lg tracking-tight">Netra AI</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle variant="pill" />
            <Link
              href="/login"
              className="text-sm font-semibold px-4 py-1.5 rounded-full bg-[#1B8A5A] text-white hover:bg-[#156B46] transition-colors"
            >
              {t('landing', 'enter')}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D2B1E] via-[#0F3524] to-[#0D2B1E]" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-24 lg:pt-28 lg:pb-32 flex flex-col lg:flex-row items-center gap-14">
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-block text-[#4ECDA0] text-xs font-semibold tracking-widest uppercase mb-5 px-3 py-1.5 rounded-full border border-[#4ECDA0]/30 bg-[#4ECDA0]/10">
              {t('landing', 'tagline')}
            </span>
            <h1 className="font-display font-bold text-white text-4xl sm:text-5xl lg:text-6xl leading-[1.1] mb-6">
              {lang === 'id' ? (
                <>Belajar lebih{' '}<span className="text-[#4ECDA0]">cerdas</span><br />dan lebih{' '}<span className="text-[#F5C064]">sehat</span></>
              ) : (
                <>Learn{' '}<span className="text-[#4ECDA0]">smarter</span><br />and{' '}<span className="text-[#F5C064]">healthier</span></>
              )}
            </h1>
            <p className="text-white/60 text-base sm:text-lg max-w-md mx-auto lg:mx-0 leading-relaxed mb-8">
              {t('landing', 'hero_desc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/login?role=student"
                className="px-6 py-3 rounded-xl bg-[#4ECDA0] text-[#0D2B1E] font-bold text-sm hover:bg-[#3DB88C] transition-colors shadow-lg shadow-[#4ECDA0]/20">
                {t('landing', 'cta_student')}
              </Link>
              <Link href="/login?role=teacher"
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-colors border border-white/15">
                {t('landing', 'cta_teacher')}
              </Link>
            </div>
          </div>
          <div className="flex-shrink-0"><IrisHero /></div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────────── */}
      <div className="bg-[#0D2B1E]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { n: t('landing', 'stat_roles'), l: t('landing', 'stat_roles_sub') },
            { n: t('landing', 'stat_realtime'), l: t('landing', 'stat_rt_sub') },
            { n: t('landing', 'stat_cv'), l: t('landing', 'stat_cv_sub') },
          ].map(({ n, l }) => (
            <div key={n}>
              <div className="text-white font-bold text-lg font-display">{n}</div>
              <div className="text-white/40 text-xs mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROLE CARDS ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest uppercase text-[#1B8A5A] mb-3">{t('landing', 'roles_title')}</p>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0D2B1E]">{t('landing', 'roles_heading')}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roles.map((role) => (
            <Link key={role.id} href={role.href}
              className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <span className="absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: role.accent + '15', color: role.accent }}>
                {t('roles', role.tagKey)}
              </span>
              <span className="text-3xl mb-4">{role.emoji}</span>
              <p className="font-display font-bold text-[#0D2B1E] text-base mb-1.5">{t('roles', role.titleKey)}</p>
              <p className="text-gray-500 text-xs leading-relaxed flex-1">{t('roles', role.descKey)}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: role.accent }}>
                {t('landing', 'enter')} <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────── */}
      <section className="bg-[#F0FAF5] border-y border-[#D1EDE0]">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#1B8A5A] mb-3">{t('landing', 'features_tag')}</p>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#0D2B1E]">
              {t('landing', 'features_heading')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.titleKey} className="bg-white rounded-2xl p-6 border border-[#D1EDE0]">
                <div className="text-3xl mb-4">{f.icon}</div>
                <p className="font-semibold text-[#0D2B1E] text-sm mb-2">{t('features', f.titleKey)}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{t('features', f.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <IrisIcon size={20} />
          <span className="font-display font-bold text-[#0D2B1E] text-sm">Netra AI</span>
        </div>
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Netra AI · {t('common', 'copyright')}
        </p>
      </footer>
    </main>
  );
}

function IrisIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <ellipse cx="16" cy="16" rx="15" ry="10" stroke="#1B8A5A" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6" fill="#1B8A5A" />
      <circle cx="16" cy="16" r="3" fill="#0D2B1E" />
      <circle cx="18" cy="14" r="1.2" fill="white" opacity="0.7" />
    </svg>
  );
}

function IrisHero() {
  return (
    <svg width="300" height="300" viewBox="0 0 300 300" fill="none" aria-hidden="true" className="opacity-90">
      <ellipse cx="150" cy="150" rx="140" ry="95" stroke="#4ECDA0" strokeWidth="1" opacity="0.3" />
      <ellipse cx="150" cy="150" rx="125" ry="84" stroke="#4ECDA0" strokeWidth="1" opacity="0.2" />
      <ellipse cx="150" cy="150" rx="110" ry="73" stroke="#4ECDA0" strokeWidth="2" opacity="0.8" />
      <circle cx="150" cy="150" r="50" stroke="#4ECDA0" strokeWidth="1.5" fill="#4ECDA0" fillOpacity="0.08" />
      <circle cx="150" cy="150" r="42" stroke="#4ECDA0" strokeWidth="0.5" opacity="0.4" />
      <circle cx="150" cy="150" r="35" stroke="#4ECDA0" strokeWidth="0.5" opacity="0.3" />
      <circle cx="150" cy="150" r="22" fill="#0D2B1E" />
      <circle cx="150" cy="150" r="16" fill="#1B8A5A" fillOpacity="0.6" />
      <circle cx="158" cy="142" r="7" fill="white" opacity="0.15" />
      <circle cx="161" cy="140" r="3" fill="white" opacity="0.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return <circle key={i} cx={150 + 62 * Math.cos(rad)} cy={150 + 62 * Math.sin(rad)} r="2.5" fill="#4ECDA0" opacity="0.6" />;
      })}
      <line x1="40" y1="150" x2="260" y2="150" stroke="#4ECDA0" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.25" />
    </svg>
  );
}
