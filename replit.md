# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes **to Supabase** (also needed before publishing; Replit no longer auto-migrates)
- Required env: `SUPABASE_URL`, `SUPABASE_DB_PASSWORD` (primary DB), `SUPABASE_SERVICE_ROLE_KEY` (file storage). `SUPABASE_DB_HOST` / `SUPABASE_DB_PORT` are optional overrides (code defaults to the `ap-south-1` session pooler). `DATABASE_URL` (Replit Postgres) is now only a dev fallback.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL on **Supabase** (Supavisor session pooler) + Drizzle ORM; file/image storage on Supabase Storage (bucket `ck-uploads`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB connection resolver: `lib/db/src/connection.ts` (`getDatabaseUrl` / `isSupabaseConnection`) — builds the Supabase URL from secrets. Pool + SSL in `lib/db/src/index.ts`; schema-push target in `lib/db/drizzle.config.ts`.
- DB schema (source of truth): `lib/db/src/schema/` (`parts.ts`, `settings.ts`).
- File/image uploads → Supabase Storage: `artifacts/api-server/src/routes/uploads.ts`.
- API routes: `artifacts/api-server/src/routes/`. Web app: `artifacts/ck-group/src/` (pages in `src/pages/`, routes in `src/App.tsx`).

## Architecture decisions

- **Primary datastore is Supabase**, not Replit Postgres. The connection string is built **in code** from `SUPABASE_URL` + `SUPABASE_DB_PASSWORD` (not from `DATABASE_URL`, which is Replit-runtime-managed and can't be safely overridden). Use the Supavisor **session pooler** (`*.pooler.supabase.com:5432`, user `postgres.<projectRef>`), with SSL.
- **Production fails closed**: if Supabase env is missing in `NODE_ENV=production`, the app throws instead of silently falling back to the Replit DB (prevents split-brain writes). Dev still falls back to `DATABASE_URL`.
- The old Replit Postgres DB is **retained intact** as a rollback fallback (not deleted).
- All domain tables are **user-scoped by `user_id`** (Clerk userId); there are no FK constraints. A new user sees zero rows by design.
- Auth is **Clerk** (not Supabase Auth).

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Respond to the user in Hindi/Hinglish — the user is non-technical.
- Mobile app = a WebIntoApp APK wrapper of the **published** website. Never add Expo / React Native.
- Dark theme: background `#080e1f`, primary `#3b9af5`.

## Gotchas

- **Schema changes are NOT auto-migrated on publish.** After any schema change, run `pnpm --filter @workspace/db run push` so Supabase gets it before/after deploying.
- **Replit checkpoint rollback no longer backs up the data** — it lives on Supabase, outside the checkpoint system. Replit DB still holds the pre-migration snapshot as a manual fallback.
- The `executeSql` tool / Replit DB pane query the **old Replit Postgres**, not Supabase. To inspect live app data, connect to Supabase directly.
- `app.use("/api/uploads", express.static(...))` and the committed `artifacts/uploads/*` files are **vestigial** — all part images were migrated to Supabase Storage public URLs.
- Known pre-existing security gap (not introduced by the migration): `POST`/`DELETE /api/uploads` are unauthenticated while using the Supabase service-role key.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
