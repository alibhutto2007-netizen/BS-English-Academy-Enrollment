# BS English Virtual Academy — Deployment Guide

This guide explains how to push the project to GitHub and deploy the academy application.

## 1. Project architecture

This repository contains two separately running applications:

```text
Frontend website  →  Vercel
Express API       →  Replit Deploy, Render, Railway, or another Node.js host
Database          →  Supabase
Authentication    →  Clerk
```

The current Express API is not a static Vercel frontend. Vercel can host the frontend directly, but the API must be deployed separately unless it is later converted to Vercel serverless functions.

## 2. Before deployment

From the project root, confirm that the checks pass:

```bash
pnpm install --frozen-lockfile
pnpm -w run build
```

The frontend build output is:

```text
artifacts/bs-english-academy/dist/public
```

## 3. Push the project to GitHub

Git is already initialized in this project.

### Create a GitHub repository

1. Open GitHub.
2. Select **New repository**.
3. Use a name such as `bs-english-academy`.
4. Keep the new repository empty:
   - Do not add a README.
   - Do not add a `.gitignore`.
   - Do not add a license.
5. Copy the repository HTTPS URL.

### Add GitHub as a separate remote

The project already has an internal backup remote. Keep it and add GitHub using a separate remote name:

```bash
git remote -v
git add .
git commit -m "Prepare BS English Academy for deployment"
git branch -M main
git remote add github https://github.com/YOUR_USERNAME/bs-english-academy.git
git push -u github main
```

Replace `YOUR_USERNAME` and the repository name with the correct values.

If the `github` remote already exists, use:

```bash
git remote set-url github https://github.com/YOUR_USERNAME/bs-english-academy.git
git push -u github main
```

For future changes:

```bash
git add .
git commit -m "Update academy application"
git push github main
```

Never commit passwords, API keys, Clerk secret keys, Supabase credentials, `.env` files, or access tokens. The repository ignores `.env` and `.vercel` files.

## 4. Deploy the frontend to Vercel

