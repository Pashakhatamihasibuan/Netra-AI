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
                      en: "Materials and quizzes automatically adapt to each student's learning pace." },
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
    parent_pin:    { id: 'PIN Orang Tua',    en: 'Parent PIN' },
    parent_pin_hint: { id: 'PIN 6 digit yang diberikan anak ke kamu.', en: '6-digit PIN given to you by your child.' },
    login_as_parent: { id: 'Masuk sebagai Orang Tua', en: 'Sign In as Parent' },
    // Admin
    admin_code:    { id: 'Kode Admin',       en: 'Admin Code' },
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

  // ── DASHBOARDS (shared + per-role) ─────────────────────────────────────
  dashboard: {
    loading:      { id: 'Memuat profil…',    en: 'Loading profile…' },
    loading_data: { id: 'Memuat data…',      en: 'Loading data…' },
    error_load:   { id: 'Tidak dapat memuat profil.', en: 'Could not load profile.' },
    login_again:  { id: 'Masuk ulang',       en: 'Sign in again' },
    ready_today:  { id: 'Siap belajar hari ini?', en: 'Ready to learn today?' },
    hello:        { id: 'Halo 👋',            en: 'Hello 👋' },
    logout:       { id: 'Keluar',             en: 'Sign Out' },

    // ── Student dashboard ─────────────────────────────────────────────────
    join_quiz:     { id: '🎯 Ikut Kuis',      en: '🎯 Join Quiz' },
    join_desc:     { id: 'Masukkan kode 6 huruf dari gurumu.', en: 'Enter the 6-letter code from your teacher.' },
    join_placeholder: { id: 'XXXXXX',         en: 'XXXXXX' },
    join_btn:      { id: 'Masuk Kuis',        en: 'Join Quiz' },
    join_btn_loading: { id: '…',              en: '…' },
    invalid_code:  { id: 'Kode tidak valid.', en: 'Invalid code.' },
    error_generic: { id: 'Terjadi kesalahan.', en: 'An error occurred.' },
    materials_from_teacher: { id: '📚 Materi dari Guru', en: '📚 Materials from Teacher' },
    materials_desc: { id: 'Lihat materi yang dibagikan gurumu.', en: 'View materials shared by your teacher.' },
    open_arrow:    { id: 'Buka →',            en: 'Open →' },
    health_score_label: { id: 'Health score kamu', en: 'Your health score' },

    // ── Teacher dashboard ─────────────────────────────────────────────────
    teacher_room:  { id: 'Ruang Guru',        en: "Teacher's Room" },
    teacher_subtitle: { id: 'Kelola kuis, materi, dan pantau hasil belajar siswa.', en: 'Manage quizzes, materials, and monitor student results.' },
    tab_quiz:      { id: 'Kuis & Kode',       en: 'Quiz & Code' },
    tab_results:   { id: 'Hasil Kuis',        en: 'Quiz Results' },
    tab_materials: { id: 'Materi',            en: 'Materials' },
    tab_profile:   { id: 'Profil Mengajar',   en: 'Teaching Profile' },
    tab_requests:  { id: '🔔 Permintaan',     en: '🔔 Requests' },
    // Teacher quiz tab
    my_quizzes:    { id: '📝 Kuis Saya',      en: '📝 My Quizzes' },
    new_quiz_btn:  { id: '+ Kuis Baru',       en: '+ New Quiz' },
    no_quizzes:    { id: 'Belum ada kuis. Buat yang pertama!', en: 'No quizzes yet. Create the first one!' },
    create_first:  { id: 'Buat kuis pertama', en: 'Create first quiz' },
    quiz_code_label: { id: 'Kode Kuis',       en: 'Quiz Code' },
    copy_code:     { id: 'Salin',             en: 'Copy' },
    copied:        { id: '✓ Tersalin',        en: '✓ Copied' },
    share_students: { id: 'Bagikan ke siswa', en: 'Share to students' },
    gen_code:      { id: '🔑 Buat Kode',      en: '🔑 Generate Code' },
    edit_quiz:     { id: '✎ Edit',            en: '✎ Edit' },
    delete_quiz:   { id: '🗑 Hapus',           en: '🗑 Delete' },
    delete_confirm: { id: 'Apakah Anda yakin ingin menghapus kuis ini beserta semua pertanyaannya?',
                      en: 'Are you sure you want to delete this quiz and all its questions?' },
    // Teacher results tab
    pick_quiz:     { id: 'Pilih Kuis',        en: 'Select Quiz' },
    pick_quiz_placeholder: { id: '— Pilih kuis —', en: '— Select a quiz —' },
    pick_quiz_hint: { id: 'Pilih kuis di atas untuk melihat hasil siswa.', en: 'Select a quiz above to view student results.' },
    results_title: { id: 'Hasil — {title}',   en: 'Results — {title}' },
    submissions:   { id: '{n} pengerjaan',     en: '{n} submissions' },
    download_csv:  { id: 'Download CSV',       en: 'Download CSV' },
    no_submissions: { id: 'Belum ada siswa yang mengerjakan kuis ini.', en: 'No students have taken this quiz yet.' },
    col_average:   { id: 'Rata-rata',          en: 'Average' },
    col_highest:   { id: 'Tertinggi',          en: 'Highest' },
    col_lowest:    { id: 'Terendah',           en: 'Lowest' },
    col_num:       { id: '#',                  en: '#' },
    col_student:   { id: 'Nama Siswa',         en: 'Student Name' },
    col_score:     { id: 'Nilai',              en: 'Score' },
    col_monitoring: { id: 'Monitoring CV',     en: 'CV Monitoring' },
    col_time:      { id: 'Waktu',              en: 'Time' },

    // ── Student grade & homeroom ───────────────────────────────────────────
    grade_3:          { id: 'Kelas 3 SD',       en: 'Grade 3' },
    grade_4:          { id: 'Kelas 4 SD',       en: 'Grade 4' },
    grade_5:          { id: 'Kelas 5 SD',       en: 'Grade 5' },
    grade_6:          { id: 'Kelas 6 SD',       en: 'Grade 6' },
    homeroom_label:   { id: 'Wali',             en: 'Homeroom' },
    homeroom_unassigned: { id: 'belum ditugaskan', en: 'unassigned' },

    // ── Admin dashboard ────────────────────────────────────────────────────
    admin_title:   { id: 'Kepala Sekolah',    en: 'Principal' },
    admin_subtitle: { id: 'Kelola struktur kelas, wali kelas, dan daftar guru.', en: 'Manage class structure, homeroom teachers, and teacher directory.' },
    tab_classes:   { id: 'Wali Kelas',        en: 'Homeroom Classes' },
    tab_classes_desc: { id: 'Kelola section & penugasan wali kelas', en: 'Manage sections & homeroom assignments' },
    tab_teachers:  { id: 'Direktori Guru',    en: 'Teacher Directory' },
    tab_teachers_desc: { id: 'Lihat semua guru yang terdaftar', en: 'View all registered teachers' },

    // ── Parent dashboard ──────────────────────────────────────────────────
    parent_title:  { id: 'Dashboard Orang Tua', en: 'Parent Dashboard' },
    monitoring:    { id: 'Memantau',           en: 'Monitoring' },
    open_menu:     { id: 'Buka menu',          en: 'Open menu' },
    select_child:  { id: 'Pilih Anak',         en: 'Select Child' },
    menu:          { id: 'Menu',               en: 'Menu' },
    add_child:     { id: '+ Tambah anak lain', en: '+ Add another child' },
    close_form:    { id: '✕ Tutup',            en: '✕ Close' },
    // Parent sections
    section_summary:    { id: 'Ringkasan',         en: 'Summary' },
    section_monitoring: { id: 'Monitor CV Live',   en: 'Live CV Monitor' },
    section_scores:     { id: 'Nilai Kuis',        en: 'Quiz Scores' },
    section_screentime: { id: 'Waktu Layar',       en: 'Screen Time' },
    section_materials:  { id: 'Materi',            en: 'Materials' },
    section_class:      { id: 'Kelas',             en: 'Class' },
    health_latest:      { id: 'Health score terbaru', en: 'Latest health score' },
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

  // ── MATERIALS ───────────────────────────────────────────────────────────
  materials: {
    // Page & section headings
    page_title:       { id: 'Materi Pelajaran',            en: 'Learning Materials' },
    my_materials:     { id: 'Materi Saya',                 en: 'My Materials' },
    all_materials:    { id: 'Semua Materi',                en: 'All Materials' },
    from_teacher:     { id: 'Materi dari Guru',            en: 'Materials from Teacher' },
    new_material:     { id: 'Buat Materi Baru',            en: 'Create New Material' },
    edit_material:    { id: 'Edit Materi',                 en: 'Edit Material' },

    // Material requests (MaterialRequests component)
    requests_title:   { id: 'Permintaan Akses Materi',     en: 'Material Access Requests' },
    requests_desc:    { id: 'Siswa yang meminta akses ke materi tertentu.', en: 'Students requesting access to specific materials.' },
    no_requests:      { id: 'Tidak ada permintaan saat ini.', en: 'No pending requests.' },
    approve:          { id: 'Setujui',                     en: 'Approve' },
    reject:           { id: 'Tolak',                       en: 'Reject' },
    approving:        { id: 'Menyetujui…',                 en: 'Approving…' },
    rejecting:        { id: 'Menolak…',                    en: 'Rejecting…' },
    request_from:     { id: 'Permintaan dari',             en: 'Request from' },
    requested_at:     { id: 'Diminta pada',                en: 'Requested on' },
    status_pending:   { id: 'Menunggu',                    en: 'Pending' },
    status_approved:  { id: 'Disetujui',                   en: 'Approved' },
    status_rejected:  { id: 'Ditolak',                     en: 'Rejected' },

    // Material manager (MaterialManager component)
    manager_title:    { id: 'Kelola Materi',               en: 'Manage Materials' },
    manager_desc:     { id: 'Buat, edit, dan bagikan materi ke siswa.', en: 'Create, edit, and share materials with students.' },
    add_material:     { id: '+ Tambah Materi',             en: '+ Add Material' },
    no_materials:     { id: 'Belum ada materi. Buat yang pertama!', en: 'No materials yet. Create the first one!' },
    create_first:     { id: 'Buat materi pertama',         en: 'Create first material' },

    // Material form fields
    title_label:      { id: 'Judul Materi',                en: 'Material Title' },
    title_ph:         { id: 'Misal: Pengenalan Pecahan',   en: 'E.g.: Introduction to Fractions' },
    desc_label:       { id: 'Deskripsi',                   en: 'Description' },
    desc_ph:          { id: 'Jelaskan isi materi ini…',    en: 'Describe the content of this material…' },
    content_label:    { id: 'Isi Materi',                  en: 'Material Content' },
    content_ph:       { id: 'Tulis isi materi di sini…',   en: 'Write the material content here…' },
    subject_label:    { id: 'Mata Pelajaran',              en: 'Subject' },
    grade_label:      { id: 'Kelas Tujuan',                en: 'Target Grade' },
    file_label:       { id: 'File Lampiran (Opsional)',     en: 'Attachment (Optional)' },
    visibility_label: { id: 'Visibilitas',                 en: 'Visibility' },
    visibility_all:   { id: 'Semua Siswa',                 en: 'All Students' },
    visibility_req:   { id: 'Hanya dengan Permintaan',     en: 'Request Only' },
    save_material:    { id: 'Simpan Materi',               en: 'Save Material' },
    saving:           { id: 'Menyimpan…',                  en: 'Saving…' },
    cancel:           { id: 'Batal',                       en: 'Cancel' },

    // Material card actions
    edit:             { id: '✎ Edit',                      en: '✎ Edit' },
    delete:           { id: '🗑 Hapus',                     en: '🗑 Delete' },
    delete_confirm:   { id: 'Apakah Anda yakin ingin menghapus materi ini?', en: 'Are you sure you want to delete this material?' },
    view:             { id: 'Lihat',                       en: 'View' },
    download:         { id: 'Unduh',                       en: 'Download' },
    share:            { id: 'Bagikan',                     en: 'Share' },
    request_access:   { id: 'Minta Akses',                 en: 'Request Access' },
    requesting:       { id: 'Meminta…',                    en: 'Requesting…' },
    access_requested: { id: '✓ Akses Diminta',             en: '✓ Access Requested' },
    access_granted:   { id: '✓ Akses Diberikan',           en: '✓ Access Granted' },

    // Student material list (StudentQuizList / student/materials page)
    student_title:    { id: '📚 Materi dari Guru',         en: '📚 Materials from Teacher' },
    student_empty:    { id: 'Belum ada materi untukmu.', en: 'No materials available for you yet.' },
    open_material:    { id: 'Buka Materi →',              en: 'Open Material →' },
    restricted:       { id: 'Butuh Permintaan',           en: 'Requires Request' },
    grade_badge:      { id: 'Kelas {grade} SD',           en: 'Grade {grade}' },

    // Parent material list
    parent_title:     { id: 'Materi Anak',                en: "Child's Materials" },
    parent_empty:     { id: 'Belum ada materi tersedia untuk anak ini.', en: 'No materials available for this child yet.' },

    // Toast / feedback
    saved_ok:         { id: 'Materi berhasil disimpan.',  en: 'Material saved successfully.' },
    deleted_ok:       { id: 'Materi berhasil dihapus.',   en: 'Material deleted successfully.' },
    request_ok:       { id: 'Permintaan akses berhasil dikirim.', en: 'Access request sent successfully.' },
    approve_ok:       { id: 'Permintaan berhasil disetujui.', en: 'Request approved successfully.' },
    reject_ok:        { id: 'Permintaan berhasil ditolak.', en: 'Request rejected successfully.' },
    error_save:       { id: 'Gagal menyimpan materi.',    en: 'Failed to save material.' },
    error_delete:     { id: 'Gagal menghapus materi.',    en: 'Failed to delete material.' },
    error_request:    { id: 'Gagal mengirim permintaan.', en: 'Failed to send request.' },
    error_approve:    { id: 'Gagal menyetujui permintaan.', en: 'Failed to approve request.' },
    error_reject:     { id: 'Gagal menolak permintaan.',  en: 'Failed to reject request.' },
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
