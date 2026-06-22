// Per-device UI preferences (theme, dashboard alert visibility).
// Stored in localStorage so they apply instantly on load with no flash and
// survive app restarts on the same device. Company/business data that must
// survive an APK reinstall lives in the DB (see /settings), not here.

const THEME_KEY = "ck_theme";
const ALERTS_KEY = "ck_low_stock_alerts";
const PREFS_EVENT = "ck-prefs-changed";

export type Theme = "dark" | "light";

export function getTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage failures (e.g. private mode)
  }
  applyTheme(theme);
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function getLowStockAlerts(): boolean {
  try {
    return localStorage.getItem(ALERTS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setLowStockAlerts(enabled: boolean): void {
  try {
    localStorage.setItem(ALERTS_KEY, enabled ? "on" : "off");
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function onPrefsChanged(cb: () => void): () => void {
  window.addEventListener(PREFS_EVENT, cb);
  return () => window.removeEventListener(PREFS_EVENT, cb);
}
