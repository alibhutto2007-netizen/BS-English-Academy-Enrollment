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
  batch text not null check (batch in ('Basic', 'Advance', 'Medium')),
  time text not null check (time in ('2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM', '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM')),
  created_at timestamptz not null default now()
);

alter table public.students enable row level security;

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