1. Open [Vercel](https://vercel.com).
2. Select **Add New Project**.
3. Import the GitHub repository.
4. Use the following project settings:

```text
Framework Preset: Vite
Root Directory: ./
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter @workspace/bs-english-academy run build
Output Directory: artifacts/bs-english-academy/dist/public
```

The repository already includes `vercel.json` with the install command, build command, output directory, and SPA rewrites.

The SPA rewrites ensure that refreshing these routes does not produce a Vercel 404:

```text
/admin
/sign-in
```

## 5. Vercel environment variables

In Vercel, open:

```text
Project Settings → Environment Variables
```

Add these variables for the frontend:

```text
VITE_CLERK_PUBLISHABLE_KEY
VITE_API_BASE_URL
```

Use the public Clerk publishable key for the environment being deployed.

After the API has been deployed, set `VITE_API_BASE_URL` to the API's public URL, without a trailing slash:

```text
https://your-api-domain.com
```

The frontend automatically uses relative `/api/...` requests when `VITE_API_BASE_URL` is empty. For this project, the variable is required when the API is hosted separately from Vercel.

Do not place these backend-only values in Vercel frontend variables:

```text
CLERK_SECRET_KEY
SESSION_SECRET
```

`VITE_` variables are included in the browser bundle. Treat only non-sensitive public configuration as `VITE_` variables.

## 6. Deploy the API server

The Express API is located at:

```text
artifacts/api-server
```

Deploy it as a Node.js service using Replit Deploy, Render, Railway, or another compatible host.

Build command:

```bash
pnpm --filter @workspace/api-server run build
```

Start command:

```bash
pnpm --filter @workspace/api-server run start
```

The host should provide its own `PORT` environment variable. The API listens on that port.

### Backend environment variables

Configure these variables only on the API server:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
SESSION_SECRET
```

Do not commit these values to GitHub or paste them into chat. Add them through the hosting provider's secure environment-variable settings.

### API health check

After deploying the API, verify:

```text
https://your-api-domain.com/api/healthz
```

The API root `/` may return `404`; that is expected because the application routes are under `/api`.

## 7. Run locally on Windows

The frontend and API are separate processes. Start both of them.

### Terminal 1 — API server

From the repository root:

```powershell
pnpm --filter @workspace/api-server run dev
```

The API uses port `8080` by default. Before starting it, configure the backend variables in the Windows environment:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
SESSION_SECRET
```

### Terminal 2 — frontend

From the repository root:

```powershell
pnpm --filter @workspace/bs-english-academy run dev
```

The frontend dev server now proxies `/api` to `http://localhost:8080` automatically. This prevents form requests from going to the Vite server instead of the Express API.

If the API is running on another local port, set `API_PROXY_TARGET` before starting the frontend:

```powershell
$env:API_PROXY_TARGET = "http://localhost:9000"
pnpm --filter @workspace/bs-english-academy run dev
```

Open the frontend URL shown by Vite, usually:

```text
http://localhost:5173
```

Open this URL to verify the API connection:

```text
http://localhost:5173/api/healthz
```

It should return:

```json
{"status":"ok"}
```

## 8. Configure Clerk for production

For the live application:

1. Use Clerk production keys instead of development keys.
2. Add the Vercel domain to Clerk's allowed origins.
3. Add the sign-in URL:

```text
https://your-project.vercel.app/sign-in
```

4. Confirm that the admin page is available at:

```text
https://your-project.vercel.app/admin
```

5. Confirm that only authorized admin users can access the dashboard.

The browser warning about Clerk development keys is expected during local development. It should not be present after switching the production frontend to live Clerk keys.

## 9. Apply the Supabase Free Batch constraint

The application supports these batch values:

```text
Basic
Advance
Medium
Free Batch
```

If the existing Supabase database still has the old constraint, run this once in the Supabase SQL Editor:

```sql
alter table public.students
  drop constraint if exists students_batch_check;

alter table public.students
  add constraint students_batch_check
  check (batch in ('Basic', 'Advance', 'Medium', 'Free Batch'));
```

Only run this against the correct database. Confirm that the table and constraint names match the current schema before applying it.

## 10. Recommended deployment order

Use this order to avoid frontend requests pointing to an unavailable API:

1. Push the project to GitHub.
2. Deploy the API server.
3. Add the API backend environment variables.
4. Verify `/api/healthz`.
5. Deploy the frontend to Vercel.
6. Add `VITE_CLERK_PUBLISHABLE_KEY`.
7. Add `VITE_API_BASE_URL` using the deployed API URL.
8. Configure Clerk production URLs and keys.
9. Apply the Supabase constraint if required.
10. Redeploy the frontend after changing Vercel environment variables.

## 11. Production testing checklist

### Public enrollment

- Open the Vercel homepage.
- Complete the enrollment form.
- Confirm that batch and class-time choices remain dependent.
- Test `Free Batch`.
- Confirm that invalid values cannot be submitted.
- Confirm that the enrollment confirmation can be downloaded.
- Check that the student record appears in Supabase.

### Admin dashboard

- Open `/admin` while signed out.
- Confirm that Clerk sign-in is required.
- Sign in with an authorized admin account.
- Confirm that totals match the visible student list.
- Test search and filters.
- Test editing a student.
- Test deleting only an intentional test record.
- Test CSV export.
- Test day/night mode.

### API and browser checks

- Open the API health endpoint.
- Inspect the browser Network tab for failed `/api/...` requests.
- Confirm that no secret values are present in browser requests.
- Check Vercel logs and API host logs for errors.
- Test the application on desktop and mobile widths.

## 12. Troubleshooting

### Vercel build fails because of `PORT` or `BASE_PATH`

The project now has safe defaults for both values. Confirm that Vercel is using:

```bash
pnpm --filter @workspace/bs-english-academy run build
```

and not trying to build the API as the frontend.

### The frontend loads but enrollment requests fail

Check:

1. `VITE_API_BASE_URL` is set in Vercel.
2. The API URL is correct and has no trailing slash.
3. The API server is running.
4. `/api/healthz` responds successfully.
5. The API has the correct Supabase and Clerk variables.
6. The frontend was redeployed after changing Vercel variables.

### `/admin` or `/sign-in` returns 404 after refresh

Confirm that the root `vercel.json` file was included in the GitHub commit and that Vercel redeployed the latest commit.

### Admin dashboard cannot load after sign-in

Check:

1. The frontend uses the correct Clerk publishable key.
2. The API uses the matching Clerk publishable and secret keys.
3. The browser request contains a Clerk bearer token.
4. The API deployment is reachable from the Vercel domain.
5. The Clerk production domain and redirect settings are configured.

### Free Batch enrollment fails

Apply the Supabase `students_batch_check` update from section 8, then retry with a new test enrollment.

### API logs show `GET /` with status `404`

This is not necessarily an error. The API does not serve the frontend at `/`. Use the API routes under `/api`, especially:

```text
/api/healthz
/api/students
/api/dashboard/summary
```

## 13. Future option: host everything on Vercel

The current recommended setup keeps the Express API as a separate service. If a single Vercel project is required later, the API can be converted to Vercel-compatible serverless functions. That would require a separate API migration and should be tested carefully because Clerk middleware, route prefixes, and Supabase access would change.
