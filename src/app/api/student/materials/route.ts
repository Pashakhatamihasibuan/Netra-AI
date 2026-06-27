// GET -> daftar materi untuk siswa:
// 1. Materi yang sudah di-join via kode (material_joins)
// 2. Materi berdasarkan class_level (backward-compat)
// Setiap perubahan guru pada materi langsung terlihat (join bersifat permanen).

import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/api/materialAuth';

export async function GET() {
  const auth = await requireStudent();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin, profile } = auth;

  // Ambil materi yang sudah di-join via kode
  const { data: joins } = await admin
    .from('material_joins')
    .select('material_id')
    .eq('student_id', user.id);

  const joinedMaterialIds = (joins ?? []).map((j) => j.material_id);

  // Ambil materi dari class_level (jika ada) + materi yang di-join
  let materialIds: string[] = [...joinedMaterialIds];
  
  let classMaterials: any[] = [];
  if (profile?.grade_level) {
    const query = admin
      .from('materials')
      .select('id')
      .eq('class_level', profile.grade_level)
      .or(`target_section_id.is.null,target_section_id.eq.${profile.class_section_id ?? '00000000-0000-0000-0000-000000000000'}`);
    const { data } = await query;
    const classIds = (data ?? []).map((m) => m.id);
    // Merge unique IDs
    for (const id of classIds) {
      if (!materialIds.includes(id)) materialIds.push(id);
    }
  }

  if (materialIds.length === 0) {
    return NextResponse.json({ materials: [] });
  }

  const { data: materials, error } = await admin
    .from('materials')
    .select('*')
    .in('id', materialIds)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!materials || materials.length === 0) return NextResponse.json({ materials: [] });

  const now = new Date();

  const { data: existingAccess } = await admin
    .from('material_access')
    .select('*')
    .eq('student_id', user.id)
    .in('material_id', materialIds);

  const accessByMaterial = new Map((existingAccess ?? []).map((a) => [a.material_id, a]));

  // Auto-grant untuk materi yang belum pernah dibuka
  const toCreate = materials
    .filter((m) => !accessByMaterial.has(m.id))
    .map((m) => {
      const duration = m.default_duration_minutes ?? 120;
      const expiresAt = new Date(now.getTime() + duration * 60_000);
      return {
        material_id: m.id,
        student_id: user.id,
        status: 'active' as const,
        duration_minutes: duration,
        granted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };
    });

  if (toCreate.length > 0) {
    await admin.from('material_access').upsert(toCreate, {
      onConflict: 'material_id,student_id',
      ignoreDuplicates: true,
    });
  }

  // Lazy-expire
  const toLock = (existingAccess ?? [])
    .filter((a) => a.status === 'active' && a.expires_at && new Date(a.expires_at).getTime() < now.getTime())
    .map((a) => a.id);

  if (toLock.length > 0) {
    await admin.from('material_access').update({ status: 'locked', updated_at: now.toISOString() }).in('id', toLock);
  }

  const { data: finalAccess } = await admin
    .from('material_access').select('*').eq('student_id', user.id).in('material_id', materialIds);
  const finalAccessByMaterial = new Map((finalAccess ?? []).map((a) => [a.material_id, a]));

  const { data: media } = await admin
    .from('material_media').select('*').in('material_id', materialIds).order('order_index');

  const result = materials.map((m) => ({
    ...m,
    media: (media ?? []).filter((md) => md.material_id === m.id),
    access: finalAccessByMaterial.get(m.id) ?? null,
    joined_via_code: joinedMaterialIds.includes(m.id),
  }));

  return NextResponse.json({ materials: result });
}
