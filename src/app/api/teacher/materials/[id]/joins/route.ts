// GET -> daftar siswa yang sudah join materi (via kode) dan yang belum join
// Dipakai guru untuk memantau siapa yang sudah join dan siapa yang belum.

import { NextResponse } from 'next/server';
import { requireTeacher } from '@/lib/api/materialAuth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  // Pastikan materi milik guru ini
  const { data: material } = await admin
    .from('materials')
    .select('id, class_level, teacher_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!material || material.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Materi tidak ditemukan.' }, { status: 404 });
  }

  // FIX: Hindari FK alias yang bisa beda per project — 2 query terpisah
  const { data: joins } = await admin
    .from('material_joins')
    .select('student_id, joined_at')
    .eq('material_id', params.id);

  const joinedIds = new Set((joins ?? []).map((j: any) => j.student_id));
  const joinedStudentIds = [...joinedIds].filter(Boolean) as string[];

  // Ambil detail siswa yang sudah join
  const { data: joinedStudentData } = joinedStudentIds.length
    ? await admin.from('users').select('id, name, grade_level, class_section_id').in('id', joinedStudentIds)
    : { data: [] as any[] };
  const joinedStudentMap = new Map((joinedStudentData ?? []).map((s: any) => [s.id, s]));

  // Siswa yang belum join — ambil semua siswa sesuai class_level materi
  let allStudents: any[] = [];
  if (material.class_level) {
    const { data: students } = await admin
      .from('users')
      .select('id, name, grade_level, class_section_id')
      .eq('role', 'student')
      .eq('grade_level', material.class_level)
      .order('name');
    allStudents = students ?? [];
  }

  // Gabung semua section IDs untuk lookup nama kelas
  const allSectionIds = [...new Set([
    ...allStudents.map((s: any) => s.class_section_id),
    ...(joinedStudentData ?? []).map((s: any) => s.class_section_id),
  ].filter(Boolean))];
  const { data: sections } = allSectionIds.length
    ? await admin.from('class_sections').select('id, class_level, section').in('id', allSectionIds)
    : { data: [] as any[] };
  const sectionMap = new Map((sections ?? []).map((s: any) => [s.id, `${s.class_level} SD ${s.section}`]));

  const joined = (joins ?? []).map((j: any) => {
    const s = joinedStudentMap.get(j.student_id);
    return {
      student_id: j.student_id,
      student_name: s?.name ?? 'Tidak diketahui',
      class_name: s?.class_section_id ? sectionMap.get(s.class_section_id) ?? null : null,
      joined_at: j.joined_at,
    };
  });

  const not_joined = allStudents
    .filter((s) => !joinedIds.has(s.id))
    .map((s) => ({
      student_id: s.id,
      student_name: s.name,
      class_name: s.class_section_id ? sectionMap.get(s.class_section_id) ?? null : null,
    }));

  return NextResponse.json({ joined, not_joined });
}
