/**
 * PUBLIC API — tidak butuh autentikasi.
 * Dipakai oleh form registrasi siswa untuk mengambil daftar kelas
 * yang tersedia berdasarkan tingkat (grade_level).
 *
 * GET /api/class-sections?grade=3
 * GET /api/class-sections          → semua kelas tahun ajaran aktif
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Gunakan service-role agar tidak diblok RLS
// (data ini memang publik — hanya nama kelas, bukan data sensitif)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getCurrentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const grade = req.nextUrl.searchParams.get("grade");
    const academicYear = getCurrentAcademicYear();

    let query = supabase
      .from("class_sections")
      .select("id, class_level, section, academic_year, homeroom_teacher_id")
      .eq("academic_year", academicYear)
      .order("class_level", { ascending: true })
      .order("section", { ascending: true });

    if (grade) {
      query = query.eq("class_level", grade);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/class-sections] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambil nama wali kelas lewat join manual (kolom homeroom_teacher_name
    // TIDAK ada di tabel class_sections — hanya homeroom_teacher_id).
    const teacherIds = [...new Set((data ?? []).map((s) => s.homeroom_teacher_id).filter(Boolean))] as string[];
    let teacherMap: Record<string, string> = {};
    if (teacherIds.length > 0) {
      const { data: teachers, error: tErr } = await supabase
        .from("users")
        .select("id, name")
        .in("id", teacherIds);
      if (tErr) console.error("[GET /api/class-sections] teacher fetch error:", tErr.message);
      teacherMap = Object.fromEntries((teachers ?? []).map((t) => [t.id, t.name]));
    }

    // Normalisasi class_level ke string
    const sections = (data ?? []).map((s) => ({
      id: s.id,
      class_level: String(s.class_level),
      section: s.section,
      academic_year: s.academic_year,
      homeroom_teacher_name: s.homeroom_teacher_id ? (teacherMap[s.homeroom_teacher_id] ?? null) : null,
      label: `${s.class_level} SD ${s.section}`,
    }));

    return NextResponse.json(
      { sections },
      {
        headers: {
          // Cache 10 detik — cukup fresh, tidak hammer DB tiap request
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
        },
      },
    );
  } catch (err) {
    console.error("[GET /api/class-sections] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
