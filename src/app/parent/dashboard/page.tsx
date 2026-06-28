"use client";

// src/app/parent/dashboard/page.tsx

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import dynamic from "next/dynamic";

const HealthScoreCard    = dynamic(() => import("@/components/health/HealthScoreCard").then(m => ({ default: m.HealthScoreCard })), { ssr: false });
const ScreenTimeChart    = dynamic(() => import("@/components/dashboards/ScreenTimeChart").then(m => ({ default: m.ScreenTimeChart })), { ssr: false });
const BadgeList          = dynamic(() => import("@/components/health/BadgeList").then(m => ({ default: m.BadgeList })), { ssr: false });
const LinkChild          = dynamic(() => import("@/components/parent/LinkChild").then(m => ({ default: m.LinkChild })), { ssr: false });
const ParentMonitoringView = dynamic(() => import("@/components/parent/ParentMonitoringView").then(m => ({ default: m.ParentMonitoringView })), { ssr: false });
const ClassOverview      = dynamic(() => import("@/components/parent/ClassOverview").then(m => ({ default: m.ClassOverview })), { ssr: false });
const ParentMaterialList = dynamic(() => import("@/components/parent/ParentMaterialList").then(m => ({ default: m.ParentMaterialList })), { ssr: false });
const ChildQuizResults   = dynamic(() => import("@/components/parent/ChildQuizResults").then(m => ({ default: m.ChildQuizResults })), { ssr: false });
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useT } from "@/i18n/useT";

interface Child {
  id: string;
  name: string;
}

type Section = "ringkasan" | "monitoring" | "nilai" | "waktu" | "materi" | "kelas";

export default function ParentDashboardPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const { t } = useT();

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("ringkasan");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);

  // Sections with translated labels — rebuilt on each render so lang changes apply
  const sections: { id: Section; label: string; icon: string }[] = [
    { id: "ringkasan",  label: t('dashboard', 'section_summary'),    icon: "🩺" },
    { id: "monitoring", label: t('dashboard', 'section_monitoring'),  icon: "📷" },
    { id: "nilai",      label: t('dashboard', 'section_scores'),      icon: "📊" },
    { id: "waktu",      label: t('dashboard', 'section_screentime'),  icon: "⏱️" },
    { id: "materi",     label: t('dashboard', 'section_materials'),   icon: "📚" },
    { id: "kelas",      label: t('dashboard', 'section_class'),       icon: "🏫" },
  ];

  const loadChildren = useCallback(() => {
    setLoading(true);
    fetch('/api/parent/children')
      .then((r) => r.json())
      .then(({ children: list = [] }) => {
        setChildren(list);
        setActiveChildId((prev) => prev ?? list[0]?.id ?? null);
      })
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  }

  const activeChild = children.find((c) => c.id === activeChildId) ?? null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-8 h-8 border-2 border-[#6D5AE6] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">{t('dashboard', 'loading_data')}</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <LinkChild onLinked={loadChildren} />
        </div>
      </div>
    );
  }

  const activeSectionLabel = sections.find((s) => s.id === section)?.label ?? '';

  return (
    <div className="flex min-h-screen bg-[#F7F8FA]">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-white border-r border-gray-100 px-4 py-6">
        <SidebarContent
          childList={children}
          activeChildId={activeChildId}
          setActiveChildId={(id) => { setActiveChildId(id); setSection("ringkasan"); }}
          section={section}
          setSection={setSection}
          showAddChild={showAddChild}
          setShowAddChild={setShowAddChild}
          loadChildren={loadChildren}
          userName={user?.name}
          onLogout={handleLogout}
          sections={sections}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white px-4 py-6 overflow-y-auto shadow-xl">
            <SidebarContent
              childList={children}
              activeChildId={activeChildId}
              setActiveChildId={(id) => { setActiveChildId(id); setSection("ringkasan"); setMobileOpen(false); }}
              section={section}
              setSection={(s) => { setSection(s); setMobileOpen(false); }}
              showAddChild={showAddChild}
              setShowAddChild={setShowAddChild}
              loadChildren={loadChildren}
              userName={user?.name}
              onLogout={handleLogout}
              sections={sections}
            />
          </aside>
        </div>
      )}

      {/* Konten utama */}
      <main className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <ellipse cx="16" cy="16" rx="15" ry="10" stroke="#6D5AE6" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="6" fill="#6D5AE6" />
              <circle cx="16" cy="16" r="3" fill="#0D2B1E" />
              <circle cx="18" cy="14" r="1.2" fill="white" opacity="0.7" />
            </svg>
            <span className="font-display font-bold text-[#0D2B1E] text-base">Netra AI</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle variant="pill" />
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label={t('dashboard', 'open_menu')}
            >
              ☰
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-5 py-7 space-y-5">
          {activeChild && (
            <div className="bg-gradient-to-r from-[#2D1B69] to-[#4A3080] rounded-2xl p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-white/60 text-xs font-medium mb-1">{t('dashboard', 'monitoring')}</p>
                  <h2 className="font-display font-bold text-xl">{activeChild.name}</h2>
                  <p className="text-white/70 text-sm mt-1">{activeSectionLabel}</p>
                </div>
                <div className="text-4xl shrink-0">👨‍👩‍👧</div>
              </div>
            </div>
          )}

          {activeChild && section === "ringkasan" && (
            <div className="grid sm:grid-cols-2 gap-6">
              <HealthScoreCard studentId={activeChild.id} />
              <BadgeList studentId={activeChild.id} />
            </div>
          )}
          {activeChild && section === "monitoring" && <ParentMonitoringView studentId={activeChild.id} />}
          {activeChild && section === "nilai"      && <ChildQuizResults studentId={activeChild.id} />}
          {activeChild && section === "waktu"      && <ScreenTimeChart childId={activeChild.id} />}
          {activeChild && section === "materi"     && <ParentMaterialList studentId={activeChild.id} />}
          {activeChild && section === "kelas"      && <ClassOverview studentId={activeChild.id} />}
        </div>
      </main>
    </div>
  );
}

