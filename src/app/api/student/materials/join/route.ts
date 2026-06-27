// POST { joinCode } -> siswa join materi via kode (sekali, permanen)
// Setelah join, materi selalu muncul di dashboard siswa dan setiap
// perubahan konten guru otomatis terlihat.

import { NextResponse } from 'next/server';
import { requireStudent } from '@/lib/api/materialAuth';

export async function POST(req: Request) {
  const auth = await requireStudent();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const body = await req.json().catch(() => ({})) as { joinCode?: string };
  const joinCode = body.joinCode?.trim().toUpperCase();

  if (!joinCode) {
    return NextResponse.json({ error: 'Masukkan kode materi.' }, { status: 400 });
  }

  // Cari materi dengan kode ini
  const { data: material } = await admin
    .from('materials')
    .select('id, title, subject, class_level, teacher_id')
    .eq('join_code', joinCode)
    .maybeSingle();

  if (!material) {
    return NextResponse.json({ error: 'Kode materi tidak valid. Periksa kembali kode dari gurumu.' }, { status: 404 });
  }

  // Cek apakah sudah join sebelumnya
  const { data: existing } = await admin
    .from('material_joins')
    .select('id')
    .eq('material_id', material.id)
    .eq('student_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      alreadyJoined: true,
      material: { id: material.id, title: material.title, subject: material.subject },
      message: 'Kamu sudah terdaftar di materi ini sebelumnya.',
    });
  }

  // Insert join record
  const { error } = await admin
    .from('material_joins')
    .insert({ material_id: material.id, student_id: user.id });

  if (error) {
    const duplicate = /duplicate|unique/i.test(error.message);
    if (duplicate) {
      return NextResponse.json({ alreadyJoined: true, message: 'Kamu sudah terdaftar di materi ini.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    material: { id: material.id, title: material.title, subject: material.subject },
    message: `Berhasil join materi "${material.title}"! Materi sudah tersedia di daftar materimu.`,
  });
}
