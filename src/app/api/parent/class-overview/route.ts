// src/app/api/parent/class-overview/route.ts
// GET ?studentId=... -> info kelas anak (class_section, mis. "4 SD A") +
// nama wali kelas + ringkasan nilai & health score ANAK SENDIRI saja.
//
// PRIVASI: route ini SENGAJA tidak mengembalikan roster teman sekelas
// (nama, nilai, health score siswa lain) sama sekali. Versi sebelumnya
// menyembunyikan nilai/health teman sekelas tapi masih mengirim NAMA
// mereka ke browser orang tua — itu tetap kebocoran privasi (orang tua
// jadi tahu siapa saja teman sekelas anaknya). Orang tua hanya boleh
// melihat data anaknya sendiri, titik.

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  if (!studentId) return NextResponse.json({ error: 'studentId wajib diisi.' }, { status: 400 });

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: parentProfile } = await admin.from('users').select('role').eq('id', user.id).maybeSingle();
  if (parentProfile?.role !== 'parent') return NextResponse.json({ error: 'Bukan orang tua.' }, { status: 403 });

  // Pastikan studentId memang anak yang tertaut ke orang tua ini.
  const { data: child } = await admin
    .from('users').select('id, name, class_section_id').eq('id', studentId).eq('parent_id', user.id).maybeSingle();
  if (!child) return NextResponse.json({ error: 'Anak tidak ditemukan atau bukan anakmu.' }, { status: 403 });

  if (!child.class_section_id) {
    return NextResponse.json({ class: null, me: null });
  }

  const { data: section } = await admin
    .from('class_sections').select('id, class_level, section, homeroom_teacher_id').eq('id', child.class_section_id).maybeSingle();
  if (!section) return NextResponse.json({ class: null, me: null });

  const { data: teacher } = section.homeroom_teacher_id
    ? await admin.from('users').select('name').eq('id', section.homeroom_teacher_id).maybeSingle()
    : { data: null };

  const [{ data: myResults }, { data: myHealthRows }, { count: classmateCount }] = await Promise.all([
    admin.from('quiz_results').select('score').eq('user_id', child.id),
    admin.from('health_records').select('health_score, created_at').eq('user_id', child.id).order('created_at', { ascending: false }).limit(1),
    admin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student').eq('class_section_id', section.id),
  ]);

  const avgScore = myResults?.length
    ? Math.round(myResults.reduce((sum, r) => sum + (r.score ?? 0), 0) / myResults.length)
    : null;

  return NextResponse.json({
    class: {
      id: section.id,
      name: `${section.class_level} SD ${section.section}`,
      teacher_name: teacher?.name ?? null,
      student_count: classmateCount ?? 0,
    },
    me: {
      name: child.name,
      quiz_count: myResults?.length ?? 0,
      avg_score: avgScore,
      latest_health_score: myHealthRows?.[0]?.health_score ?? null,
    },
  });
}
