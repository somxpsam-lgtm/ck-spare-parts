---
name: CK Group settings persistence
description: Why company settings must be DB-backed (not localStorage), and the unauthenticated uploads endpoint gap.
---

# Company settings must be DB-backed, never localStorage

Company profile settings (companyName, companyAddress, logoUrl, gstNumber, contactPhone, contactEmail) are persisted per-user in the DB (`company_settings`, userId PK) and read/written via the `/settings` API hooks.

**Why:** This app ships as a WebIntoApp APK wrapper of the published site. localStorage is per-device/per-browser, so a freshly installed APK (or a new device) starts with empty localStorage and the user loses their logo/GST/mobile. The logo *file* survives on the Supabase `ck-uploads` bucket — only the URL reference plus the text fields were being lost. Any future per-user preference that must survive a reinstall belongs in the DB, not localStorage.

**How to apply:** When adding new "settings"-like fields, extend the `company_settings` table + `/settings` contract; do not reach for localStorage. A one-time client migration lifts any legacy `ck_settings_<userId>` localStorage blob into the DB, filling only empty DB fields (guarded by a `ck_settings_migrated_<userId>` flag).

# Cosmetic per-device UI prefs live in localStorage, NOT the DB

Theme (dark/light) and dashboard low-stock-alert visibility are persisted in `localStorage` via `artifacts/ck-group/src/lib/prefs.ts` (getters/setters + a `ck-prefs-changed` window event; `onPrefsChanged` to subscribe). The theme is applied in `main.tsx` **before first paint** (defaults dark) to avoid a flash. Settings switches must be controlled (`checked` + `onCheckedChange`), never `defaultChecked` — an uncontrolled `defaultChecked` switch silently "resets every time" because nothing persists it.

**Why:** these are cosmetic, per-device choices. DB-backed theme would need auth+network and cause a flash-of-wrong-theme on load. The DB rule above is specifically for company/business data that must survive an APK reinstall or move across devices — theme/alert-visibility do not qualify.

**How to apply:** new cosmetic UI toggles → extend `prefs.ts` + localStorage. New company/business fields that must survive reinstall → extend `company_settings` + `/settings`. Note localStorage is per-install, so these prefs reset on APK reinstall (acceptable for cosmetics).

# Uploads endpoint is unauthenticated (security gap)

`/api/uploads` POST and DELETE have no auth check yet use Supabase service-role credentials, so any unauthenticated caller can upload to / delete from the shared bucket. The settings logo feature depends on this endpoint. Not fixed as part of the settings-persistence work — flag for a dedicated security pass (add `getAuth(req)` gating + ownership/path constraints).
