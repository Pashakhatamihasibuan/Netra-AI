-- Simpan data kalibrasi kamera per user (dua titik non-linear).
-- Format JSON: { points: [{pixelWidth, distanceCm}, ...], model: {a, b} }
alter table users
  add column if not exists calibration_data jsonb default null;

-- Hanya pemilik akun yang boleh baca & update kalibrasi miliknya sendiri.
-- RLS sudah aktif di tabel users dari migrasi sebelumnya.
create policy "user can update own calibration"
  on users for update
  using (id = auth.uid())
  with check (id = auth.uid());
