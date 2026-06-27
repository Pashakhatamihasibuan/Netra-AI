// src/lib/parentAuth.ts
// Server-only utilities — jangan diimpor dari komponen 'use client'.
// Setiap siswa punya tepat satu identitas akun "orang tua" sintetis,
// diturunkan deterministik dari student.id + PIN-nya, mirip pola
// studentAuth.ts. Orang tua tidak pernah tahu/butuh email-password ini —
// mereka cukup masukkan nama anak + PIN di halaman login.

import { createHash } from 'crypto';

/** Email sintetis akun orang tua — satu per siswa, tidak pernah dikirim ke mana pun. */
export function parentSyntheticEmail(studentId: string): string {
  return `parent_${studentId}@eyequiz.internal`;
}

/** Turunkan password dari studentId + PIN + salt rahasia server. */
export function parentSyntheticPassword(studentId: string, pin: string): string {
  const secret = process.env.STUDENT_SECRET ?? 'eyequiz-default-secret-change-me';
  return createHash('sha256')
    .update(`${secret}:parent:${studentId}:${pin}`)
    .digest('hex')
    .slice(0, 32);
}
