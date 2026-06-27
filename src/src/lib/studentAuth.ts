// src/lib/studentAuth.ts
// Server-only utilities — jangan diimpor dari komponen 'use client'.
// Berisi: generate kode kelas, generate kode akses siswa, dan password
// sintetis yang dipakai di Supabase Auth (siswa tidak pernah tahu password ini).

import { createHash, randomBytes } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // hapus karakter ambigu

/** Buat kode kelas 6 huruf, mis. "TK7B2R" */
export function generateClassCode(): string {
  return Array.from({ length: 6 }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');
}

/** Buat kode akses siswa 8 huruf, mis. "A3MK9PLR" */
export function generateAccessCode(): string {
  return Array.from({ length: 8 }, () =>
    ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  ).join('');
}

/** Buat PIN orang tua 6 digit angka, mis. "482913" — dipakai login orang tua. */
export function generateParentPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Ubah nama lengkap jadi slug email yang rapi: huruf kecil, spasi jadi
 * titik, tanpa karakter aneh. "Budi Santoso" -> "budi.santoso".
 * Fallback ke "siswa" jika nama kosong setelah dibersihkan (mis. nama
 * yang isinya cuma simbol/emoji).
 */
function slugifyName(fullName: string): string {
  const slug = fullName
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // hilangkan diakritik
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3) // maksimal 3 kata depan, supaya email tidak kepanjangan
    .join('.');
  return slug || 'siswa';
}

/**
 * Buat email "profesional" untuk akun Supabase Auth siswa, berbasis nama
 * asli + suffix acak dari access code (supaya tetap unik walau ada nama
 * kembar, dan tidak pernah collide). Format: nama.lengkap123@student.internal
 * Domain ini tidak pernah dikirim ke mana pun — hanya supaya kolom email
 * di auth.users terisi dengan sesuatu yang terlihat rapi & profesional,
 * BUKAN inbox yang benar-benar aktif.
 */
export function syntheticEmail(fullName: string, accessCode: string): string {
  const slug = slugifyName(fullName);
  const suffix = accessCode.toLowerCase().replace(/[^a-z0-9]/g, '').slice(-4);
  return `${slug}${suffix}@student.internal`;
}

/**
 * Turunkan password dari access code + salt rahasia server.
 * Jika STUDENT_SECRET tidak diset, pakai fallback (kurang aman di produksi).
 */
export function syntheticPassword(accessCode: string): string {
  const secret = process.env.STUDENT_SECRET ?? 'eyequiz-default-secret-change-me';
  return createHash('sha256')
    .update(`${secret}:${accessCode.toUpperCase()}`)
    .digest('hex')
    .slice(0, 32); // 32 char cukup kuat
}
