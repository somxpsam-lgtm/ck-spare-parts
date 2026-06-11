---
name: Mobile delivery strategy (CK Group)
description: How the CK Group mobile app is delivered — WebIntoApp wrapper, NOT Expo. Do not re-add Expo.
---

# Mobile delivery = WebIntoApp APK, not Expo

The CK Group mobile app is delivered by wrapping the **published website** in an APK using
**WebIntoApp** (a third-party site-to-APK wrapper the user controls). There is **no Expo /
React Native app** anymore.

The `artifacts/ck-mobile` (Expo) artifact was **removed at the user's explicit request**.

**Why:**
- The Expo Go / canvas Android preview repeatedly failed with `java.io.IOException: Failed to
  download remote update` — a cold-start timeout (~13 MB dev bundle, ~20s cold Metro build).
  Pre-warming only lasted until the next workflow restart (every publish cleared the cache).
- The user (non-technical) makes the APK themselves via WebIntoApp from the published site.
  After login the APK was surfacing an Expo QR — that came from the deployed `/mobile/` Expo
  route. Removing the Expo artifact deleted that route, killing the QR.

**How to apply:**
- Do NOT re-create or re-add an Expo / React Native artifact unless the user *explicitly* asks.
- "Mobile app" for this project means: improve the responsive web app (`artifacts/ck-group`)
  so the WebIntoApp APK looks good on phones. The web app's mobile bottom nav already shows
  all 7 items (grid-cols-7).
- After any change meant to reach the APK, the user must **republish** — WebIntoApp wraps the
  live published site, so dev-only changes won't appear in their APK until a new deploy.
- With Expo gone, `/mobile/` now falls through to the web SPA (200, NotFound), not Expo.
