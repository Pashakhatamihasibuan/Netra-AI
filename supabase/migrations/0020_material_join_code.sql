-- 0020_material_join_code.sql
-- Tambah kolom join_code ke materials: kode unik 6 karakter uppercase yang
-- dibagikan guru ke siswa. Siswa memasukkan kode ini SEKALI dan permanen
-- terdaftar ke materi. Semua perubahan materi oleh guru otomatis terlihat.
-- Tambah kolom extended_profile ke users untuk guru: NIP, tempat/tanggal
-- lahir, alamat, nomor telepon.

-- 1. Kolom join_code di materials
alter table materials
  add column if not exists join_code text unique;

-- Generate join_code untuk materi yang sudah ada
update materials
set join_code = upper(substring(md5(id::text || random()::text) from 1 for 6))
where join_code is null;

-- Index untuk lookup cepat
create index if not exists idx_materials_join_code on materials(join_code);

-- 2. Trigger: auto-generate join_code saat materi baru dibuat
create or replace function materials_set_join_code()
returns trigger language plpgsql as $$
declare
  candidate text;
  attempts  int := 0;
begin
  if new.join_code is not null then
    return new;
  end if;
  loop
    candidate := upper(substring(md5(gen_random_uuid()::text) from 1 for 6));
    if not exists (select 1 from materials where join_code = candidate) then
      new.join_code := candidate;
      return new;
    end if;
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Tidak bisa generate join_code unik.';
    end if;
  end loop;
end;
$$;

drop trigger if exists trg_materials_join_code on materials;
create trigger trg_materials_join_code
  before insert on materials
  for each row execute function materials_set_join_code();

-- 3. Tabel material_joins: siswa join materi via kode (sekali, permanen)
create table if not exists material_joins (
  id          uuid primary key default uuid_generate_v4(),
  material_id uuid not null references materials(id) on delete cascade,
  student_id  uuid not null references users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  unique (material_id, student_id)
);

create index if not exists idx_material_joins_material on material_joins(material_id);
create index if not exists idx_material_joins_student  on material_joins(student_id);

alter table material_joins enable row level security;

-- Siswa bisa insert join sendiri (saat submit kode) + baca miliknya sendiri
drop policy if exists "student joins material" on material_joins;
create policy "student joins material"
  on material_joins for insert
  with check (student_id = auth.uid() and app_role() = 'student');

drop policy if exists "student reads own joins" on material_joins;
create policy "student reads own joins"
  on material_joins for select
  using (student_id = auth.uid());

-- Guru baca semua join materi miliknya
drop policy if exists "teacher reads joins for own materials" on material_joins;
create policy "teacher reads joins for own materials"
  on material_joins for select
  using (
    exists (select 1 from materials m where m.id = material_id and m.teacher_id = auth.uid())
  );

-- 4. Kolom profil guru di tabel users
alter table users
  add column if not exists nip          text,
  add column if not exists birth_place  text,
  add column if not exists birth_date   date,
  add column if not exists address      text,
  add column if not exists phone        text;
