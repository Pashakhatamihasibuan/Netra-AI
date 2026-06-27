// src/i18n/translations.ts
// Centralized translations for Netra AI — ID (default) and EN

export type Lang = 'id' | 'en';

export const translations = {
  // ── LANDING PAGE ────────────────────────────────────────────────────────
  landing: {
    tagline:    { id: 'Platform AI untuk SD Indonesia',              en: 'AI Platform for Indonesian Primary Schools' },
    hero_title_smart: { id: 'cerdas',                               en: 'smarter' },
    hero_title_healthy: { id: 'sehat',                              en: 'healthier' },
    hero_desc:  { id: 'Netra AI membantu siswa SD belajar dengan konten adaptif sambil menjaga kesehatan mata dan postur secara real-time.',
                  en: 'Netra AI helps primary students learn with adaptive content while protecting eye health and posture in real-time.' },
    cta_student: { id: 'Mulai sebagai Siswa →',                     en: 'Start as Student →' },
    cta_teacher: { id: 'Saya seorang Guru',                         en: "I'm a Teacher" },
    stat_roles:  { id: '4 Peran',                                   en: '4 Roles' },
    stat_roles_sub: { id: 'Siswa, Guru, Ortu, Kepsek',             en: 'Student, Teacher, Parent, Principal' },
    stat_realtime: { id: 'Real-time',                               en: 'Real-time' },
    stat_rt_sub: { id: 'Monitor AI setiap detik',                   en: 'AI monitor every second' },
    stat_cv:    { id: 'CV + Kuis',                                   en: 'CV + Quiz' },
    stat_cv_sub: { id: 'Dalam satu platform',                       en: 'In one platform' },
    roles_title: { id: 'Untuk semua pihak',                         en: 'For everyone' },
    roles_heading: { id: 'Pilih peranmu',                           en: 'Choose your role' },
    features_tag: { id: 'Fitur unggulan',                           en: 'Key features' },
    features_heading: { id: 'Satu platform, banyak manfaat',        en: 'One platform, many benefits' },
    enter:       { id: 'Masuk',                                      en: 'Sign In' },
  },

  // ── ROLES ───────────────────────────────────────────────────────────────
  roles: {
    student:     { id: 'Siswa',           en: 'Student' },
    teacher:     { id: 'Guru',            en: 'Teacher' },
    parent:      { id: 'Orang Tua',       en: 'Parent' },
    admin:       { id: 'Kepala Sekolah',  en: 'Principal' },
    student_desc: { id: 'Akses materi, kerjakan kuis, dan pantau kesehatan belajarmu',
                    en: 'Access materials, take quizzes, and monitor your learning health' },
    teacher_desc: { id: 'Buat materi & kuis, pantau progres dan kesehatan belajar siswa',
                    en: 'Create materials & quizzes, monitor student progress and health' },
    parent_desc:  { id: 'Pantau aktivitas, skor, dan kebiasaan belajar anak setiap hari',
                    en: "Monitor your child's activity, scores, and daily study habits" },
    admin_desc:   { id: 'Kelola kelas, guru, dan struktur akademik seluruh sekolah',
                    en: 'Manage classes, teachers, and the school academic structure' },
    student_tag: { id: 'Kelas 3–6 SD',        en: 'Grade 3–6' },
    teacher_tag: { id: 'Guru Mapel & Wali Kelas', en: 'Subject & Homeroom Teacher' },
    parent_tag:  { id: 'Monitoring Harian',   en: 'Daily Monitoring' },
    admin_tag:   { id: 'Admin Sekolah',        en: 'School Admin' },
  },

  // ── FEATURES ────────────────────────────────────────────────────────────
  features: {
    adaptive_title: { id: 'Pembelajaran Adaptif',   en: 'Adaptive Learning' },
    adaptive_desc:  { id: 'Materi dan kuis menyesuaikan kecepatan belajar setiap siswa secara otomatis.',
                      en: 'Materials and quizzes automatically adapt to each student\'s learning pace.' },
    distance_title: { id: 'Monitor Jarak Layar',    en: 'Screen Distance Monitor' },
    distance_desc:  { id: 'Kamera AI mendeteksi posisi duduk dan jarak layar agar mata siswa terlindungi.',
                      en: 'AI camera detects sitting position and screen distance to protect student eyes.' },
    posture_title:  { id: 'Deteksi Postur',          en: 'Posture Detection' },
    posture_desc:   { id: 'Notifikasi real-time saat postur belajar siswa tidak ergonomis.',
                      en: 'Real-time notifications when student study posture is not ergonomic.' },
    report_title:   { id: 'Laporan Orang Tua',       en: 'Parent Reports' },
    report_desc:    { id: 'Dashboard lengkap aktivitas belajar anak setiap hari langsung ke orang tua.',
                      en: "Complete dashboard of child's daily learning activity directly to parents." },
  },

  // ── LOGIN PAGE ──────────────────────────────────────────────────────────
  login: {
    platform_desc: { id: 'Platform Pembelajaran Cerdas & Sehat', en: 'Smart & Healthy Learning Platform' },
    choose_role:   { id: 'Pilih peranmu',   en: 'Choose your role' },
    back:          { id: 'Kembali',          en: 'Back' },
    enter_btn:     { id: 'Masuk',            en: 'Sign In' },
    register_btn:  { id: 'Daftar',          en: 'Register' },
    sign_in_label: { id: '🔓 Masuk',        en: '🔓 Sign In' },
    register_label: { id: '📝 Daftar',      en: '📝 Register' },
    // Student
    access_code:   { id: 'Kode Akses',      en: 'Access Code' },
    access_code_hint: { id: '8 karakter yang kamu dapat saat mendaftar.', en: '8 characters you received when registering.' },
    full_name:     { id: 'Nama Lengkap',     en: 'Full Name' },
    grade_level:   { id: 'Tingkat Kelas',    en: 'Grade Level' },
    class_specific: { id: 'Kelas Spesifik', en: 'Specific Class' },
    class_loading: { id: 'Memuat kelas…',   en: 'Loading classes…' },
    class_empty:   { id: 'Belum ada kelas {grade} SD. Hubungi Kepala Sekolah.', en: 'No grade {grade} class yet. Contact the Principal.' },
    choose_class:  { id: 'Pilih kelas…',    en: 'Choose class…' },
    no_email_hint: { id: 'Tidak perlu email. Kamu akan mendapat kode akses untuk login.', en: 'No email needed. You will receive an access code to log in.' },
    register_now:  { id: 'Daftar Sekarang', en: 'Register Now' },
    login_student: { id: 'Masuk',           en: 'Sign In' },
    // Teacher
    email:         { id: 'Email',            en: 'Email' },
    password:      { id: 'Kata Sandi',       en: 'Password' },
    teacher_type:  { id: 'Tipe Guru',        en: 'Teacher Type' },
    subject_teacher: { id: 'Guru Mata Pelajaran', en: 'Subject Teacher' },
    homeroom_teacher: { id: 'Wali Kelas',   en: 'Homeroom Teacher' },
    subject:       { id: 'Mata Pelajaran',   en: 'Subject' },
    classes_taught: { id: 'Kelas yang Diajar', en: 'Classes Taught' },
    homeroom_grade: { id: 'Kelas yang Ingin Diampu', en: 'Desired Homeroom Grade' },
    homeroom_hint:  { id: 'Penugasan akhir ke section kelas diatur Kepala Sekolah.', en: 'Final class assignment is managed by the Principal.' },
    login_as_teacher: { id: 'Masuk sebagai Guru', en: 'Sign In as Teacher' },
    register_as_teacher: { id: 'Daftar sebagai Guru', en: 'Register as Teacher' },
    // Parent
    child_name:    { id: 'Nama Anak',        en: "Child's Name" },
    child_name_ph: { id: 'Sesuai nama yang didaftarkan', en: 'As registered name' },
    parent_pin:    { id: 'PIN Orang Tua (6 digit)', en: 'Parent PIN (6 digits)' },
    parent_pin_hint: { id: 'PIN tersedia di dashboard anak, atau tanyakan langsung.', en: "PIN is available on the child's dashboard or ask them directly." },
    login_as_parent: { id: 'Masuk sebagai Orang Tua', en: 'Sign In as Parent' },
    // Admin
    admin_name:    { id: 'Nama Kepala Sekolah', en: 'Principal Name' },
    admin_code:    { id: 'Kode Admin Sekolah', en: 'School Admin Code' },
    admin_code_hint: { id: 'Tanpa kode ini, akun Kepala Sekolah tidak bisa dibuat.', en: 'Without this code, a Principal account cannot be created.' },
    admin_code_ph: { id: 'Kode dari pengelola sistem', en: 'Code from system administrator' },
    login_as_admin: { id: 'Masuk sebagai Kepala Sekolah', en: 'Sign In as Principal' },
    register_as_admin: { id: 'Daftar sebagai Kepala Sekolah', en: 'Register as Principal' },
    first_time:    { id: '📝 Daftar Pertama Kali', en: '📝 First-time Registration' },
    min_pass:      { id: 'Min. 6 karakter',   en: 'Min. 6 characters' },
  },

  // ── NAVBAR ──────────────────────────────────────────────────────────────
  nav: {
    dashboard:    { id: '🏠 Dashboard',      en: '🏠 Dashboard' },
    materials:    { id: '📚 Materi',          en: '📚 Materials' },
    health:       { id: '💚 Riwayat Kesehatan', en: '💚 Health History' },
    new_quiz:     { id: '➕ Kuis Baru',       en: '➕ New Quiz' },
    logout:       { id: 'Keluar',             en: 'Sign Out' },
  },

  // ── DASHBOARDS (shared) ─────────────────────────────────────────────────
  dashboard: {
    loading:      { id: 'Memuat profil…',    en: 'Loading profile…' },
    error_load:   { id: 'Tidak dapat memuat profil.', en: 'Could not load profile.' },
    login_again:  { id: 'Masuk ulang',       en: 'Sign in again' },
    ready_today:  { id: 'Siap belajar hari ini?', en: 'Ready to learn today?' },
    hello:        { id: 'Halo 👋',            en: 'Hello 👋' },
    // Teacher dashboard tabs
    tab_quiz:     { id: '📝 Kuis',            en: '📝 Quiz' },
    tab_materials: { id: '📚 Materi',         en: '📚 Materials' },
    tab_requests:  { id: '🔔 Permintaan',     en: '🔔 Requests' },
    tab_results:   { id: '📊 Hasil',          en: '📊 Results' },
    tab_profile:   { id: '👤 Profil',          en: '👤 Profile' },
    // Admin tabs
    tab_classes:   { id: 'Wali Kelas',        en: 'Homeroom Classes' },
    tab_teachers:  { id: 'Direktori Guru',    en: 'Teacher Directory' },
    // Student
    join_quiz:     { id: '🎯 Ikut Kuis',      en: '🎯 Join Quiz' },
    join_desc:     { id: 'Masukkan kode 6 huruf dari gurumu.', en: 'Enter the 6-letter code from your teacher.' },
    join_placeholder: { id: 'XXXXXX',         en: 'XXXXXX' },
    join_btn:      { id: 'Masuk Kuis',        en: 'Join Quiz' },
  },

  // ── QUIZ ────────────────────────────────────────────────────────────────
  quiz: {
    my_quizzes:   { id: '📝 Kuis Saya',       en: '📝 My Quizzes' },
    new_quiz:     { id: '+ Kuis Baru',         en: '+ New Quiz' },
    loading:      { id: 'Memuat…',             en: 'Loading…' },
    empty:        { id: 'Belum ada kuis. Buat yang pertama!', en: 'No quizzes yet. Create the first one!' },
    create_first: { id: 'Buat kuis pertama',   en: 'Create first quiz' },
    general:      { id: 'UMUM',                en: 'GENERAL' },
    code_label:   { id: 'Kode Kuis',           en: 'Quiz Code' },
    copy:         { id: 'Salin',               en: 'Copy' },
    copied:       { id: '✓ Tersalin',          en: '✓ Copied' },
    share_to_students: { id: 'Bagikan ke siswa', en: 'Share to students' },
    generate_code: { id: 'Buat Kode',          en: 'Generate Code' },
    edit:         { id: '✎ Edit',              en: '✎ Edit' },
    delete:       { id: '🗑 Hapus',             en: '🗑 Delete' },
    delete_confirm: { id: 'Apakah Anda yakin ingin menghapus kuis ini beserta semua pertanyaannya?',
                      en: 'Are you sure you want to delete this quiz and all its questions?' },
    // Quiz form
    create_title: { id: 'Buat Kuis Baru',     en: 'Create New Quiz' },
    edit_title:   { id: 'Edit Kuis',           en: 'Edit Quiz' },
    title_label:  { id: 'Judul Kuis',          en: 'Quiz Title' },
    title_ph:     { id: 'Misal: Ulangan Harian IPA', en: 'E.g.: Daily Science Test' },
    desc_label:   { id: 'Deskripsi (Opsional)', en: 'Description (Optional)' },
    subject_label: { id: 'Mata Pelajaran',     en: 'Subject' },
    subject_ph:   { id: 'Misal: Matematika, IPA, IPS', en: 'E.g.: Math, Science, Social Studies' },
    target_class: { id: 'Kelas Tujuan',        en: 'Target Grade' },
    choose_grade: { id: 'Pilih kelas...',      en: 'Choose grade...' },
    loading_grades: { id: 'Memuat kelas...',   en: 'Loading grades...' },
    auto_visible:  { id: 'Kuis otomatis tampil ke semua siswa kelas ini.', en: 'Quiz automatically visible to all students in this grade.' },
    specific_class: { id: 'Kelas Spesifik (Opsional)', en: 'Specific Class (Optional)' },
    all_classes:  { id: 'Semua kelas',         en: 'All classes' },
    specific_hint: { id: 'Pilih jika hanya untuk satu kelas, mis. 3 SD A saja.', en: 'Choose if only for one class, e.g. Grade 3A only.' },
    questions:    { id: 'Daftar Pertanyaan',   en: 'Questions' },
    add_question: { id: '+ Tambah Pertanyaan', en: '+ Add Question' },
    no_questions: { id: 'Belum ada pertanyaan. Klik tombol di atas untuk menambah.', en: 'No questions yet. Click the button above to add.' },
    question_num: { id: 'Soal #',              en: 'Q #' },
    question_ph:  { id: 'Masukkan pertanyaan di sini...', en: 'Enter question here...' },
    image_label:  { id: 'Gambar Soal (Opsional)', en: 'Question Image (Optional)' },
    answer_key:   { id: 'Kunci Jawaban Benar:', en: 'Correct Answer:' },
    remove:       { id: 'Hapus',               en: 'Remove' },
    cancel:       { id: 'Batal',               en: 'Cancel' },
    save:         { id: 'Simpan Kuis',         en: 'Save Quiz' },
    saving:       { id: 'Menyimpan...',        en: 'Saving...' },
  },

  // ── COMMON ──────────────────────────────────────────────────────────────
  common: {
    loading:      { id: 'Memuat...',           en: 'Loading...' },
    save:         { id: 'Simpan',              en: 'Save' },
    cancel:       { id: 'Batal',              en: 'Cancel' },
    edit:         { id: 'Edit',               en: 'Edit' },
    delete:       { id: 'Hapus',              en: 'Delete' },
    close:        { id: 'Tutup',              en: 'Close' },
    search:       { id: 'Cari...',            en: 'Search...' },
    no_data:      { id: 'Tidak ada data.',    en: 'No data.' },
    error:        { id: 'Terjadi kesalahan.', en: 'An error occurred.' },
    copyright:    { id: 'Platform Kesehatan Digital Sekolah Indonesia', en: 'Digital Health Platform for Indonesian Schools' },
  },
} as const;

export type TranslationKey = keyof typeof translations;

/** Get a translated string — falls back to 'id' if key missing */
export function t(
  section: TranslationKey,
  key: string,
  lang: Lang,
  replacements?: Record<string, string>
): string {
  const sec = translations[section] as Record<string, Record<Lang, string>>;
  const entry = sec?.[key];
  if (!entry) return key;
  let result = entry[lang] ?? entry['id'];
  if (replacements) {
    Object.entries(replacements).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, v);
    });
  }
  return result;
}
