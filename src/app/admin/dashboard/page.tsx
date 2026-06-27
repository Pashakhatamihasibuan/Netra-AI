'use client';

import { useState } from 'react';
import { ClassSectionManager } from '@/components/admin/ClassSectionManager';
import { TeacherDirectory } from '@/components/admin/TeacherDirectory';
import type { Metadata } from 'next';

type Tab = 'classes' | 'teachers';

const tabs: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'classes',  label: 'Wali Kelas',      icon: '🏫', desc: 'Kelola section & penugasan wali kelas' },
  { id: 'teachers', label: 'Direktori Guru',  icon: '👩‍🏫', desc: 'Lihat semua guru yang terdaftar' },
];

export default function AdminDashboardPage() {
  const [tab, setTab] = useState<Tab>('classes');

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4A2E00] to-[#7A4A00] rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white/60 text-xs font-medium mb-1">Dashboard</p>
            <h1 className="font-display font-bold text-xl">Kepala Sekolah</h1>
            <p className="text-white/70 text-sm mt-1">Kelola struktur kelas, wali kelas, dan daftar guru.</p>
          </div>
          <div className="text-4xl shrink-0">🏫</div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center sm:items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all ${
              tab === t.id
                ? 'border-[#C47B10] bg-[#FDF3E0]'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <div>
              <p className={`font-semibold text-sm ${tab === t.id ? 'text-[#7A4A00]' : 'text-[#0D2B1E]'}`}>{t.label}</p>
              <p className="text-xs text-gray-400 hidden sm:block mt-0.5">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {tab === 'classes'  && <ClassSectionManager />}
      {tab === 'teachers' && <TeacherDirectory />}
    </div>
  );
}
