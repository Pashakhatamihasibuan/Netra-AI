'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { Card, CardTitle } from '@/components/ui/Card';
import { useT } from '@/i18n/useT';

interface SessionPoint {
  date: string;
  minutes: number;
  healthScore: number;
}

export function ScreenTimeChart({ childId }: { childId: string }) {
  const [points, setPoints] = useState<SessionPoint[]>([]);
  const { t, lang } = useT();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('health_records')
      .select('screen_time_minutes, health_score, created_at')
      .eq('user_id', childId)
      .order('created_at', { ascending: true })
      .limit(14)
      .then(({ data }) => {
        setPoints(
          (data ?? []).map((r) => ({
            date: new Date(r.created_at).toLocaleDateString(
              lang === 'en' ? 'en-US' : 'id-ID',
              { day: '2-digit', month: 'short' }
            ),
            minutes: Math.round(r.screen_time_minutes ?? 0),
            healthScore: r.health_score ?? 0,
          }))
        );
      });
  }, [childId, lang]);

  return (
    <Card>
      <CardTitle>{t('screentime_chart', 'title')}</CardTitle>
      {points.length === 0 ? (
        <p className="text-sm text-ink/50">{t('screentime_chart', 'empty')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
            <XAxis dataKey="date" fontSize={12} stroke="#2C2C2A" />
            <YAxis fontSize={12} stroke="#2C2C2A" />
            <Tooltip />
            <Line type="monotone" dataKey="minutes" name={t('screentime_chart', 'line_minutes')} stroke="#D85A30" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="healthScore" name={t('screentime_chart', 'line_health')} stroke="#0F6E56" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
