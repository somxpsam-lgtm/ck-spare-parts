---
name: Clerk @clerk/react@5.54.0 + @clerk/shared@3.47.7 compatibility shim
description: How to make @clerk/react@5.54.0 work with @clerk/shared@3.47.7 which lacks loadClerkUiScript
---

## Problem
`@clerk/react@5.54.0` imports `loadClerkUiScript` from `@clerk/shared/loadClerkJsScript`.
`@clerk/shared@3.47.7` does not export `loadClerkUiScript` — it must be manually patched in.

## Root Cause Chain
1. `@clerk/react@5.54.0` calls `loadClerkUiScript` to load `@clerk/ui@1/dist/ui.browser.js`
2. `@clerk/ui@1` (newer) sets `window.__internal_ClerkUICtor`
3. `@clerk/react@5.54.0` (older) checks `window.__unstable_ClerkUiCtor`
4. These are different variable names — mismatch causes "Failed to download latest Clerk UI" error

## Fix
Patch `node_modules/.pnpm/@clerk+shared@3.47.7_.../node_modules/@clerk/shared/dist/runtime/loadClerkJsScript.mjs`
to add `loadClerkUiScript`, `clerkUiScriptUrl`, `buildClerkUiScriptAttributes` exports.

**Why:** normaliseClerkUiCtor() bridges old and new API names.

**How to apply:** The shim must:
- Load `@clerk/ui@1/dist/ui.browser.js` from the same CDN host as `clerk.browser.js` (major version only, `@1` not `@1.15.0`)
- After the bundle loads, copy `__internal_ClerkUICtor` → `__unstable_ClerkUiCtor` and vice versa
- Wait for EITHER variable to appear (interval check every 100ms)

After patching: always clear Vite dep cache (`rm -rf artifacts/ck-group/node_modules/.vite`) before restarting.

## Key Detail
The clerkJsScriptUrl uses major version (`@5`, not `@5.x.y`). Same rule applies for @clerk/ui: use `@1` not `@1.15.0`.
