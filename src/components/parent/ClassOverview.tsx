'use client';

import { useEffect, useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { useT } from '@/i18n/useT';

interface ClassData {
  id: string; class_level: string; section: string;
  academic_year: string; homeroom_teacher_name: string | null;
}

export function ClassOverview({ studentId }: { studentId: string }) {
  const { t } = useT();
  const [data, setData]       = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/parent/class-overview?studentId=${studentId}`)
      .then((r) => r.json())
      .then((d) => setData(d.section ?? null))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Card><p className="text-sm text-ink/40">{t('parent', 'class_loading')}</p></Card>;
  if (!data)   return <Card><p className="text-sm text-ink/40">{t('parent', 'class_empty')}</p></Card>;

  const className = `${data.class_level} SD ${data.section}`;

  return (
    <Card>
      <CardTitle>{t('parent', 'class_title').replace('{name}', className)}</CardTitle>
      <div className="mt-2 space-y-1 text-sm">
        <p className="text-ink/60">
          {t('parent', 'class_teacher')}
          <span className="font-medium text-ink">
            {data.homeroom_teacher_name ?? t('parent', 'class_no_teacher')}
          </span>
        </p>
        <p className="text-xs text-ink/40 bg-teal-50 border border-teal-100 rounded-xl2 px-3 py-2 mt-3">
          ℹ️ {t('parent', 'class_privacy')}
        </p>
      </div>
    </Card>
  );
}
