import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api/materialAuth';

// Gunakan service role client yang benar (bukan createServerClient dari @supabase/ssr)
function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  return (now.getMonth() + 1) >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

// GET /api/admin/class-sections
export async function GET() {
  // Validasi session admin dulu
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = makeAdmin();

  try {
    const { data, error } = await admin
      .from('class_sections')
      .select('id, class_level, section, academic_year, homeroom_teacher_id, homeroom_assigned_by_admin')
      .order('class_level', { ascending: true })
      .order('section',     { ascending: true });

    if (error) {
      console.error('[GET class-sections]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) return NextResponse.json({ sections: [] });

    // Fetch nama guru wali kelas
    const teacherIds = [...new Set(data.map((s) => s.homeroom_teacher_id).filter(Boolean))] as string[];
    let teacherMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers, error: tErr } = await admin
        .from('users')
        .select('id, name')
        .in('id', teacherIds);
      if (tErr) console.error('[GET class-sections] teacher fetch error:', tErr.message);
      teacherMap = Object.fromEntries((teachers ?? []).map((t) => [t.id, t.name]));
    }

    // Fetch jumlah siswa per kelas
    const sectionIds = data.map((s) => s.id);
    let studentCountMap: Record<string, number> = {};
    if (sectionIds.length > 0) {
      const { data: students } = await admin
        .from('users')
        .select('class_section_id')
        .eq('role', 'student')
        .in('class_section_id', sectionIds);
      (students ?? []).forEach((u) => {
        if (u.class_section_id) {
          studentCountMap[u.class_section_id] = (studentCountMap[u.class_section_id] ?? 0) + 1;
        }
      });
    }

    const sections = data.map((s) => ({
      id: s.id,
      class_level: String(s.class_level),
      section: s.section,
      academic_year: s.academic_year,
      homeroom_teacher_id: s.homeroom_teacher_id ?? null,
      homeroom_teacher_name: s.homeroom_teacher_id
        ? (teacherMap[s.homeroom_teacher_id] ?? null)
        : null,
      student_count: studentCountMap[s.id] ?? 0,
    }));

    return NextResponse.json({ sections });
  } catch (err) {
    console.error('[GET class-sections] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/class-sections
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = makeAdmin();

  try {
    const body = await req.json();
    const { classLevel, section } = body;

    if (!classLevel || !section) {
      return NextResponse.json({ error: 'classLevel dan section wajib diisi.' }, { status: 400 });
    }

    const academic_year = getCurrentAcademicYear();
    const sectionUpper  = String(section).toUpperCase();
    const classLevelStr = String(classLevel);

    const { data: existing } = await admin
      .from('class_sections')
      .select('id')
      .eq('class_level',    classLevelStr)
      .eq('section',        sectionUpper)
      .eq('academic_year',  academic_year)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Kelas ${classLevelStr} SD ${sectionUpper} sudah ada di T.A. ${academic_year}.` },
        { status: 409 }
      );
    }

    const { data, error } = await admin
      .from('class_sections')
      .insert({ class_level: classLevelStr, section: sectionUpper, academic_year })
      .select('id, class_level, section, academic_year, homeroom_teacher_id')
      .single();

    if (error) {
      console.error('[POST class-sections]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      section: { ...data, homeroom_teacher_name: null, student_count: 0 }
    }, { status: 201 });
  } catch (err) {
    console.error('[POST class-sections] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
