'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeQuizResults(quizId: string, onNewResult: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`quiz_results_${quizId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'quiz_results',
          filter: `quiz_id=eq.${quizId}`,
        },
        (_payload) => onNewResult()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId, onNewResult]);
}
