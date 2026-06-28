'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { useT } from '@/i18n/useT';

interface BadgeItem { id: string; badge_key: string; badge_label: string; earned_at: string; icon?: string }

export function BadgeList({ studentId }: { studentId?: string }) {
  const { t } = useT();
  const [badges, setBadges] = useState<BadgeItem[]>([]);

  useEffect(() => {
    const url = studentId ? `/api/health/badges?studentId=${studentId}` : '/api/health/badges';
    fetch(url).then((r) => r.json()).then((d) => setBadges(d.badges ?? []));
  }, [studentId]);

  return (
    <Card>
      <CardTitle>{t('health', 'badge_title')}</CardTitle>
      {badges.length === 0 ? (
        <p className="text-sm text-ink/40 mt-2">{t('health', 'badge_empty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2 mt-3">
          {badges.map((b) => (
            <div key={b.id} className="rounded-xl2 border border-teal-50 bg-teal-50/30 px-3 py-2 flex items-center gap-2 text-sm">
              {b.icon && <span className="text-lg">{b.icon}</span>}
              <span className="font-medium">{b.badge_label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
