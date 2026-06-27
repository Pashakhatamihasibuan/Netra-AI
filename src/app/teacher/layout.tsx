import { NavBar } from '@/components/NavBar';

const links = [
  { href: '/teacher/dashboard', label: '🏠 Dashboard' },
  { href: '/teacher/quiz/new',  label: '➕ Kuis Baru' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <NavBar title="Netra AI" role="teacher" links={links} />
      <main className="max-w-5xl mx-auto px-5 py-7 space-y-5">
        {children}
      </main>
    </div>
  );
}
