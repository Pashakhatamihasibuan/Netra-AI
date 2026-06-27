'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/useAppStore';
import type { AppUser } from '@/types';

export function AuthBootstrap() {
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setUser(null);
        return;
      }

      // Coba baca dari public.users (data lengkap)
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, name, email, role, parent_id, class_id, class_section_id, access_code, parent_pin, grade_level, teacher_type, subject, teacher_grade_levels')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUser(profile as AppUser);
        return;
      }

      // Fallback: jika query DB gagal (RLS belum di-fix, atau race condition),
      // bangun AppUser dari auth.users metadata agar UI tidak stuck loading.
      if (error) {
        console.warn('[AuthBootstrap] DB query failed, using auth metadata fallback:', error.message);
        const meta = authData.user.user_metadata ?? {};
        const fallbackUser: AppUser = {
          id:          authData.user.id,
          email:       authData.user.email ?? '',
          name:        meta.name ?? meta.full_name ?? authData.user.email ?? '',
          role:        meta.role ?? 'student',
          parent_id:   null,
          class_id:    null,
          class_section_id: null,
          access_code: null,
          parent_pin:  null,
          grade_level: meta.grade_level ?? null,
          teacher_type: null,
          subject:      null,
          teacher_grade_levels: null,
        };
        setUser(fallbackUser);
      }
    }

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadProfile();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return null;
}
