'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRealtimeMaterialAccess } from '@/hooks/useRealtimeMaterialAccess';
import { useT } from '@/i18n/useT';
import type { MaterialAccessRequest } from '@/types';

export function MaterialRequests() {
  const { t } = useT();
  const [requests, setRequests] = useState<MaterialAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teacher/materials/requests');
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeMaterialAccess('status=eq.requested', load);

  async function respond(req: MaterialAccessRequest, action: 'approve' | 'reject') {
    setBusyId(req.access_id);
    try {
      const res = await fetch(`/api/teacher/materials/requests/${req.access_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, duration_minutes: durations[req.access_id] || 120 }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.access_id !== req.access_id));
      } else {
        alert(t('materials', 'respond_err'));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <CardTitle className="mb-0">{t('materials', 'requests_title')}</CardTitle>
        {requests.length > 0 && (
          <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            {t('materials', 'requests_waiting').replace('{n}', String(requests.length))}
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-ink/40 mt-2">{t('materials', 'requests_loading')}</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-ink/40 mt-2">{t('materials', 'requests_empty')}</p>
      ) : (
        <div className="space-y-2 mt-3">
          {requests.map((r) => (
            <div key={r.access_id} className="rounded-xl2 border border-amber-100 bg-amber-50/40 px-3 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium">{r.student_name}</p>
                <p className="text-xs text-ink/50">
                  {t('materials', 'material_label')}{r.material_title} · {new Date(r.requested_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1}
                  className="w-20 rounded-lg border border-teal-50 px-2 py-1 text-xs"
                  placeholder={t('materials', 'duration_ph')}
                  value={durations[r.access_id] ?? 120}
                  onChange={(e) => setDurations((prev) => ({ ...prev, [r.access_id]: Number(e.target.value) }))}
                />
                <Button onClick={() => respond(r, 'approve')} disabled={busyId === r.access_id}>
                  {t('materials', 'approve')}
                </Button>
                <button
                  onClick={() => respond(r, 'reject')} disabled={busyId === r.access_id}
                  className="text-xs font-medium text-ink/50 hover:text-ink px-2.5 py-1 rounded-md transition-colors">
                  {t('materials', 'reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
