// src/app/api/teacher/materials/route.ts
// GET  -> daftar materi milik guru (dengan media + ringkasan status akses)
// POST -> buat materi baru, ditargetkan ke (subject, class_level) supaya
//         otomatis tersinkron ke semua siswa kelas itu, dari guru manapun
//         yang membuatnya. Materi guru lain TIDAK pernah muncul di sini —
//         query selalu dibatasi teacher_id = guru yang sedang login.

import { NextResponse } from 'next/server';
import { requireTeacher, resolveTargetSection } from '@/lib/api/materialAuth';

const VALID_GRADES = ['3', '4', '5', '6'];

export async function GET() {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

  const { data: materials, error } = await admin
    .from('materials')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!materials || materials.length === 0) return NextResponse.json({ materials: [] });

  const materialIds = materials.map((m) => m.id);

  const [{ data: media }, { data: access }] = await Promise.all([
    admin.from('material_media').select('*').in('material_id', materialIds).order('order_index'),
    admin.from('material_access').select('material_id, status').in('material_id', materialIds),
  ]);

  const sectionIds = [...new Set(materials.map((m: any) => m.target_section_id).filter(Boolean))] as string[];
  let sectionMap: Record<string, string> = {};
  if (sectionIds.length > 0) {
    const { data: sectionsData } = await admin
      .from('class_sections')
      .select('id, class_level, section')
      .in('id', sectionIds);
    sectionMap = Object.fromEntries(
      (sectionsData ?? []).map((s: any) => [s.id, `${s.class_level} SD ${s.section}`])
    );
  }

  const result = materials.map((m: any) => ({
    ...m,
    class_name: m.target_section_id
      ? (sectionMap[m.target_section_id] ?? `${m.class_level} SD`)
      : (m.class_level ? `${m.class_level} SD (semua kelas)` : 'Semua kelas'),
    media: (media ?? []).filter((md) => md.material_id === m.id),
    pending_requests: (access ?? []).filter((a) => a.material_id === m.id && a.status === 'requested').length,
    active_count: (access ?? []).filter((a) => a.material_id === m.id && a.status === 'active').length,
    join_code: m.join_code ?? null,
  }));

  return NextResponse.json({ materials: result });
}

export async function POST(req: Request) {
  const auth = await requireTeacher();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { user, admin } = auth;

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
    .insert({
      teacher_id: user.id,
      class_id: null,
      subject: body.subject.trim(),
      class_level: body.class_level,
      target_section_id: targetSectionId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      content: body.content?.trim() || null,
      default_duration_minutes: duration,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const mediaList = (body.media ?? []).filter((m) => m.url?.trim());
  if (mediaList.length > 0) {
    const { error: mediaError } = await admin.from('material_media').insert(
      mediaList.map((m, i) => ({
        material_id: material.id,
        media_type: m.media_type,
        url: m.url,
        order_index: i,
      }))
    );
    if (mediaError) {
      return NextResponse.json({ error: `Materi dibuat tapi gagal simpan media: ${mediaError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ material: { ...material, media: mediaList } });
}
