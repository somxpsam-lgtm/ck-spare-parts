---
name: CK Group data backends (DB vs Supabase)
description: Where CK Group data actually lives — DB is Replit Postgres, not Supabase; Supabase is storage-only; legacy images are on ephemeral disk.
---

# CK Group is NOT "fully on Supabase" — backends are split

Despite `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_DB_PASSWORD` all being present as secrets, the app's data is split across two backends:

- **Primary database** (parts, categories, stock_movements, expense_records, activity_log, company_settings) → **Replit-managed PostgreSQL** via `DATABASE_URL` (`lib/db/src/index.ts`, plain `pg` Pool + Drizzle). The connection string does **not** point to Supabase. `SUPABASE_DB_PASSWORD` / `SUPABASE_ANON_KEY` exist but are **unused** by app code.
- **File/image storage** (part photos + company logo) → **Supabase Storage**, bucket `ck-uploads`, via service-role key (`artifacts/api-server/src/routes/uploads.ts`). New uploads go to Supabase and return a Supabase **public URL**.
- **Auth** → Clerk (not Supabase Auth).

**Legacy-image gotcha:** `app.ts` also mounts `app.use("/api/uploads", express.static(UPLOADS_DIR))`. Older logos/images were stored with relative `/api/uploads/<file>` URLs served from **local disk**, which is **ephemeral on deploy** — those specific old files can vanish on republish. The current POST handler uses `multer.memoryStorage()` and never writes to `UPLOADS_DIR`, so the static mount is vestigial for new uploads.

**Why this matters:** if asked "is it fully on Supabase?", the honest answer is no — only storage is. Moving the DB to Supabase would require switching `DATABASE_URL` to the Supabase Postgres connection string (the `SUPABASE_DB_PASSWORD` is already available) and migrating data; it is not wired today.
