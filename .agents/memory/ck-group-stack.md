---
name: CK Group architecture decisions
description: Key non-obvious decisions for the CK Group spare parts inventory app
---

## userId-based data isolation (replaces Firebase)
All data tables (parts, categories, stock_movements, expense_records, activity_log) have a nullable `user_id text` column. All API routes extract `getAuth(req).userId` from `@clerk/express` and filter every query with `eq(table.userId, userId)`. Null-userId rows are invisible to all users. This achieves Firestore-rules-equivalent isolation without Firebase.

**Why:** User wanted per-user isolation. App already uses Clerk (Google login) + PostgreSQL. Adding Firebase would require a full rewrite. userId column with Drizzle eq() filter achieves the same result with zero added complexity.

## Company logo storage
Logo URL stored in `localStorage` keyed by `ck_settings_{userId}`. Upload goes to `/api/uploads`, URL saved to localStorage. AppLayout reads via `useCompanySettings(userId)` hook that listens to `ck-settings-updated` window event for real-time updates.

**Why:** Avoids a separate settings table/API while still having per-user isolation. Fine for single-device factory use.

## Dashboard refetchInterval pattern
Do NOT pass `{ query: { refetchInterval: 30000 } }` to Orval-generated hooks — `UseQueryOptions` requires `queryKey` which the type system enforces. Instead use:
```typescript
import { useQuery } from "@tanstack/react-query";
import { getGetDashboardSummaryQueryOptions } from "@workspace/api-client-react";
useQuery({ ...getGetDashboardSummaryQueryOptions(), refetchInterval: 30000 });
```

**Why:** Orval-generated hook signatures type `query` as full `UseQueryOptions` (with required `queryKey`). Spreading the query-options function result bypasses this.

## Express route return pattern (TypeScript noImplicitReturns)
Never use `return res.status(401).json(...)` — it returns a non-void value in a path, causing TS7030. Use:
```typescript
if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
```

**Why:** `noImplicitReturns: true` in tsconfig. When one path returns `Response` and others return `void`, TypeScript errors.

## Stock movement edit/delete with quantity reconciliation
PATCH /stock-movements/:id reverses the old movement's stock impact on the part, then applies the new values. DELETE reverses and removes. This keeps part quantities consistent.

## DB push after schema changes
Command: `pnpm --filter @workspace/db run push`
Clearing data: `psql "$DATABASE_URL" -c "TRUNCATE activity_log, stock_movements, expense_records, parts, categories RESTART IDENTITY CASCADE;"`
