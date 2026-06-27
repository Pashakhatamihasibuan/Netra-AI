-- ============================================================
-- 0015_materials.sql
-- Fitur Materi Belajar: guru membuat materi (teks + gambar/video),
-- siswa melihat materi dari gurunya dengan jendela akses waktu
-- terbatas (default 2 jam). Setelah waktu habis, materi terkunci
-- dan siswa harus meminta izin lagi ke guru; guru menyetujui dan
-- menentukan durasi baru.
-- ============================================================

-- 1. Tabel materi
create table if not exists materials (
  id                       uuid primary key default uuid_generate_v4(),
  teacher_id               uuid not null references users(id) on delete cascade,
  -- null = berlaku untuk semua kelas guru ini; diisi = khusus kelas tsb.
  class_id                 uuid references classes(id) on delete cascade,
  title                    text not null,
  description              text,
  content                  text,
  default_duration_minutes int not null default 120 check (default_duration_minutes > 0),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists idx_materials_teacher on materials(teacher_id);
create index if not exists idx_materials_class   on materials(class_id);

-- 2. Lampiran gambar/video per materi (banyak per materi)
create table if not exists material_media (
  id          uuid primary key default uuid_generate_v4(),
  material_id uuid not null references materials(id) on delete cascade,
  media_type  text not null check (media_type in ('image', 'video')),
  url         text not null,
  order_index int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_material_media_material on material_media(material_id);

-- 3. Status akses per siswa per materi
--    locked    -> tidak/tidak lagi bisa dibuka, menunggu persetujuan guru
--    active    -> sedang bisa dibuka, sampai expires_at
--    requested -> siswa sudah minta izin, menunggu guru menyetujui
create table if not exists material_access (
  id               uuid primary key default uuid_generate_v4(),
  material_id      uuid not null references materials(id) on delete cascade,
  student_id       uuid not null references users(id) on delete cascade,
  status           text not null default 'locked' check (status in ('active', 'locked', 'requested')),
  duration_minutes int not null default 120,
  granted_at       timestamptz,
  expires_at       timestamptz,
  requested_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (material_id, student_id)
);

create index if not exists idx_material_access_student  on material_access(student_id);
create index if not exists idx_material_access_material on material_access(material_id);

-- 4. Helper: cari teacher_id dari kelas siswa yang sedang login
create or replace function app_student_teacher_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select c.teacher_id
  from public.users u
  join public.classes c on c.id = u.class_id
  where u.id = auth.uid();
$$;

-- 5. RLS
alter table materials       enable row level security;
alter table material_media  enable row level security;
alter table material_access enable row level security;

-- ----- materials -----
drop policy if exists "teacher manages own materials" on materials;
create policy "teacher manages own materials"
  on materials for all
  using  (app_role() = 'teacher' and teacher_id = auth.uid())
  with check (app_role() = 'teacher' and teacher_id = auth.uid());

drop policy if exists "student reads materials of own teacher" on materials;
create policy "student reads materials of own teacher"
  on materials for select
  using (
    app_role() = 'student'
    and teacher_id = app_student_teacher_id()
    and (class_id is null or class_id = (select class_id from public.users where id = auth.uid()))
  );

-- ----- material_media -----
drop policy if exists "teacher manages own material media" on material_media;
create policy "teacher manages own material media"
  on material_media for all
  using (exists (select 1 from materials m where m.id = material_id and m.teacher_id = auth.uid()))
  with check (exists (select 1 from materials m where m.id = material_id and m.teacher_id = auth.uid()));

drop policy if exists "student reads media of visible materials" on material_media;
create policy "student reads media of visible materials"
  on material_media for select
  using (
    exists (
      select 1 from materials m
      where m.id = material_id
        and m.teacher_id = app_student_teacher_id()
        and (m.class_id is null or m.class_id = (select class_id from public.users where id = auth.uid()))
    )
  );

-- ----- material_access -----
-- Tidak ada policy insert/update untuk client: semua perubahan status
-- (auto-grant, lazy-expire, request, approve) lewat API route dengan
-- service-role key, supaya siswa tidak bisa membuka kuncinya sendiri.
drop policy if exists "student reads own material access" on material_access;
create policy "student reads own material access"
  on material_access for select
  using (student_id = auth.uid());

drop policy if exists "teacher reads access for own materials" on material_access;
create policy "teacher reads access for own materials"
  on material_access for select
  using (exists (select 1 from materials m where m.id = material_id and m.teacher_id = auth.uid()));

-- 6. Storage bucket untuk gambar/video materi
insert into storage.buckets (id, name, public)
values ('materials_media', 'materials_media', true)
on conflict (id) do nothing;

drop policy if exists "public reads materials media" on storage.objects;
create policy "public reads materials media"
  on storage.objects for select
  using (bucket_id = 'materials_media');

drop policy if exists "teacher uploads materials media" on storage.objects;
create policy "teacher uploads materials media"
  on storage.objects for insert
  with check (bucket_id = 'materials_media' and app_role() = 'teacher');

drop policy if exists "teacher deletes materials media" on storage.objects;
create policy "teacher deletes materials media"
  on storage.objects for delete
  using (bucket_id = 'materials_media' and app_role() = 'teacher');

-- 7. Realtime — supaya siswa langsung lihat saat guru menyetujui akses,
--    dan guru langsung lihat saat ada permintaan baru, tanpa reload manual.
do $$
begin
  alter publication supabase_realtime add table material_access;
exception
  when duplicate_object then null; -- sudah ditambahkan sebelumnya, aman diabaikan
end $$;
