// src/app/api/parent/materials/route.ts
// GET ?studentId=... -> daftar materi kelas anak + status akses TERAKHIR
// yang tercatat (read-only — route ini TIDAK membuat/mengubah baris
// material_access, beda dengan /api/student/materials yang auto-grant).
// Orang tua hanya boleh melihat, tidak bisa membuka/menutup akses anak.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId wajib diisi.' }, { status: 400 });

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: parentProfile } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
  if (parentProfile?.role !== 'parent') return NextResponse.json({ error: 'Bukan orang tua.' }, { status: 403 });

  const { data: child } = await admin
    .from('users').select('id, grade_level').eq('id', studentId).eq('parent_id', user.id).maybeSingle();
  if (!child) return NextResponse.json({ error: 'Anak tidak ditemukan atau bukan anakmu.' }, { status: 403 });

  if (!child.grade_level) return NextResponse.json({ materials: [] });

  const { data: materials, error } = await admin
    .from('materials')
    .select('*')
    .eq('class_level', child.grade_level)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!materials || materials.length === 0) return NextResponse.json({ materials: [] });

  const materialIds = materials.map((m) => m.id);

  const [{ data: media }, { data: access }] = await Promise.all([
    admin.from('material_media').select('*').in('material_id', materialIds).order('order_index'),
    admin.from('material_access').select('*').eq('student_id', studentId).in('material_id', materialIds),
  ]);

  const accessByMaterial = new Map((access ?? []).map((a) => [a.material_id, a]));
  const now = Date.now();

  const result = materials.map((m) => {
    const a = accessByMaterial.get(m.id);
    let status: 'active' | 'locked' | 'requested' | 'belum_dibuka' = 'belum_dibuka';
    if (a) {
      status = a.status;
      if (status === 'active' && a.expires_at && new Date(a.expires_at).getTime() < now) status = 'locked';
    }
    return {
      ...m,
      media: (media ?? []).filter((md) => md.material_id === m.id),
      status,
      expires_at: a?.expires_at ?? null,
    };
  });

  return NextResponse.json({ materials: result });
}
