---
name: Clerk Expo Core v3 API
description: "@clerk/expo v3 uses a different sign-in/sign-up API than v2 — using v2 patterns type-breaks and fails at runtime"
---

# Clerk @clerk/expo Core v3 API (mobile)

The project's `@clerk/expo` is **Core v3** (^3.3.x). Its auth API differs from v2.

**Do NOT use the v2 patterns** (`signIn.create({ identifier, password })`, `setActive({ session })`, `isLoaded`, `result.status`, `result.createdSessionId`) — these do not exist on the v3 hook return and cause TS errors + runtime failures.

**v3 email/password sign-in:**
- `const { signIn } = useSignIn()` (no `setActive`/`isLoaded` on the return)
- `const { error } = await signIn.password({ emailAddress, password })`
- check `signIn.status === "complete"` then `await signIn.finalize({ navigate: () => {...} })`

**v3 Google OAuth (sign-in + sign-up in one):**
- `const { startSSOFlow } = useSSO()`
- `const { createdSessionId, setActive } = await startSSOFlow({ strategy: "oauth_google", redirectUrl: AuthSession.makeRedirectUri() })`
- then `await setActive({ session: createdSessionId })`
- needs `expo-auth-session`, `expo-web-browser`, `expo-crypto` installed; call `WebBrowser.maybeCompleteAuthSession()` at module top.

**Why:** v3 has breaking changes from v2. Authoritative reference: `.local/skills/clerk-auth/references/custom-ui/expo-sdk-email-password.md` and `expo-sdk-oauth.md`. Always read these before writing mobile Clerk code — do not rely on prior Clerk knowledge.

**How to apply:** Social provider (Google) must be enabled in the workspace **Auth pane** (not the Clerk dashboard) for OAuth + the web `<SignIn/>` social button to appear.
