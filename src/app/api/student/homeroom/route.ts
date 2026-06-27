// src/app/api/student/homeroom/route.ts
// GET -> info kelas siswa yang login (kelas, tahun ajaran, wali kelas)

import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/api/materialAuth';

export async function GET() {
  const auth = await requireStudent();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin, profile } = auth;

  if (!profile?.class_section_id) {
    return NextResponse.json({ section: null });
  }

  const { data: section, error } = await admin
    .from('class_sections')
    .select('id, class_level, section, academic_year, homeroom_teacher_id, users(name)')
    .eq('id', profile.class_section_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!section) return NextResponse.json({ section: null });

  return NextResponse.json({
    section: {
      id: section.id,
      class_level: section.class_level,
      section: section.section,
      academic_year: section.academic_year,
      homeroom_teacher_name: (section as any).users?.name ?? null,
    },
  });
}
