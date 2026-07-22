"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  DEFAULT_THEME,
  STORAGE_KEY,
  THEME_COLORS,
  THEME_MODES,
  type ThemeMode,
} from "./themeConstants";

export {
  DEFAULT_THEME,
  STORAGE_KEY,
  THEME_LABELS,
  THEME_MODES,
  type ThemeMode,
} from "./themeConstants";

let cache: ThemeMode | null = null;
const subscribers = new Set<() => void>();

function isThemeMode(value: unknown): value is ThemeMode {
  return (
    typeof value === "string" && (THEME_MODES as readonly string[]).includes(value)
  );
}

export function parseTheme(raw: string | null): ThemeMode {
  return isThemeMode(raw) ? raw : DEFAULT_THEME;
}

function read(): ThemeMode {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    cache = parseTheme(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can throw outright in private modes or when quota-blocked.
    cache = DEFAULT_THEME;
  }
  return cache;
}

/** The attribute CSS keys off. Kept in sync on every write. */
function applyToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
  // Otherwise the browser/OS chrome stays black while the app is in light mode.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[mode]);
}

export function setTheme(mode: ThemeMode) {
  if (!isThemeMode(mode)) return;
  cache = mode;
  applyToDocument(mode);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Keep the in-session choice even if it cannot be persisted.
    }
  }
  for (const notify of subscribers) notify();
}

export function cycleTheme(current: ThemeMode): ThemeMode {
  return THEME_MODES[(THEME_MODES.indexOf(current) + 1) % THEME_MODES.length];
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** Static export prerenders without storage, so the server snapshot is default. */
function getServerSnapshot(): ThemeMode {
  return DEFAULT_THEME;
}

export function useTheme(): ThemeMode {
  const mode = useSyncExternalStore(subscribe, read, getServerSnapshot);
  // The inline bootstrap in the layout already set the attribute before paint;
  // this only reconciles it, and lives in an effect rather than in render so
  // there is no side effect during rendering.
  useEffect(() => {
    applyToDocument(mode);
  }, [mode]);
  return mode;
}

/** Test seam: drops the module cache so a fresh read hits storage again. */
export function resetThemeCacheForTests() {
  cache = null;
}
