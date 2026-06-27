-- ============================================================
-- 0016_parent_pin.sql
-- PIN orang tua: setiap siswa punya PIN 6 digit unik yang dipakai
-- orang tua untuk login (nama anak + PIN sebagai "password"), tanpa
-- perlu daftar akun email/password terpisah.
-- ============================================================

alter table users add column if not exists parent_pin text unique;

-- Backfill siswa yang sudah ada sebelum migrasi ini (kalau ada) dengan
-- PIN 6-digit acak yang unik.
do $$
declare
  r record;
  candidate text;
  attempt int;
begin
  for r in select id from users where role = 'student' and parent_pin is null loop
    attempt := 0;
    loop
      candidate := lpad((floor(random() * 1000000))::text, 6, '0');
      exit when not exists (select 1 from users where parent_pin = candidate);
      attempt := attempt + 1;
      exit when attempt > 50; -- jaring pengaman, praktis tidak akan tercapai
    end loop;
    update users set parent_pin = candidate where id = r.id;
  end loop;
end $$;
