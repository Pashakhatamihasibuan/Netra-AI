// src/app/api/teacher/register/route.ts
// POST body: { name, email, password, teacherType: 'homeroom'|'subject',
//              subject?: string, gradeLevels?: string[], homeroomGrade?: string }
//
// Guru daftar lewat route khusus (bukan supabase.auth.signUp langsung dari
// browser) supaya kita bisa menyimpan profil tambahan (tipe guru, mata
// pelajaran, kelas yang diampu) dan — kalau dia mendaftar sebagai wali
// kelas — langsung mencoba menugaskannya ke satu kelas (mis. "4A") yang
// belum punya wali kelas. Kepala Sekolah tetap bisa mengubah/menghapus
// penugasan ini kapan saja lewat dashboard admin.

import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const VALID_GRADES = ['3', '4', '5', '6'];

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface Body {
  name?: string;
  email?: string;
  password?: string;
  teacherType?: 'homeroom' | 'subject';
  subject?: string;
  gradeLevels?: string[];
  homeroomGrade?: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Body;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? '';
    const teacherType = body.teacherType;

    if (!name) return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'Email wajib diisi.' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Kata sandi minimal 6 karakter.' }, { status: 400 });
    if (teacherType !== 'homeroom' && teacherType !== 'subject') {
      return NextResponse.json({ error: 'Pilih tipe guru: wali kelas atau guru mata pelajaran.' }, { status: 400 });
    }

    let gradeLevels: string[] = [];
    let homeroomGrade: string | null = null;
    let subject: string | null = null;

    if (teacherType === 'subject') {
      subject = body.subject?.trim() || null;
      if (!subject) return NextResponse.json({ error: 'Mata pelajaran wajib diisi.' }, { status: 400 });
      gradeLevels = (body.gradeLevels ?? []).filter((g) => VALID_GRADES.includes(g));
      if (gradeLevels.length === 0) {
        return NextResponse.json({ error: 'Pilih minimal satu kelas yang diajar.' }, { status: 400 });
      }
    } else {
      homeroomGrade = body.homeroomGrade?.trim() || null;
      if (!homeroomGrade || !VALID_GRADES.includes(homeroomGrade)) {
        return NextResponse.json({ error: 'Pilih kelas yang ingin diampu (3-6 SD).' }, { status: 400 });
      }
    }

    const admin = makeAdmin();

    const { data: authData, error: signUpErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'teacher' },
    });

    if (signUpErr || !authData.user) {
      const msg = signUpErr?.message ?? 'unknown';
      const duplicate = /already.*registered|already.*exists|duplicate/i.test(msg);
      return NextResponse.json(
        { error: duplicate ? 'Email sudah terdaftar. Gunakan menu Masuk.' : 'Gagal membuat akun: ' + msg },
        { status: duplicate ? 409 : 500 }
      );
    }

    await new Promise((r) => setTimeout(r, 800)); // beri waktu trigger insert ke public.users

    let assignedSection: { id: string; class_level: string; section: string } | null = null;

    if (teacherType === 'homeroom' && homeroomGrade) {
      // Cari kelas yang BELUM di-assign admin dan belum punya wali kelas
      const { data: openSection } = await admin
        .from('class_sections')
        .select('id, class_level, section')
        .eq('class_level', homeroomGrade)
        .is('homeroom_teacher_id', null)
        .eq('homeroom_assigned_by_admin', false)
        .order('section', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (openSection) {
        await admin
          .from('class_sections')
          .update({ homeroom_teacher_id: authData.user.id })
          .eq('id', openSection.id)
          .eq('homeroom_assigned_by_admin', false); // double-check: jangan override yang sudah di-assign admin
        assignedSection = openSection;
      }
    }

    const { error: updateErr } = await admin
      .from('users')
      .update({
        name,
        teacher_type: teacherType,
        subject,
        teacher_grade_levels: teacherType === 'subject' ? gradeLevels : (homeroomGrade ? [homeroomGrade] : null),
      })
      .eq('id', authData.user.id);

    if (updateErr) {
      console.error('[teacher/register] gagal update profil:', updateErr.message);
    }

    // Langsung sign-in supaya guru tidak perlu login manual lagi setelah daftar.
    const cookieStore = cookies();
    const cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }> = [];
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n: string) => cookieStore.get(n)?.value,
          set: (n: string, v: string, o: any) => cookiesToSet.push({ name: n, value: v, options: o }),
          remove: (n: string, o: any) => cookiesToSet.push({ name: n, value: '', options: o }),
        },
      }
    );

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      console.error('[teacher/register] auto sign-in gagal:', signInErr.message);
      return NextResponse.json({
        success: true,
        autoSignedIn: false,
        message: 'Akun dibuat. Silakan masuk dengan email & kata sandimu.',
      });
    }

    const message = teacherType === 'homeroom'
      ? (assignedSection
          ? `Akun dibuat. Kamu ditugaskan sebagai wali kelas ${assignedSection.class_level} SD ${assignedSection.section}.`
          : `Akun dibuat sebagai calon wali kelas ${homeroomGrade} SD, tapi semua kelas tingkat itu sudah punya wali kelas. Hubungi Kepala Sekolah untuk penempatan.`)
      : `Akun dibuat sebagai guru mata pelajaran ${subject}.`;

    const response = NextResponse.json({ success: true, autoSignedIn: true, message });
    for (const { name: cn, value, options } of cookiesToSet) {
      response.cookies.set({ name: cn, value, ...options });
    }
    return response;

  } catch (err) {
    console.error('[teacher/register] unexpected:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 });
  }
}
