import type { Metadata } from 'next';
import { NavBar } from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Dashboard Guru',
  description: 'Kelola kuis, materi, dan pantau progres siswa.',
  robots: { index: false, follow: false },
};

const links = [
  { href: '/teacher/dashboard', labelKey: 'nav.dashboard' },
  { href: '/teacher/quiz/new',  labelKey: 'nav.new_quiz' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <NavBar title="Netra AI" role="teacher" links={links} />
      <main id="main-content" className="max-w-5xl mx-auto px-5 py-7 space-y-5">
        {children}
      </main>
    </div>
  );
}
