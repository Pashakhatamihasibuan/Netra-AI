import { NavBar } from '@/components/NavBar';

const links = [
  { href: '/student/dashboard', label: '🏠 Dashboard' },
  { href: '/student/materials',  label: '📚 Materi' },
  { href: '/student/health',     label: '💚 Riwayat Kesehatan' },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <NavBar title="Netra AI" role="student" links={links} />
      <main className="max-w-5xl mx-auto px-5 py-7 space-y-5">
        {children}
      </main>
    </div>
  );
}
