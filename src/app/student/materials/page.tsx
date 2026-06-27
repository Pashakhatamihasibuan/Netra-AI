import { MaterialList } from '@/components/student/MaterialList';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Materi Pelajaran' };

export default function StudentMaterialsPage() {
  return (
    <div className="animate-fade-up space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl text-[#0D2B1E]">📚 Materi Pelajaran</h1>
        <p className="text-sm text-gray-500 mt-1">Join materi dengan kode dari gurumu. Akses permanen setelah join.</p>
      </div>
      <MaterialList />
    </div>
  );
}
