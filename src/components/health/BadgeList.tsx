'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface EarnedBadge {
  awarded_at: string;
  badges: { name: string; description: string } | null;
}

export function BadgeList({ userId }: { userId: string }) {
  const [badges, setBadges] = useState<EarnedBadge[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('user_badges')
      .select('awarded_at, badges(name, description)')
      .eq('user_id', userId)
      .then(({ data }) => setBadges((data as unknown as EarnedBadge[]) ?? []));
  }, [userId]);

  return (
    <Card>
      <CardTitle>Badge</CardTitle>
      {badges.length === 0 ? (
        <p className="text-sm text-ink/50">Belum ada badge yang diraih.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map((b) => (
            <Badge key={b.awarded_at} tone="safe">
              {b.badges?.name}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
