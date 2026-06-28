import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Dashboard Siswa',
  description: 'Akses materi, kerjakan kuis, dan pantau kesehatan belajarmu.',
  robots: { index: false, follow: false },
};

const links = [
  { href: '/student/dashboard', labelKey: 'nav.dashboard' },
  { href: '/student/materials',  labelKey: 'nav.materials' },
  { href: '/student/health',     labelKey: 'nav.health' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <NavBar title="Netra AI" role="student" links={links} />
      <main id="main-content" className="max-w-5xl mx-auto px-5 py-7 space-y-5">
        {children}
      </main>
    </div>
  );
}
