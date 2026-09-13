# Database operations

## Schema and migrations

`supabase/schema.sql` is the source of truth for the `students` table. Apply it through the Supabase SQL Editor only after reviewing the migration. Keep every future database change in a new, dated SQL migration under `supabase/migrations/`; do not edit production tables manually without recording the change.

## Paused projects

Supabase Free-plan projects may pause after low activity. A paused project preserves data and configuration, but enrollment requests fail until the owner resumes it. Use the Supabase Dashboard to resume it. For production availability, use a paid Supabase plan and configure backups. See the official [project pausing guide](https://supabase.com/docs/guides/platform/free-project-pausing).

## Production security migration

Before production, configure `SUPABASE_SERVICE_ROLE_KEY` only on the API host and set `NODE_ENV=production`. Then replace the anonymous read/update/delete policies with policies that deny direct browser access. The service-role key bypasses RLS only inside the API, never in the frontend.

Do not paste a service-role key into chat, GitHub, Vercel frontend variables, or any `VITE_` variable.
