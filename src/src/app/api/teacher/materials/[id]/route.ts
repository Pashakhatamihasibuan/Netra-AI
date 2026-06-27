// src/app/api/teacher/materials/[id]/route.ts
// PUT    -> edit materi (judul/deskripsi/isi/durasi default/mapel/kelas/media)
// DELETE -> hapus materi (cascade menghapus media + status akses siswa)

import { NextResponse } from 'next/server';
import { requireTeacher, resolveTargetSection } from '@/lib/api/materialAuth';

const VALID_GRADES = ['3', '4', '5', '6'];

async function ensureOwnership(admin: any, materialId: string, teacherId: string) {
  const { data } = await admin
    .from('materials').select('id').eq('id', materialId).eq('teacher_id', teacherId).maybeSingle();
  return !!data;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const owns = await ensureOwnership(admin, params.id, user.id);
  if (!owns) return NextResponse.json({ error: 'Materi tidak ditemukan atau bukan milikmu.' }, { status: 404 });

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    description?: string;
    content?: string;
    subject?: string;
    class_level?: string;
    target_section_id?: string | null;
    default_duration_minutes?: number;
    media?: { media_type: 'image' | 'video' | 'document' | 'presentation'; url: string }[];
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Judul materi wajib diisi.' }, { status: 400 });
  }
  if (!body.subject?.trim()) {
    return NextResponse.json({ error: 'Mata pelajaran wajib diisi.' }, { status: 400 });
  }
  if (!body.class_level || !VALID_GRADES.includes(body.class_level)) {
    return NextResponse.json({ error: 'Pilih kelas tujuan (3-6 SD).' }, { status: 400 });
  }

  const sectionResult = await resolveTargetSection(admin, body.target_section_id, body.class_level);
  if ('error' in sectionResult) {
    return NextResponse.json({ error: sectionResult.error }, { status: 400 });
  }
  const targetSectionId = sectionResult.targetSectionId;

  const duration = Number(body.default_duration_minutes) > 0
    ? Math.floor(Number(body.default_duration_minutes))
    : 120;

  const { data: material, error } = await admin
    .from('materials')
    .update({
      title: body.title.trim(),
      description: body.description?.trim() || null,
      content: body.content?.trim() || null,
      subject: body.subject.trim(),
      class_level: body.class_level,
      target_section_id: targetSectionId,
      default_duration_minutes: duration,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ganti seluruh daftar media dengan yang dikirim klien (replace, bukan merge —
  // klien selalu mengirim daftar lengkap setelah edit lokal: tambah/hapus/urutkan).
  if (Array.isArray(body.media)) {
    await admin.from('material_media').delete().eq('material_id', params.id);
    const mediaList = body.media.filter((m) => m.url?.trim());
    if (mediaList.length > 0) {
      await admin.from('material_media').insert(
        mediaList.map((m, i) => ({
          material_id: params.id,
          media_type: m.media_type,
          url: m.url,
          order_index: i,
        }))
      );
    }
  }

  return NextResponse.json({ material });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const owns = await ensureOwnership(admin, params.id, user.id);
  if (!owns) return NextResponse.json({ error: 'Materi tidak ditemukan atau bukan milikmu.' }, { status: 404 });

  const { error } = await admin.from('materials').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
