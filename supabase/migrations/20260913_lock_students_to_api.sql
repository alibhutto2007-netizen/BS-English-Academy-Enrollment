-- Apply only after SUPABASE_SERVICE_ROLE_KEY is configured on the API host.
-- The service-role key bypasses RLS inside the Express API; browsers do not.

alter table public.students enable row level security;

drop policy if exists "Public can submit enrollments" on public.students;
drop policy if exists "API can read enrollments" on public.students;
drop policy if exists "API can update enrollments" on public.students;
drop policy if exists "API can delete enrollments" on public.students;

-- No anonymous policies are recreated intentionally. All student access must
-- pass through the validated Express API using the server-only service-role key.
