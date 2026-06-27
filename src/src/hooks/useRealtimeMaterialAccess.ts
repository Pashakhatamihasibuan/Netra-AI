'use client';

// src/hooks/useRealtimeMaterialAccess.ts
// Dipakai siswa (auto-unlock saat guru menyetujui) dan guru (auto-refresh
// daftar permintaan saat ada permintaan baru), tanpa perlu reload manual.

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeMaterialAccess(filter: string, onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`material_access_${filter}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'material_access', filter },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, onChange]);
}
