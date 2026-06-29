'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { DocumentViewer } from '@/components/shared/DocumentViewer';
import { useT } from '@/i18n/useT';
import type { MaterialRow, MaterialMedia, MaterialAccess } from '@/types';

// Shape returned by /api/student/materials
interface StudentMaterial extends MaterialRow {
  media: MaterialMedia[];
  access: MaterialAccess | null;
  joined_via_code: boolean;
}

export function MaterialList() {
  const { t } = useT();
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [loading, setLoading]     = useState(true);
  const [joinCode, setJoinCode]   = useState('');
  const [joining, setJoining]     = useState(false);
  const [openId, setOpenId]       = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/student/materials');
      const data = await res.json();
      setMaterials(data.materials ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res  = await fetch('/api/student/materials/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode.trim().toUpperCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('common', 'error'));
      setJoinCode('');
      load();
    } catch (err) { alert(err instanceof Error ? err.message : t('materials', 'join_err')); }
    finally { setJoining(false); }
  }

  async function handleRequest(materialId: string) {
    setRequesting(materialId);
    try {
      const res = await fetch(`/api/student/materials/${materialId}/request`, { method: 'POST' });
      if (!res.ok) throw new Error();
      load();
    } catch { alert(t('materials', 'join_err')); }
    finally { setRequesting(null); }
  }

  const joinedMaterials = materials.filter((m) => m.joined_via_code);
  const classMaterials  = materials.filter((m) => !m.joined_via_code);

  return (
    <div className="space-y-6">
      {/* Join form */}
      <Card>
        <CardTitle>{t('materials', 'join_title')}</CardTitle>
        <p className="text-sm text-ink/50 mb-3">{t('materials', 'join_subtitle')}</p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="flex-1 rounded-xl2 border border-teal-50 px-3 py-2 text-sm uppercase font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder={t('materials', 'join_ph')}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <Button type="submit" disabled={joining || joinCode.length < 6}>
            {joining ? '…' : t('materials', 'join_btn')}
          </Button>
        </form>
      </Card>

      {joinedMaterials.length > 0 && (
        <Card>
          <CardTitle>{t('materials', 'joined_section').replace('{n}', String(joinedMaterials.length))}</CardTitle>
          <div className="space-y-3 mt-3">
            {joinedMaterials.map((m) => (
              <MaterialCard key={m.id} m={m} openId={openId} setOpenId={setOpenId} requesting={requesting} handleRequest={handleRequest} t={t} />
            ))}
          </div>
        </Card>
      )}

      {classMaterials.length > 0 && (
        <Card>
          <CardTitle>{t('materials', 'class_section').replace('{n}', String(classMaterials.length))}</CardTitle>
          <div className="space-y-3 mt-3">
            {classMaterials.map((m) => (
              <MaterialCard key={m.id} m={m} openId={openId} setOpenId={setOpenId} requesting={requesting} handleRequest={handleRequest} t={t} />
            ))}
          </div>
        </Card>
      )}

      {!loading && materials.length === 0 && (
        <Card>
          <div className="text-center py-10">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-ink/50 font-medium">{t('materials', 'empty_title')}</p>
            <p className="text-xs text-ink/30 mt-1">{t('materials', 'empty_desc')}</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function MaterialCard({ m, openId, setOpenId, requesting, handleRequest, t }: {
  m: StudentMaterial;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  requesting: string | null;
  handleRequest: (id: string) => void;
  t: (section: any, key: string) => string;
}) {
  const isOpen    = openId === m.id;
  const status    = m.access?.status ?? null;
  const expiresAt = m.access?.expires_at ?? null;
  const isPermanent = m.access?.duration_minutes === 0;
  const isLocked  = status === 'locked';
  const isWaiting = status === 'requested';

  return (
    <div className="rounded-xl2 border border-teal-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{m.title}</p>
            {m.subject && <span className="text-[10px] bg-coral-50 text-coral-700 px-1.5 py-0.5 rounded font-bold">{m.subject}</span>}
            {m.joined_via_code && <Badge tone="safe">{t('materials', 'joined_badge')}</Badge>}
          </div>
          {m.description && <p className="text-xs text-ink/50 mt-0.5">{m.description}</p>}
          <p className="text-xs text-ink/30 mt-1">
            {isPermanent
              ? t('materials', 'access_perm')
              : expiresAt
              ? `${t('materials', 'study_timer')}${t('materials', 'access_until').replace('{time}', new Date(expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))}`
              : ''}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        {isLocked ? (
          isWaiting ? (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl2 px-3 py-2">
              {t('materials', 'waiting_msg')}
            </p>
          ) : (
            <Button onClick={() => handleRequest(m.id)} disabled={requesting === m.id} variant="secondary">
              {requesting === m.id ? t('materials', 'requesting') : t('materials', 'request_btn')}
            </Button>
          )
        ) : (
          <button
            onClick={() => setOpenId(isOpen ? null : m.id)}
            className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-xl2 transition-colors"
          >
            {isOpen ? t('materials', 'close_material') : t('materials', 'open_material')}
          </button>
        )}
      </div>

      {isOpen && !isLocked && (
        <div className="mt-4 border-t border-teal-50 pt-4 space-y-4">
          <MonitoringPanel />
          {m.media && m.media.length > 0 && (
            <div className="space-y-3">
              {m.media.map((media, i) => (
                <div key={i}>
                  {media.media_type === 'image' && <img src={media.url} alt="" loading="lazy" decoding="async" className="max-w-full rounded-xl2 border border-teal-50" />}
                  {media.media_type === 'video' && <video src={media.url} controls className="w-full rounded-xl2" />}
                  {(media.media_type === 'document' || media.media_type === 'presentation') && (
                    <DocumentViewer url={media.url} type={media.media_type} />
                  )}
                </div>
              ))}
            </div>
          )}
          {m.content
            ? <div className="prose prose-sm max-w-none text-ink/80 whitespace-pre-wrap">{m.content}</div>
            : <p className="text-sm text-ink/40 italic">{t('materials', 'no_text')}</p>}
        </div>
      )}

      {isLocked && (
        <p className="text-xs text-ink/40 mt-2 bg-gray-50 border border-gray-100 rounded-xl2 px-3 py-2">
          🔒 {t('materials', 'locked_msg')}
        </p>
      )}
    </div>
  );
}
