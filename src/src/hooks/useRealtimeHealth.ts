'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Subscribes to INSERT events on health_records for a specific user (or all
// users the caller's RLS lets them see). Calls onNewRecord so parent
// components can refresh derived state without a full page reload.
export function useRealtimeHealth(onNewRecord: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('health_records_insert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'health_records' },
        (_payload) => onNewRecord()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onNewRecord]);
}
