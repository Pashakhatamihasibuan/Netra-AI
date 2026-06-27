import { NavBar } from '@/components/NavBar';

const links = [
  { href: '/admin/dashboard', label: '🏠 Dashboard' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <NavBar title="Netra AI" role="admin" links={links} />
      <main className="max-w-5xl mx-auto px-5 py-7 space-y-5">
        {children}
      </main>
    </div>
  );
}
