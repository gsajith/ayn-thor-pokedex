"use client";

import { useSyncExternalStore } from "react";

/**
 * `black` is the default deliberately: on the AMOLED panel this app targets,
 * true black switches pixels off, which saves battery and — more importantly —
 * stops the bottom screen glaring in peripheral vision while the maintainer is
 * looking at the game on the top screen.
 */
export const THEME_MODES = ["black", "dark", "light"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_THEME: ThemeMode = "black";

export const THEME_LABELS: Record<ThemeMode, string> = {
  black: "Pure black",
  dark: "Dark",
  light: "Light",
};

export const STORAGE_KEY = "pokedex.theme.v1";

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
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = mode;
  }
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
  // The prerendered HTML carries no data-theme, so the first client read has to
  // push it onto the document.
  applyToDocument(mode);
  return mode;
}

/** Test seam: drops the module cache so a fresh read hits storage again. */
export function resetThemeCacheForTests() {
  cache = null;
}
