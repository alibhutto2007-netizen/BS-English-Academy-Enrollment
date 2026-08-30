# BS English Academy

Enrollment and admissions management for BS English Virtual Academy Larkana.

## Run & Operate

- `pnpm --filter @workspace/bs-english-academy run dev` — run the public web app
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Apply `supabase/schema.sql` in the Supabase SQL editor before accepting live enrollments.
- Required secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, and `SESSION_SECRET`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: Supabase PostgreSQL via the Supabase JavaScript client
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/bs-english-academy/src/App.tsx` — public enrollment flow, Clerk screens, protected admin desk, analytics, filters, editing, deletion, and CSV export.
- `artifacts/bs-english-academy/src/index.css` — academy visual system, responsive layout, dark mode, and Clerk styling layer.
- `artifacts/api-server/src/routes/students.ts` — public create plus authenticated student CRUD.
- `artifacts/api-server/src/routes/dashboard.ts` — authenticated summary analytics.
- `artifacts/api-server/src/middlewares/require-admin.ts` — Clerk session protection for admin APIs.
- `supabase/schema.sql` — source of truth for the Supabase `students` table, constraints, indexes, and policies.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract and generated client hooks.

## Architecture decisions

- Public enrollment submission does not require an account; only the internal admissions desk is protected by Clerk.
- Supabase is used directly for persistence because the product needs a hosted student record store and the user selected Supabase.
- The API maps friendly camelCase API fields to snake_case Supabase columns so the frontend contract stays consistent.
- CSV is used for spreadsheet export because it opens directly in Excel without adding a heavy workbook dependency.
- The artifact is path-routed at `/`, with the admin desk at `/admin` and Clerk flows at `/sign-in` and `/sign-up`.

## Product

Students complete a three-step enrollment form with dependent batch/time choices and can download a confirmation slip after submission. Authorized academy staff can view, search, filter, edit, delete, and export student records, with summary cards and batch/time analytics. The interface supports day and night modes and uses the academy crest and navy/gold brand language.

## User preferences

- Keep the academy experience polished, clear, and suitable for publishing.

## Gotchas

- The API workflow validates Supabase configuration at startup; an invalid `SUPABASE_URL` prevents the server from starting.
- Clerk development keys show a normal browser console warning and should be replaced with production keys before publishing.
- The SQL setup file must be applied to the Supabase project; the code cannot create the table through the anon client.
- Run the managed workflows, rather than a bare Vite build command, when validating the artifact because the workflow supplies `PORT` and `BASE_PATH`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
