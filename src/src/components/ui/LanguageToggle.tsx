'use client';

import { useLang } from '@/i18n/LanguageContext';

interface LanguageToggleProps {
  /** 'pill' (default) — compact toggle untuk navbar
   *  'flag' — icon bendera lebih besar untuk landing page */
  variant?: 'pill' | 'flag';
  className?: string;
}

const FLAG_ID = () => (
  // Bendera Indonesia — merah putih
  <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
    <rect width="18" height="6" fill="#CE1126"/>
    <rect y="6" width="18" height="6" fill="#ffffff"/>
  </svg>
);

const FLAG_EN = () => (
  // Union Jack simplified
  <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
    <rect width="18" height="12" fill="#012169"/>
    <path d="M0 0L18 12M18 0L0 12" stroke="#fff" strokeWidth="2.4"/>
    <path d="M0 0L18 12M18 0L0 12" stroke="#C8102E" strokeWidth="1.2"/>
    <path d="M9 0V12M0 6H18" stroke="#fff" strokeWidth="3.6"/>
    <path d="M9 0V12M0 6H18" stroke="#C8102E" strokeWidth="2"/>
  </svg>
);

export function LanguageToggle({ variant = 'pill', className = '' }: LanguageToggleProps) {
  const { lang, setLang } = useLang();
  const isID = lang === 'id';

  if (variant === 'flag') {
    return (
      <div className={`flex items-center gap-1 rounded-xl bg-white/10 p-1 ${className}`} role="group" aria-label="Language / Bahasa">
        <button
          onClick={() => setLang('id')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isID ? 'bg-white text-[#0D2B1E] shadow-sm' : 'text-white/70 hover:text-white'
          }`}
          aria-pressed={isID}
          title="Bahasa Indonesia"
        >
          <FLAG_ID />
          <span>ID</span>
        </button>
        <button
          onClick={() => setLang('en')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            !isID ? 'bg-white text-[#0D2B1E] shadow-sm' : 'text-white/70 hover:text-white'
          }`}
          aria-pressed={!isID}
          title="English"
        >
          <FLAG_EN />
          <span>EN</span>
        </button>
      </div>
    );
  }

  // Default: pill variant untuk navbar
  return (
    <div className={`flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 ${className}`} role="group" aria-label="Language / Bahasa">
      <button
        onClick={() => setLang('id')}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
          isID
            ? 'bg-white text-[#0D2B1E] shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-pressed={isID}
        title="Bahasa Indonesia"
      >
        <FLAG_ID />
        <span>ID</span>
      </button>
      <button
        onClick={() => setLang('en')}
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
          !isID
            ? 'bg-white text-[#0D2B1E] shadow-sm'
            : 'text-gray-400 hover:text-gray-600'
        }`}
        aria-pressed={!isID}
        title="English"
      >
        <FLAG_EN />
        <span>EN</span>
      </button>
    </div>
  );
}
