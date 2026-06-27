/**
 * GET /api/public/class-sections
 *
 * Endpoint PUBLIK — tidak butuh autentikasi.
 * Dipanggil oleh form registrasi siswa di LoginPage.tsx untuk mengisi
 * dropdown "Kelas Spesifik".
 *
 * Response: { sections: Array<{ id, class_level, section, academic_year }> }
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getCurrentAcademicYear(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export async function GET() {
  try {
    // Service role agar tidak diblok RLS — data kelas bukan data sensitif
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from('class_sections')
      .select('id, class_level, section, academic_year')
      .eq('academic_year', getCurrentAcademicYear())
      .order('class_level', { ascending: true })
      .order('section',     { ascending: true });

    if (error) {
      console.error('[GET /api/public/class-sections]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Normalisasi class_level ke string (jaga-jaga jika DB simpan sebagai integer)
    const sections = (data ?? []).map((s) => ({
      id:            s.id,
      class_level:   String(s.class_level),
      section:       s.section,
      academic_year: s.academic_year,
    }));

    return NextResponse.json({ sections });
  } catch (err) {
    console.error('[GET /api/public/class-sections] unexpected:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
