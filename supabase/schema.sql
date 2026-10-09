create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  current_class text not null,
  last_academy text not null,
  school_college text not null,
  contact_number text not null,
  date_of_birth date not null,
  date_of_admission date not null,
  gender text not null check (gender in ('Female', 'Male', 'Other')),
  home_address text not null,
  course_subject text not null,
  batch text not null,
  time text not null,
  how_heard_about_us text not null default 'WhatsApp',
  created_at timestamptz not null default now()
);

alter table public.students drop constraint if exists students_batch_check;
alter table public.students drop constraint if exists students_time_check;

-- Phase 2 Tables: Courses, Batches, Timings, Admins
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, name)
);

create table if not exists public.timings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  day text not null,
  start_time text not null,
  end_time text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null unique,
  name text not null,
  email text not null,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;

drop policy if exists "Public can submit enrollments" on public.students;
drop policy if exists "API can read enrollments" on public.students;
drop policy if exists "API can update enrollments" on public.students;
drop policy if exists "API can delete enrollments" on public.students;

create policy "Public can submit enrollments"
  on public.students for insert
  to anon, authenticated
  with check (true);

create policy "API can read enrollments"
  on public.students for select
  to anon, authenticated
  using (true);

create policy "API can update enrollments"
  on public.students for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "API can delete enrollments"
  on public.students for delete
  to anon, authenticated
  using (true);

create index if not exists students_batch_time_idx on public.students (batch, time);
create index if not exists students_created_at_idx on public.students (created_at desc);