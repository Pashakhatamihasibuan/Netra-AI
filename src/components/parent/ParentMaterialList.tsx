'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { useT } from '@/i18n/useT';

interface ParentMaterial {
  id: string; title: string; description?: string | null;
  content?: string | null; subject?: string | null; class_name?: string | null;
  media: { url: string; media_type: string }[];
  access_status?: 'active' | 'locked' | 'requested' | null;
}

export function ParentMaterialList({ studentId }: { studentId: string }) {
  const { t } = useT();
  const [materials, setMaterials] = useState<ParentMaterial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/materials?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => setMaterials(d.materials ?? []))
      .finally(() => setLoading(false));
  }, [studentId]);

  function statusBadge(status: ParentMaterial['access_status']) {
    if (status === 'active')    return <Badge tone="safe">{t('materials', 'parent_status_active')}</Badge>;
    if (status === 'requested') return <Badge tone="warning">{t('materials', 'parent_status_requested')}</Badge>;
    if (status === 'locked')    return <Badge tone="alert">{t('materials', 'parent_status_locked')}</Badge>;
    return <Badge tone="neutral">{t('materials', 'parent_status_default')}</Badge>;
  }

  return (
    <Card>
      <CardTitle>{t('materials', 'parent_title')}</CardTitle>
      <p className="text-xs text-ink/40 mb-3">{t('materials', 'parent_subtitle')}</p>

      {loading ? (
        <p className="text-sm text-ink/40">{t('materials', 'parent_loading')}</p>
      ) : materials.length === 0 ? (
        <p className="text-sm text-ink/40">{t('materials', 'parent_empty')}</p>
      ) : (
        <div className="space-y-3 mt-2">
          {materials.map((m) => (
            <div key={m.id} className="rounded-xl2 border border-teal-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{m.title}</p>
                    {m.subject && (
                      <span className="text-[10px] bg-coral-50 text-coral-700 px-1.5 py-0.5 rounded font-bold">{m.subject}</span>
                    )}
                  </div>
                  {m.description && <p className="text-xs text-ink/50 mt-0.5">{m.description}</p>}
                </div>
                <div className="shrink-0">{statusBadge(m.access_status ?? null)}</div>
              </div>

              <button
                onClick={() => setExpandedId((prev) => (prev === m.id ? null : m.id))}
                className="mt-2 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
              >
                {expandedId === m.id ? t('materials', 'hide_content') : t('materials', 'show_content')}
              </button>

              {expandedId === m.id && (
                <div className="mt-3 pt-3 border-t border-teal-50 space-y-3">
                  {m.media && m.media.length > 0 && (
                    <div className="space-y-2">
                      {m.media.map((md, i) => (
                        <div key={i}>
                          {md.media_type === 'image' && (
                            <img src={md.url} alt="" loading="lazy" decoding="async" className="max-w-full rounded-xl2 border border-teal-50" />
                          )}
                          {md.media_type === 'video' && (
                            <video src={md.url} controls className="w-full rounded-xl2" />
                          )}
                          {(md.media_type === 'document' || md.media_type === 'presentation') && (
                            <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-xl2 px-3 py-2">
                              <span>{md.media_type === 'document' ? t('materials', 'doc_pdf') : t('materials', 'doc_ppt')}</span>
                              <a href={md.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 underline ml-auto">
                                {t('materials', 'show_content')}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.content ? (
                    <div className="prose prose-sm max-w-none text-ink/80 whitespace-pre-wrap text-sm">{m.content}</div>
                  ) : (
                    <p className="text-xs text-ink/40 italic">{t('materials', 'no_content')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
