export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';

export type TeacherType = 'homeroom' | 'subject';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  parent_id: string | null;
  /** Hanya terisi untuk siswa — UUID kelas mereka (LEGACY, tidak dipakai lagi) */
  class_id: string | null;
  /** Hanya terisi untuk siswa — UUID kelas resmi mereka (mis. "4 SD A") */
  class_section_id: string | null;
  /** Hanya terisi untuk siswa — kode akses 8 karakter untuk login */
  access_code: string | null;
  /** Hanya terisi untuk siswa — PIN 6 digit untuk login orang tua */
  parent_pin: string | null;
  /** Hanya terisi untuk siswa — tingkat kelas '3'|'4'|'5'|'6' */
  grade_level: string | null;
  /** Hanya terisi untuk guru — wali kelas atau guru mata pelajaran */
  teacher_type: TeacherType | null;
  /** Hanya terisi untuk guru mata pelajaran — mapel yang diampu */
  subject: string | null;
  /** Hanya terisi untuk guru mata pelajaran — kelas-kelas yang diajar */
  teacher_grade_levels: string[] | null;
  /** Data diri guru */
  nip?: string | null;
  birth_place?: string | null;
  birth_date?: string | null;
  address?: string | null;
  phone?: string | null;
}

export interface ClassSection {
  id: string;
  class_level: string;
  section: string;
  academic_year: string;
  homeroom_teacher_id: string | null;
  homeroom_teacher_name: string | null;
  student_count?: number;
}

export interface ClassRow {
  id: string;
  teacher_id: string;
  name: string;
  class_code: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  class_level: string | null;
  target_section_id: string | null;
  created_at: string;
}

// What students receive — note: no correct_answer field, matching the
// questions_for_student view.
export interface StudentQuestion {
  id: string;
  quiz_id: string;
  question: string;
  image_url?: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  order_index: number;
}

// What teachers receive when building/editing — full row, answer key included.
export interface TeacherQuestion extends StudentQuestion {
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

// Alias untuk backward-compat — QuizForm dan komponen lain mengimpor 'Question'
export type Question = TeacherQuestion;

export interface QuizResult {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  created_at: string;
}

export type PostureStatus = 'good' | 'warning' | 'poor';
export type LightingStatus = 'bright' | 'normal' | 'dark';
export type MonsterState = 'safe' | 'warning' | 'alert';

export interface HealthRecordInput {
  user_id: string;
  eye_distance_cm: number | null;
  eye_distance_score: number;
  posture_score: number;
  blink_rate: number;
  blink_score: number;
  lighting_score: number;
  screen_time_minutes: number;
  screen_time_score: number;
  health_score: number;
  session_started_at: string;
}

export type Recommendation =
  | 'continue_learning'
  | 'take_a_break'
  | 'improve_posture'
  | 'increase_lighting';

// Extended AppUser untuk siswa (grade_level)
export interface StudentUser extends AppUser {
  grade_level: string | null;
}

// Quiz dengan kode akses
export interface QuizWithCode extends Quiz {
  quiz_code?: string | null;
}

// ───────────────────────── Materi belajar ─────────────────────────

export type MediaType = 'image' | 'video' | 'document' | 'presentation';

export interface MaterialMedia {
  id: string;
  material_id: string;
  media_type: MediaType;
  url: string;
  order_index: number;
  title?: string | null;
}

export interface MaterialRow {
  id: string;
  teacher_id: string;
  class_id: string | null;
  subject: string | null;
  class_level: string | null;
  target_section_id: string | null;
  title: string;
  description: string | null;
  content: string | null;
  default_duration_minutes: number;
  join_code: string | null;
  created_at: string;
  updated_at: string;
}

export type MaterialAccessStatus = 'active' | 'locked' | 'requested';

export interface MaterialAccess {
  id: string;
  material_id: string;
  student_id: string;
  status: MaterialAccessStatus;
  duration_minutes: number;
  granted_at: string | null;
  expires_at: string | null;
  requested_at: string | null;
}

// Yang diterima guru: materi + media + ringkasan status akses siswa
export interface MaterialWithStats extends MaterialRow {
  media: MaterialMedia[];
  class_name?: string | null;
  pending_requests: number;
  active_count: number;
}

// Yang diterima siswa: materi + media + status akses miliknya sendiri
export interface MaterialForStudent extends MaterialRow {
  media: MaterialMedia[];
  access: MaterialAccess;
  joined_via_code?: boolean;
}

// Untuk panel "Permintaan Akses" guru
export interface MaterialAccessRequest {
  access_id: string;
  material_id: string;
  material_title: string;
  student_id: string;
  student_name: string;
  requested_at: string;
}

// ───────────────────────── Anti-curang kuis ─────────────────────────

export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'forfeited';

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  status: QuizAttemptStatus;
  started_at: string;
  ended_at: string | null;
}
