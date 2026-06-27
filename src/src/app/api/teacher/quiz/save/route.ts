import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveTargetSection } from '@/lib/api/materialAuth';

// Gunakan helper bersama agar cookie session di-handle identik
// di semua route handler — sebelumnya makeUserClient() custom di sini
// tidak sync dengan lib/supabase/server.ts sehingga getUser() gagal.
function makeUserClient() {
  return createServerSupabaseClient();
}

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface QuestionPayload {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  image_url?: string | null;
  order_index?: number;
}

interface SaveBody {
  quizId?: string;          // ada = edit, tidak ada = create baru
  title: string;
  description?: string;
  subject: string;
  class_level: string;
  target_section_id?: string | null;
  questions: QuestionPayload[];
}

const VALID_GRADES = ['1', '2', '3', '4', '5', '6'];

// POST /api/teacher/quiz/save
// Menerima quiz + soal dari QuizForm/QuizBuilder dan menyimpan ke DB
// menggunakan service role (bypass RLS) setelah memverifikasi sesi guru.
export async function POST(req: Request) {
  const userClient = makeUserClient();
  const { data: { user } } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
  }

  const admin = makeAdmin();

  // Verifikasi role guru — coba dari DB, fallback ke metadata
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role ?? user.user_metadata?.role;
  if (role !== 'teacher') {
    return NextResponse.json({ error: 'Hanya guru yang bisa menyimpan kuis.' }, { status: 403 });
  }

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request tidak valid.' }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'Judul kuis wajib diisi.' }, { status: 400 });
  }

  if (!body.subject?.trim()) {
    return NextResponse.json({ error: 'Mata pelajaran wajib diisi.' }, { status: 400 });
  }

  if (!body.class_level || !VALID_GRADES.includes(body.class_level)) {
    return NextResponse.json({ error: 'Pilih kelas tujuan kuis (1-6 SD).' }, { status: 400 });
  }

  // Jika guru pilih section spesifik, pastikan section itu memang ada
  // dan grade-nya cocok dengan class_level yang dipilih.
  const sectionResult = await resolveTargetSection(admin, body.target_section_id, body.class_level);
  if ('error' in sectionResult) {
    return NextResponse.json({ error: sectionResult.error }, { status: 400 });
  }
  const targetSectionId = sectionResult.targetSectionId;

  if (!body.questions?.length) {
    return NextResponse.json({ error: 'Kuis harus punya minimal 1 soal.' }, { status: 400 });
  }

  let quizId = body.quizId;

  if (quizId) {
    // ── MODE EDIT ──────────────────────────────────────────────────────
    // Pastikan guru yang edit adalah pemilik quiz
    const { data: existing } = await admin
      .from('quizzes')
      .select('teacher_id')
      .eq('id', quizId)
      .single();

    if (!existing || existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Kuis tidak ditemukan atau bukan milik kamu.' }, { status: 403 });
    }

    const { error: updateErr } = await admin
      .from('quizzes')
      .update({
        title:       body.title.trim(),
        description: body.description ?? null,
        subject:     body.subject.trim(),
        class_level: body.class_level,
        target_section_id: targetSectionId,
      })
      .eq('id', quizId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Hapus soal lama, ganti dengan yang baru (replace strategy)
    const { error: delErr } = await admin
      .from('questions')
      .delete()
      .eq('quiz_id', quizId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

  } else {
    // ── MODE CREATE ────────────────────────────────────────────────────
    const { data: newQuiz, error: quizErr } = await admin
      .from('quizzes')
      .insert({
        teacher_id:  user.id,
        title:       body.title.trim(),
        description: body.description ?? null,
        subject:     body.subject.trim(),
        class_level: body.class_level,
        target_section_id: targetSectionId,
      })
      .select('id')
      .single();

    if (quizErr || !newQuiz) {
      return NextResponse.json({ error: quizErr?.message ?? 'Gagal membuat kuis.' }, { status: 500 });
    }

    quizId = newQuiz.id;
  }

  // ── INSERT SOAL ────────────────────────────────────────────────────────
  const rows = body.questions
    .filter((q) => q.question?.trim())
    .map((q, i) => ({
      quiz_id:        quizId,
      question:       q.question.trim(),
      option_a:       q.option_a,
      option_b:       q.option_b,
      option_c:       q.option_c,
      option_d:       q.option_d,
      correct_answer: q.correct_answer,
      image_url:      q.image_url ?? null,
      order_index:    q.order_index ?? i,
    }));

  const { error: qErr } = await admin.from('questions').insert(rows);
  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  return NextResponse.json({ quizId, total: rows.length });
}
