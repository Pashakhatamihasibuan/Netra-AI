// src/app/api/teacher/materials/[id]/access/route.ts
// GET -> status akses tiap siswa untuk satu materi (untuk panel guru).
// Cakupan siswa sekarang berdasarkan class_level materi (semua siswa di
// kelas itu, dari kelas/section manapun) — bukan lagi roster kelas guru.

import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { data: material } = await admin
    .from('materials').select('id, class_level').eq('id', params.id).eq('teacher_id', user.id).maybeSingle();
  if (!material) return NextResponse.json({ error: 'Materi tidak ditemukan atau bukan milikmu.' }, { status: 404 });

  let studentQuery = admin.from('users').select('id, name, grade_level').eq('role', 'student');
  if (material.class_level) {
    studentQuery = studentQuery.eq('grade_level', material.class_level);
  }

  const { data: students, error } = await studentQuery.order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const studentIds = (students ?? []).map((s) => s.id);
  const { data: accessRows } = studentIds.length
    ? await admin.from('material_access').select('*').eq('material_id', params.id).in('student_id', studentIds)
    : { data: [] };

  const now = Date.now();
  const result = (students ?? []).map((s) => {
    const a = (accessRows ?? []).find((r) => r.student_id === s.id);
    let status: 'active' | 'locked' | 'requested' | 'belum_dibuka' = 'belum_dibuka';
    if (a) {
      status = a.status;
      if (status === 'active' && a.expires_at && new Date(a.expires_at).getTime() < now) {
        status = 'locked';
      }
    }
    return {
      student_id: s.id,
      student_name: s.name,
      status,
      expires_at: a?.expires_at ?? null,
      requested_at: a?.requested_at ?? null,
      duration_minutes: a?.duration_minutes ?? null,
    };
  });

  return NextResponse.json({ students: result });
}

// POST -> guru membuka/memperpanjang akses materi untuk satu siswa secara
// langsung (tidak perlu menunggu siswa mengirim permintaan).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { data: material } = await admin
    .from('materials').select('id').eq('id', params.id).eq('teacher_id', user.id).maybeSingle();
  if (!material) return NextResponse.json({ error: 'Materi tidak ditemukan atau bukan milikmu.' }, { status: 404 });

  const body = await req.json().catch(() => ({})) as { student_id?: string; duration_minutes?: number };
  if (!body.student_id) return NextResponse.json({ error: 'student_id wajib diisi.' }, { status: 400 });

  const duration = Number(body.duration_minutes) > 0 ? Math.floor(Number(body.duration_minutes)) : 120;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + duration * 60_000);

  const { data, error } = await admin
    .from('material_access')
    .upsert({
      material_id: params.id,
      student_id: body.student_id,
      status: 'active',
      duration_minutes: duration,
      granted_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      requested_at: null,
      updated_at: now.toISOString(),
    }, { onConflict: 'material_id,student_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ access: data });
}
