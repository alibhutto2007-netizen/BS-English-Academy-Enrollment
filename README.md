# BS English Academy Enrollment

Enrollment and admissions management for BS English Academy Larkana.

## Stack

| Area | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Express 5, TypeScript |
| Database | Supabase PostgreSQL |
| Authentication | Clerk |
| Deployment | Vercel (frontend) plus a Node.js API host |

## Repository map

```text
artifacts/bs-english-academy/  Frontend website
artifacts/api-server/          Express API
lib/api-spec/                  OpenAPI contract
lib/api-client-react/          Generated React API client
lib/api-zod/                   Request/response validation
lib/db/                        Database definitions
supabase/schema.sql            Database schema
docs/                          Operations and security runbooks
```

## Local development

Install once from the repository root:

```powershell
pnpm install
```

Run the API in one terminal:

```powershell
pnpm --filter @workspace/api-server run dev
```

Run the frontend in a second terminal:

```powershell
pnpm --filter @workspace/bs-english-academy run dev
```

Open `http://localhost:5173`.

## Checks

```powershell
pnpm --filter @workspace/bs-english-academy run typecheck
pnpm --filter @workspace/bs-english-academy run build
```

Never commit `.env`, `.env.local`, passwords, Clerk secret keys, or Supabase service-role keys. See [docs/SECURITY.md](docs/SECURITY.md) and [docs/DATABASE.md](docs/DATABASE.md).
