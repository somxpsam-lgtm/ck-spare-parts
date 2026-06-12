---
name: React form focus loss on mobile (CK Group)
description: Why typing breaks in dialog forms on the WebIntoApp APK, and the rule to prevent it.
---

# Form input focus loss in the WebIntoApp APK

**Rule:** Never define a form/field React component inside a page component. Keep
field components (and helpers like `formatCurrency`) at module scope; pass data such
as `categories` in via props.

**Why:** A component declared inside another component is a *new component type* on
every parent render, so React unmounts/remounts its whole subtree and the focused
input loses focus mid-typing. On the CK Group mobile APK (WebIntoApp WebView) this
fired constantly: the app's `QueryClient` is `new QueryClient()` with no defaults, so
`refetchOnWindowFocus` is true; opening/closing the on-screen keyboard toggles window
focus → react-query refetches (`useListExpenses`, `useListCategories`) → the page
re-renders → the inline field component remounts → user can only type one character
at a time. Symptom reported as "type function theek se kaam nahi kar raha."

**How to apply:** When a dialog/form's typing "doesn't work" on mobile, first check
whether the fields component is declared inside the page. Move it to module scope.
This applies to every CRUD dialog in CK Group (parts, categories, expenses, etc.).
Secondary polish for number inputs: `inputMode="numeric"/"decimal"` + `onFocus`
select-all so the default 0/1 is replaced cleanly. Optional app-wide tweak (not yet
applied): set `refetchOnWindowFocus: false` / a `staleTime` on the QueryClient to stop
needless refetches on every keyboard toggle.
