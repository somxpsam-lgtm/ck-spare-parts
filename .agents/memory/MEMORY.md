# Memory Index

- [CK Group units & reports](ck-group-units-reports.md) — per-part unit display rules; never unit-label mixed-unit aggregate totals; reports PDF export is an XSS sink; CSV exports must guard formula injection.
- [CK Group settings persistence](ck-group-settings-persistence.md) — company settings must be DB-backed (not localStorage) for APK survival; /api/uploads is unauthenticated (security gap).
- [CK Group data backends](ck-group-data-backends.md) — DB is Replit Postgres (not Supabase) despite SUPABASE_* secrets; Supabase = image storage only; legacy /api/uploads images are on ephemeral disk.
