-- ============================================================
-- 0017_add_admin_role.sql
-- Tambah role 'admin' (Kepala Sekolah) ke enum user_role.
-- HARUS jadi file migrasi tersendiri: ALTER TYPE ... ADD VALUE tidak
-- boleh dipakai dalam transaksi yang sama dengan perintah lain yang
-- langsung memakai nilai baru tsb (batasan Postgres). Migrasi 0018+
-- baru aman memakai 'admin' setelah file ini ter-commit lebih dulu.
-- ============================================================

alter type user_role add value if not exists 'admin';
