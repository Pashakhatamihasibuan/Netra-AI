// src/app/api/teacher/materials/requests/route.ts
// GET -> semua permintaan buka-akses (status='requested') dari siswa,
// untuk semua materi milik guru ini. Dipakai panel "Permintaan Akses".

import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function GET() {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { data: materials } = await admin.from('materials').select('id, title').eq('teacher_id', user.id);
  const materialIds = (materials ?? []).map((m) => m.id);
  if (materialIds.length === 0) return NextResponse.json({ requests: [] });

  const { data: rows, error } = await admin
    .from('material_access')
    .select('id, material_id, student_id, requested_at')
    .in('material_id', materialIds)
    .eq('status', 'requested')
    .order('requested_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ requests: [] });

  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const { data: students } = await admin.from('users').select('id, name').in('id', studentIds);

  const titleMap = new Map((materials ?? []).map((m) => [m.id, m.title]));
  const nameMap = new Map((students ?? []).map((s) => [s.id, s.name]));

  const requests = rows.map((r) => ({
    access_id: r.id,
    material_id: r.material_id,
    material_title: titleMap.get(r.material_id) ?? 'Materi',
    student_id: r.student_id,
    student_name: nameMap.get(r.student_id) ?? 'Siswa',
    requested_at: r.requested_at,
  }));

  return NextResponse.json({ requests });
}
