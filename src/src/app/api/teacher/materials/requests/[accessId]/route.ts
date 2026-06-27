// src/app/api/teacher/materials/requests/[accessId]/route.ts
// POST { action: 'approve', duration_minutes } -> buka akses, set durasi baru
// POST { action: 'reject' }                    -> tolak, kembali terkunci

import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function POST(req: Request, { params }: { params: { accessId: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  // Pastikan baris akses ini memang untuk materi milik guru yang login.
  const { data: accessRow } = await admin
    .from('material_access')
    .select('id, material_id, status, materials!inner(teacher_id)')
    .eq('id', params.accessId)
    .maybeSingle();

  if (!accessRow || (accessRow as any).materials?.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as { action?: 'approve' | 'reject'; duration_minutes?: number };
  const now = new Date();

  if (body.action === 'reject') {
    const { data, error } = await admin
      .from('material_access')
      .update({ status: 'locked', requested_at: null, updated_at: now.toISOString() })
      .eq('id', params.accessId)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ access: data });
  }

  // Default: approve
  const duration = Number(body.duration_minutes) > 0 ? Math.floor(Number(body.duration_minutes)) : 120;
  const expiresAt = new Date(now.getTime() + duration * 60_000);

  const { data, error } = await admin
    .from('material_access')
    .update({
      status: 'active',
      duration_minutes: duration,
      granted_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      requested_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', params.accessId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data });
}
