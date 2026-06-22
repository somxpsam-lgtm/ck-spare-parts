---
name: CK Group data backends (Supabase)
description: CK Group's primary database AND file storage now live on Supabase. Hard-won connection recipe, why the URL is built in code, prod fail-closed, and the operational gotchas migration introduced.
---

# CK Group data lives on Supabase (DB + storage)

The primary database was migrated off Replit-managed Postgres onto Supabase. Both the relational DB and file/image storage are now on Supabase. Auth is still Clerk.

## Working Supabase Postgres connection recipe (hard-won)
Use the **Supavisor SESSION pooler**, not the direct host:
- host `aws-1-ap-south-1.pooler.supabase.com`, port `5432`, db `postgres`
- user `postgres.<projectRef>` where `<projectRef>` = the first label of the `SUPABASE_URL` host
- password = `SUPABASE_DB_PASSWORD` secret; SSL required (`{ rejectUnauthorized: false }`)

Failure modes seen while finding this (so don't retry them):
- direct `db.<ref>.supabase.co` → `ENOTFOUND` in this environment
- wrong region or `aws-0-*` → `XX000 Tenant or user not found`

**Why:** took multiple attempts; none of this is derivable from code. The pooler host/port live in `SUPABASE_DB_HOST` / `SUPABASE_DB_PORT` env vars with code defaults.

## The connection string is built in code, NOT from DATABASE_URL
`lib/db/src/connection.ts` constructs the Supabase URL from `SUPABASE_URL` + `SUPABASE_DB_PASSWORD`.
**Why:** `DATABASE_URL` is Replit-Helium-runtime-managed — do not try to override it via setEnvVars; build the Supabase URL from secrets instead.
**Prod fail-closed:** in `NODE_ENV=production` a missing Supabase env throws instead of falling back to `DATABASE_URL`, to avoid silently splitting writes back to the old Replit DB. In dev it still falls back to `DATABASE_URL`.

## Rollback safety
The old Replit Postgres was **left intact** (not deleted) as a rollback fallback. The `executeSql` sandbox tool targets that **Replit** DB, NOT Supabase — to inspect live app data you must connect to Supabase directly (pg + the recipe above).

## Operational gotchas migration introduced
- **Schema changes must be pushed manually to Supabase:** `pnpm --filter @workspace/db run push` (drizzle.config.ts targets Supabase). Replit's publish-time auto-migration no longer applies.
- **Replit checkpoint rollback no longer backs up the data** — it lives on Supabase now, outside the checkpoint system.

## Storage + legacy images
File storage is Supabase bucket `ck-uploads` (service-role key, `artifacts/api-server/src/routes/uploads.ts`); uploads return Supabase **public URLs**. Legacy images that used relative `/api/uploads/<file>` paths on local disk were copied into `ck-uploads` and their `parts.image_urls` rewritten to public URLs — so no part references local disk anymore. The `app.use("/api/uploads", express.static(...))` mount and the committed `artifacts/uploads/*` files are now **vestigial**.

## User-scoping (avoids false "data missing" alarms)
Every domain table (parts, categories, stock_movements, expense_records, activity_log, company_settings) is scoped by `user_id` = Clerk userId. A freshly-created test user sees **zero** rows — that is expected, not a migration bug. The real owner is a single Clerk user; verify by `user_id`, not by signing in as a new test user.
