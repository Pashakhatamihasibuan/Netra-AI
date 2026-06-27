// GET -> daftar semua akun guru dengan data lengkap termasuk NIP, alamat, telepon, dll.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/materialAuth';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const { data: teachers, error } = await admin
    .from('users')
    .select('id, name, email, teacher_type, subject, teacher_grade_levels, nip, birth_place, birth_date, address, phone, created_at')
    .eq('role', 'teacher')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const teacherIds = (teachers ?? []).map((t) => t.id);
  const { data: homerooms } = teacherIds.length
    ? await admin.from('class_sections').select('id, class_level, section, homeroom_teacher_id').in('homeroom_teacher_id', teacherIds)
    : { data: [] as any[] };

  const homeroomByTeacher = new Map((homerooms ?? []).map((h) => [h.homeroom_teacher_id, h]));

  const result = (teachers ?? []).map((t) => {
    const hr = homeroomByTeacher.get(t.id);
    return { ...t, homeroom_class: hr ? `${hr.class_level} SD ${hr.section}` : null };
  });

  return NextResponse.json({ teachers: result });
}
