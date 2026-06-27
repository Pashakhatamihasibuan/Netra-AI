// src/app/api/student/materials/[id]/request/route.ts
// POST -> siswa minta izin buka kembali materi yang sudah terkunci.

import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/api/materialAuth';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireStudent();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin, profile } = auth;

  if (!profile?.grade_level) {
    return NextResponse.json({ error: 'Profil kelasmu belum lengkap.' }, { status: 403 });
  }

  // Pastikan materi ini memang untuk kelas siswa ini.
  const { data: material } = await admin
    .from('materials').select('id, class_level, default_duration_minutes').eq('id', params.id).maybeSingle();

  const visible = material && material.class_level === profile.grade_level;
  if (!visible) {
    return NextResponse.json({ error: 'Materi tidak ditemukan.' }, { status: 404 });
  }

  const now = new Date();
  const { data: existing } = await admin
    .from('material_access').select('*').eq('material_id', params.id).eq('student_id', user.id).maybeSingle();

  // Belum pernah ada baris akses sama sekali -> langsung buka otomatis
  // (kasus jarang: materi baru dibuat tepat saat siswa request).
  if (!existing) {
    const duration = material!.default_duration_minutes ?? 120;
    const expiresAt = new Date(now.getTime() + duration * 60_000);
    const { data, error } = await admin
      .from('material_access')
      .insert({
        material_id: params.id,
        student_id: user.id,
        status: 'active',
        duration_minutes: duration,
        granted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ access: data });
  }

  // Sudah aktif (belum kedaluwarsa) -> tidak perlu request, kembalikan apa adanya.
  if (existing.status === 'active' && existing.expires_at && new Date(existing.expires_at).getTime() > now.getTime()) {
    return NextResponse.json({ access: existing });
  }

  // Sudah ada permintaan tertunda -> idempotent, tidak perlu diubah lagi.
  if (existing.status === 'requested') {
    return NextResponse.json({ access: existing });
  }

  // Status 'locked' (atau 'active' yang sudah lewat waktu) -> ajukan permintaan.
  const { data, error } = await admin
    .from('material_access')
    .update({ status: 'requested', requested_at: now.toISOString(), updated_at: now.toISOString() })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data });
}
