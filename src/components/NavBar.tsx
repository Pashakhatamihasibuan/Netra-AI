'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { useT } from '@/i18n/useT';

type NavLink = { href: string; label?: string; labelKey?: string };

interface NavBarProps {
  title: string;
  role?: 'student' | 'teacher' | 'admin' | 'parent';
  links?: NavLink[];
}

export function NavBar({ title, role, links }: NavBarProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const user     = useAppStore((s) => s.user);
  const setUser  = useAppStore((s) => s.setUser);
  const { t }    = useT();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  }

  const roleColor: Record<string, string> = {
    student: '#1B8A5A',
    teacher: '#1B8A5A',
    admin:   '#C47B10',
    parent:  '#6D5AE6',
  };
  const accent = role ? roleColor[role] : '#1B8A5A';

  function resolveLabel(l: NavLink): string {
    if (l.labelKey) {
      const [sec, key] = l.labelKey.split('.');
      return t(sec as any, key);
    }
    return l.label ?? '';
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-5xl mx-auto px-5">
        <div className="h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <ellipse cx="16" cy="16" rx="15" ry="10" stroke={accent} strokeWidth="1.5"/>
              <circle cx="16" cy="16" r="6" fill={accent}/>
              <circle cx="16" cy="16" r="3" fill="#0D2B1E"/>
              <circle cx="18" cy="14" r="1.2" fill="white" opacity="0.7"/>
            </svg>
            <span className="font-display font-bold text-[#0D2B1E] text-base leading-none">{title}</span>
          </Link>

          {/* Desktop nav links */}
          {links && links.length > 0 && (
            <nav className="hidden sm:flex items-center gap-1 flex-1">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-[#E8F5EE] text-[#1B8A5A]'
                        : 'text-gray-500 hover:text-[#0D2B1E] hover:bg-gray-50'
                    }`}
                  >
                    {resolveLabel(l)}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right: language toggle + user + logout */}
          <div className="flex items-center gap-2 shrink-0">
            <LanguageToggle variant="pill" />
            {user && (
              <span className="hidden sm:block text-xs text-gray-400 max-w-[120px] truncate">
                {user.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-gray-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              {t('nav', 'logout')}
            </button>
          </div>
        </div>

        {/* Mobile nav links */}
        {links && links.length > 0 && (
          <nav className="sm:hidden flex gap-1 pb-2 overflow-x-auto">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`whitespace-nowrap px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    active ? 'bg-[#E8F5EE] text-[#1B8A5A]' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {resolveLabel(l)}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
