'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/useT';

interface Props { onLinked: () => void }

export function LinkChild({ onLinked }: Props) {
  const { t } = useT();
  const [code, setCode]       = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res  = await fetch('/api/parent/link-child', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: code.trim().toUpperCase() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('common', 'error'));
      onLinked();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common', 'error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardTitle>{t('parent', 'link_title')}</CardTitle>
      <p className="text-sm text-ink/50 mb-4">{t('parent', 'link_desc')}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 rounded-xl2 border border-teal-50 px-3 py-2 text-sm uppercase font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-teal-400"
          placeholder={t('parent', 'link_ph')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          required
        />
        <Button type="submit" disabled={loading || code.length < 8}>
          {loading ? t('parent', 'linking') : t('parent', 'link_btn')}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </Card>
  );
}
