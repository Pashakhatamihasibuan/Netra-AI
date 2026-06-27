/**
 * /api/teacher/profile
 *
 * GET  — ambil profil guru yang sedang login, termasuk:
 *         - data diri (nama, NIP, dll)
 *         - teacher_type (homeroom / subject)
 *         - homeroom_section: kelas yang dia ampu sebagai wali kelas
 *           (diisi otomatis dari tabel class_sections)
 *         - students: daftar siswa di kelas tersebut
 *
 * PATCH — update data diri guru (name, nip, birth_place, dll)
 *
 * FIX: sebelumnya homeroom_section & teacher_type tidak di-sync saat
 * kepala sekolah menugaskan guru sebagai wali kelas via ClassSectionManager.
 * Sekarang GET selalu baca ulang dari class_sections → users JOIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

function makeSupabase(useServiceRole = false) {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    useServiceRole
      ? process.env.SUPABASE_SERVICE_ROLE_KEY!
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Verifikasi user lewat anon client (baca cookie session)
    const anonClient = makeSupabase(false);
    const { data: authData, error: authError } = await anonClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    // Gunakan service role untuk query agar tidak diblok RLS
    const sb = makeSupabase(true);

    // 1. Data diri guru dari tabel users
    const { data: teacher, error: teacherErr } = await sb
      .from('users')
      .select('id, name, email, teacher_type, subject, teacher_grade_levels, nip, birth_place, birth_date, address, phone')
      .eq('id', userId)
      .eq('role', 'teacher')
      .single();

    if (teacherErr || !teacher) {
      return NextResponse.json({ error: 'Profil guru tidak ditemukan.' }, { status: 404 });
    }

    // 2. Cari apakah guru ini ditugaskan sebagai wali kelas di class_sections
    //    Kepala sekolah menugaskan via PATCH /api/admin/class-sections/[id]
    //    yang men-set homeroom_teacher_id di tabel class_sections.
    //    Kita sync balik teacher_type di sini.
    const { data: homeroomSection } = await sb
      .from('class_sections')
      .select('id, class_level, section, academic_year')
      .eq('homeroom_teacher_id', userId)
      .maybeSingle();

    // 3. Tentukan teacher_type yang efektif:
    //    - Jika ada di class_sections sebagai homeroom_teacher_id → 'homeroom'
    //    - Jika tidak → pakai nilai dari kolom teacher_type di users
    //    Ini menangani kasus: guru di-assign wali kelas tapi teacher_type di users
    //    belum di-update (race condition / lupa update).
    const effectiveTeacherType: 'homeroom' | 'subject' | null =
      homeroomSection ? 'homeroom' : (teacher.teacher_type as 'homeroom' | 'subject' | null);

    // 4. Jika teacher_type di DB tidak konsisten dengan class_sections, sync sekarang
    if (homeroomSection && teacher.teacher_type !== 'homeroom') {
      await sb
        .from('users')
        .update({ teacher_type: 'homeroom' })
        .eq('id', userId);
    }
    // Jika tidak lagi jadi wali kelas tapi teacher_type masih 'homeroom', reset
    if (!homeroomSection && teacher.teacher_type === 'homeroom') {
      await sb
        .from('users')
        .update({ teacher_type: 'subject' })
        .eq('id', userId);
    }

    // 5. Ambil daftar siswa di kelas (hanya jika wali kelas)
    let students: { id: string; name: string; access_code: string }[] = [];
    if (homeroomSection) {
      const { data: studentData } = await sb
        .from('users')
        .select('id, name, access_code')
        .eq('role', 'student')
        .eq('class_section_id', homeroomSection.id)
        .order('name', { ascending: true });
      students = (studentData ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        access_code: s.access_code ?? '—',
      }));
    }

    // 6. Untuk guru mapel: hitung jumlah siswa per tingkat yang diajar
    let gradeCounts: { class_level: string; student_count: number }[] = [];
    if (effectiveTeacherType === 'subject' && teacher.teacher_grade_levels?.length) {
      const { data: gradeData } = await sb
        .from('users')
        .select('grade_level')
        .eq('role', 'student')
        .in('grade_level', teacher.teacher_grade_levels);
      if (gradeData) {
        const countMap: Record<string, number> = {};
        gradeData.forEach((u) => {
          if (u.grade_level) countMap[u.grade_level] = (countMap[u.grade_level] ?? 0) + 1;
        });
        gradeCounts = Object.entries(countMap).map(([class_level, student_count]) => ({
          class_level,
          student_count,
        }));
      }
    }

    return NextResponse.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      teacher_type: effectiveTeacherType,
      subject: teacher.subject ?? null,
      nip: teacher.nip ?? null,
      birth_place: teacher.birth_place ?? null,
      birth_date: teacher.birth_date ?? null,
      address: teacher.address ?? null,
      phone: teacher.phone ?? null,
      homeroom_section: homeroomSection
        ? {
            id: homeroomSection.id,
            class_level: String(homeroomSection.class_level),
            section: homeroomSection.section,
            academic_year: homeroomSection.academic_year,
          }
        : null,
      students,
      grade_counts: gradeCounts,
    });
  } catch (err) {
    console.error('[GET /api/teacher/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const anonClient = makeSupabase(false);
    const { data: authData, error: authError } = await anonClient.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authData.user.id;

    const body = await req.json();
    const { name, nip, birth_place, birth_date, address, phone, subject } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nama tidak boleh kosong.' }, { status: 400 });
    }

    const sb = makeSupabase(true);

    const updatePayload: Record<string, unknown> = {
      name: name.trim(),
      nip: nip ?? null,
      birth_place: birth_place ?? null,
      birth_date: birth_date ?? null,
      address: address ?? null,
      phone: phone ?? null,
      subject: subject ?? null,
    };

    const { data, error } = await sb
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .eq('role', 'teacher')
      .select('id, name, email, teacher_type, subject, nip, birth_place, birth_date, address, phone')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[PATCH /api/teacher/profile]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
