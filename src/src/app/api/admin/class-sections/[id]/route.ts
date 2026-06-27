// src/app/api/admin/class-sections/[id]/route.ts
// PATCH  { homeroomTeacherId: string | null } -> tugaskan / lepas wali kelas
// DELETE -> hapus kelas ini sepenuhnya (siswa di kelas ini jadi belum
//           berkelas — dipakai Kepala Sekolah untuk reset di ajaran baru)

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api/materialAuth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  const body = await req.json().catch(() => ({})) as { homeroomTeacherId?: string | null };
  const newTeacherId = body.homeroomTeacherId ?? null;

  // Validasi: pastikan guru ada
  let teacherName: string | null = null;
  if (newTeacherId) {
    const { data: teacher } = await admin
      .from('users').select('id, name, role').eq('id', newTeacherId).maybeSingle();
    if (!teacher || teacher.role !== 'teacher') {
      return NextResponse.json({ error: 'Guru tidak ditemukan.' }, { status: 400 });
    }
    teacherName = teacher.name;
  }

  // Cek wali kelas LAMA untuk reset teacher_type-nya
  const { data: oldSection } = await admin
    .from('class_sections')
    .select('homeroom_teacher_id')
    .eq('id', params.id)
    .maybeSingle();
  const oldTeacherId = oldSection?.homeroom_teacher_id ?? null;

  // Update class_sections — set flag homeroom_assigned_by_admin agar teacher register tidak override
  const { data, error } = await admin
    .from('class_sections')
    .update({
      homeroom_teacher_id: newTeacherId,
      homeroom_assigned_by_admin: newTeacherId !== null, // true saat assign, false saat lepas
    })
    .eq('id', params.id)
    .select('id, class_level, section, academic_year, homeroom_teacher_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // FIX: sync teacher_type di tabel users (two-way sync)
  // Guru baru di-assign → teacher_type = 'homeroom'
  if (newTeacherId) {
    await admin.from('users').update({ teacher_type: 'homeroom' }).eq('id', newTeacherId).eq('role', 'teacher');
  }
  // Guru lama dilepas → cek apakah masih wali di kelas lain, jika tidak → 'subject'
  if (oldTeacherId && oldTeacherId !== newTeacherId) {
    const { data: otherSections } = await admin
      .from('class_sections').select('id').eq('homeroom_teacher_id', oldTeacherId).neq('id', params.id);
    if ((otherSections ?? []).length === 0) {
      await admin.from('users').update({ teacher_type: 'subject' }).eq('id', oldTeacherId).eq('role', 'teacher');
    }
  }

  // FIX: kembalikan homeroom_teacher_name agar UI bisa update state tanpa re-fetch
  return NextResponse.json({
    section: {
      ...data,
      class_level: String(data.class_level),
      homeroom_teacher_name: teacherName,
    }
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { admin } = auth;

  // Lepaskan dulu siswa yang masih terdaftar di kelas ini supaya tidak
  // ada FK constraint error, lalu hapus barisnya.
  await admin.from('users').update({ class_section_id: null }).eq('class_section_id', params.id);

  const { error } = await admin.from('class_sections').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
