# Security runbook

## Required production variables

Configure these on the API host only:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
ADMIN_USER_IDS
CORS_ORIGINS
NODE_ENV=production
```

`ADMIN_USER_IDS` is a comma-separated list of Clerk user IDs allowed to use the admissions desk. Find the ID in Clerk Dashboard → Users. In production the API denies admin access until this value is configured.

`CORS_ORIGINS` is a comma-separated allowlist, for example `https://academy.example.com,https://www.academy.example.com`.

## Current protections

- Clerk protects administrator API routes.
- The API applies restrictive CORS, response security headers, 32 KB request limits, and a public enrollment rate limit.
- Secrets are excluded by `.gitignore`.
- Zod validates requests before data is written.

## Secret incident procedure

If a secret key is shown in chat, source control, screenshots, or logs: rotate it immediately in the provider dashboard, replace it in the secure host environment, restart the API, and review access logs.

## Release checklist

1. Rotate any previously exposed secret keys.
2. Set `ADMIN_USER_IDS`, `CORS_ORIGINS`, and `NODE_ENV=production`.
3. Use a Supabase service-role key only on the API host.
4. Lock Supabase RLS policies before publishing.
5. Test a signed-out user, an unauthorized signed-in user, and the approved administrator.