// ─── Isi sidebar ──────────────────────────────────────────────────────────────

function SidebarContent({
  childList, activeChildId, setActiveChildId, section, setSection,
  showAddChild, setShowAddChild, loadChildren, userName, onLogout, sections,
}: {
  childList: Child[];
  activeChildId: string | null;
  setActiveChildId: (id: string) => void;
  section: Section;
  setSection: (s: Section) => void;
  showAddChild: boolean;
  setShowAddChild: (v: boolean) => void;
  loadChildren: () => void;
  userName?: string;
  onLogout: () => void;
  sections: { id: Section; label: string; icon: string }[];
}) {
  const { t } = useT();

  return (
    <div className="flex flex-col h-full">
      {/* Logo + language toggle */}
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <ellipse cx="16" cy="16" rx="15" ry="10" stroke="#6D5AE6" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="6" fill="#6D5AE6" />
            <circle cx="16" cy="16" r="3" fill="#0D2B1E" />
            <circle cx="18" cy="14" r="1.2" fill="white" opacity="0.7" />
          </svg>
          <div>
            <p className="font-display font-bold text-[#0D2B1E] text-sm leading-none">Netra AI</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{t('dashboard', 'parent_title')}</p>
          </div>
        </div>
        <LanguageToggle variant="pill" />
      </div>

      {childList.length > 1 && (
        <div className="mb-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            {t('dashboard', 'select_child')}
          </p>
          <div className="space-y-1">
            {childList.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChildId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeChildId === c.id ? "bg-[#6D5AE6] text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                👧 {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
        {t('dashboard', 'menu')}
      </p>
      <nav className="space-y-0.5 flex-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              section === s.id
                ? "bg-[#EEF0FD] text-[#4A3080] font-semibold"
                : "text-gray-500 hover:bg-gray-50 hover:text-[#0D2B1E]"
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => setShowAddChild(!showAddChild)}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#6D5AE6] hover:bg-[#EEF0FD] transition-colors"
        >
          {showAddChild ? t('dashboard', 'close_form') : t('dashboard', 'add_child')}
        </button>
        {showAddChild && (
          <div className="mt-2 px-1">
            <LinkChild onLinked={() => { loadChildren(); setShowAddChild(false); }} />
          </div>
        )}
        <div className="flex items-center justify-between px-3 py-2 mt-2">
          <span className="text-xs text-gray-400 truncate">{userName}</span>
          <button
            onClick={onLogout}
            className="text-xs font-semibold text-red-500 hover:text-red-600 shrink-0 transition-colors"
          >
            {t('dashboard', 'logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
