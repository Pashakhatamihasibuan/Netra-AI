'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { useT } from '@/i18n/useT';

export function ParentPinCard({ pin }: { pin: string }) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied]   = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(pin).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Card>
      <CardTitle>{t('student', 'pin_label')}</CardTitle>
      <p className="text-xs text-ink/50 mb-3 leading-relaxed">{t('student', 'pin_hint')}</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono font-bold text-2xl tracking-[0.3em] text-teal-700 select-none">
          {visible ? pin : '••••••'}
        </span>
        <div className="flex gap-2">
          <button onClick={() => setVisible((v) => !v)} className="text-xs font-medium text-ink/60 hover:text-ink border border-teal-50 px-2.5 py-1 rounded-md transition-colors">
            {visible ? t('student', 'pin_hide') : t('student', 'pin_show')}
          </button>
          <button onClick={handleCopy} className="text-xs font-medium text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md transition-colors">
            {copied ? t('student', 'pin_copied') : t('student', 'pin_copy')}
          </button>
        </div>
      </div>
    </Card>
  );
}
