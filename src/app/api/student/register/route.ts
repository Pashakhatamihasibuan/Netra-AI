// POST body: { fullName: string; gradeLevel: string; classSectionId: string }
// Siswa daftar dengan nama + memilih kelas spesifiknya (mis. "4A") dari
// daftar kelas resmi yang sudah dibuat Kepala Sekolah. Mereka dapat kode
// akses 8 huruf untuk login kembali.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateAccessCode, generateParentPin, syntheticEmail, syntheticPassword } from '@/lib/studentAuth';

const VALID_GRADES = ['3', '4', '5', '6'];

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const { fullName, gradeLevel, classSectionId } = await req.json() as {
      fullName?: string;
      gradeLevel?: string;
      classSectionId?: string;
    };

    if (!fullName?.trim())    return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    if (!gradeLevel?.trim() || !VALID_GRADES.includes(gradeLevel.trim())) {
      return NextResponse.json({ error: 'Kelas tidak valid. Pilih 3, 4, 5, atau 6 SD.' }, { status: 400 });
    }
    if (!classSectionId?.trim()) {
      return NextResponse.json({ error: 'Pilih kelasmu (mis. 4A atau 4B).' }, { status: 400 });
    }

    // Pastikan classSectionId memang ada dan cocok dengan gradeLevel yang dipilih.
    const { data: section } = await admin
      .from('class_sections')
      .select('id, class_level')
      .eq('id', classSectionId.trim())
      .maybeSingle();

    if (!section || section.class_level !== gradeLevel.trim()) {
      return NextResponse.json({ error: 'Kelas yang dipilih tidak cocok dengan tingkat kelas.' }, { status: 400 });
    }

    // Buat kode akses unik
    let accessCode = '';
    for (let i = 0; i < 10; i++) {
      const candidate = generateAccessCode();
      const { data: existing } = await admin
        .from('users')
        .select('id')
        .eq('access_code', candidate)
        .maybeSingle();
      if (!existing) { accessCode = candidate; break; }
    }
    if (!accessCode) return NextResponse.json({ error: 'Gagal membuat kode unik, coba lagi.' }, { status: 500 });

    // Buat PIN orang tua unik (6 digit)
    let parentPin = '';
    for (let i = 0; i < 10; i++) {
      const candidate = generateParentPin();
      const { data: existingPin } = await admin
        .from('users')
        .select('id')
        .eq('parent_pin', candidate)
        .maybeSingle();
      if (!existingPin) { parentPin = candidate; break; }
    }
    if (!parentPin) return NextResponse.json({ error: 'Gagal membuat PIN unik, coba lagi.' }, { status: 500 });

    const email    = syntheticEmail(fullName.trim(), accessCode);
    const password = syntheticPassword(accessCode);

    const { data: authData, error: signUpErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: fullName.trim(), role: 'student', grade_level: gradeLevel.trim() },
    });

    if (signUpErr) {
      return NextResponse.json({ error: 'Gagal membuat akun: ' + signUpErr.message }, { status: 500 });
    }

    await new Promise((r) => setTimeout(r, 800));

    const { error: updateErr } = await admin
      .from('users')
      .update({
        name:             fullName.trim(),
        access_code:      accessCode,
        parent_pin:       parentPin,
        grade_level:      gradeLevel.trim(),
        class_section_id: section.id,
        class_id:         null,
      })
      .eq('id', authData.user.id);

    if (updateErr) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Gagal menyimpan data siswa.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      accessCode,
      parentPin,
      message: `Akun berhasil dibuat untuk kelas ${gradeLevel} SD. Simpan kode akses ini!`,
    });

  } catch (err) {
    console.error('[student/register] unexpected:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
