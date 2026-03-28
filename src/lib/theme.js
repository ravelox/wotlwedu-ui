export const THEME_STORAGE_KEY = "wotlwedu_ui_theme_mode";
export const THEME_OPTIONS = ["system", "light", "dark"];

export function getStoredThemeMode() {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_OPTIONS.includes(value) ? value : "system";
}

export function getSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveThemeMode(mode) {
  return mode === "system" ? getSystemTheme() : mode;
}

export function persistThemeMode(mode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyThemeMode(mode) {
  if (typeof document === "undefined") return;
  const resolved = resolveThemeMode(mode);
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolved;
}
