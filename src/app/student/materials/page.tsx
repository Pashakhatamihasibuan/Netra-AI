'use client';

import { MaterialList } from '@/components/student/MaterialList';
import { useT } from '@/i18n/useT';

export default function StudentMaterialsPage() {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-xl text-ink">{t('materials', 'page_title')}</h1>
        <p className="text-sm text-ink/50 mt-1">{t('materials', 'page_subtitle')}</p>
      </div>
      <MaterialList />
    </div>
  );
}
