// src/lib/api/materialAuth.ts
// Helper bersama untuk route /api/teacher/materials/** dan
// /api/student/materials/** — menghindari duplikasi boilerplate
// cookie-client + service-role-client + verifikasi role yang sama
// di banyak file (ikut pola yang sudah ada di api/teacher/classes/*).

import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function makeRequestSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => cookieStore.get(n)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
}

export function makeAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Ambil user yang login lewat cookie session. Null jika tidak ada sesi. */
export async function getSessionUser() {
  const supabase = makeRequestSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Pastikan user yang login adalah guru. Cek public.users dulu, fallback ke
 * auth metadata jika row belum sempat ada (race condition / trigger lambat).
 */
export async function requireTeacher() {
  const user = await getSessionUser();
  if (!user) return { error: 'Tidak terautentikasi.' as const, status: 401 as const };

  const admin = makeAdmin();
  const { data: profile } = await admin
    .from('users').select('role').eq('id', user.id).maybeSingle();

  const metaRole = user.user_metadata?.role as string | undefined;
  const role = profile?.role ?? metaRole;

  if (role !== 'teacher') {
    return { error: 'Bukan guru.' as const, status: 403 as const };
  }
  return { user, admin };
}

/**
 * Pastikan user yang login adalah siswa, dan kembalikan profil lengkapnya
 * (termasuk class_id, dibutuhkan untuk menentukan materi mana yang terlihat).
 */
export async function requireStudent() {
  const user = await getSessionUser();
  if (!user) return { error: 'Tidak terautentikasi.' as const, status: 401 as const };

  const admin = makeAdmin();
  const { data: profile } = await admin
    .from('users').select('id, name, role, class_id, class_section_id, grade_level').eq('id', user.id).maybeSingle();

  const metaRole = user.user_metadata?.role as string | undefined;
  const role = profile?.role ?? metaRole;

  if (role !== 'student') {
    return { error: 'Bukan siswa.' as const, status: 403 as const };
  }
  return { user, admin, profile };
}

/**
 * Validasi target_section_id (opsional) yang dikirim guru saat membuat/edit
 * quiz atau materi. Mengembalikan section_id yang bersih (null jika tidak
 * dipilih / berlaku ke semua section di grade itu), atau error jika section
 * tidak ditemukan / grade-nya tidak cocok dengan class_level yang dipilih.
 */
export async function resolveTargetSection(
  admin: SupabaseClient,
  rawSectionId: string | null | undefined,
  classLevel: string
): Promise<{ targetSectionId: string | null } | { error: string }> {
  const targetSectionId = rawSectionId?.trim() || null;
  if (!targetSectionId) return { targetSectionId: null };

  const { data: section } = await admin
    .from('class_sections')
    .select('id, class_level')
    .eq('id', targetSectionId)
    .maybeSingle();

  // FIX: cast ke String() agar tidak gagal integer vs string compare
  if (!section || String(section.class_level) !== String(classLevel)) {
    return { error: 'Kelas spesifik yang dipilih tidak cocok dengan tingkat kelas.' };
  }
  return { targetSectionId };
}

/**
 * Pastikan user yang login adalah Kepala Sekolah (admin). Dipakai oleh
 * semua route /api/admin/** yang mengelola struktur kelas & wali kelas.
 */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return { error: 'Tidak terautentikasi.' as const, status: 401 as const };

  const admin = makeAdmin();
  const { data: profile } = await admin
    .from('users').select('role').eq('id', user.id).maybeSingle();

  const metaRole = user.user_metadata?.role as string | undefined;
  const role = profile?.role ?? metaRole;

  if (role !== 'admin') {
    return { error: 'Hanya Kepala Sekolah yang bisa mengakses ini.' as const, status: 403 as const };
  }
  return { user, admin };
}
