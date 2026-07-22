/**
 * Theme values with no `"use client"` directive, so they can be read from a
 * Server Component.
 *
 * This split exists for a concrete reason: importing these from `theme.ts`
 * (which is a client module) into the root layout serialised every value to
 * `undefined`, emitting a bootstrap script that read `localStorage.getItem(
 * undefined)` and threw on every page load.
 */

export const THEME_MODES = ["black", "dark", "light"] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * `black` is the default deliberately: on the AMOLED panel this app targets,
 * true black switches pixels off, which saves battery and — more importantly —
 * stops the bottom screen glaring in peripheral vision while the maintainer is
 * looking at the game on the top screen.
 */
export const DEFAULT_THEME: ThemeMode = "black";

export const STORAGE_KEY = "pokedex.theme.v1";

export const THEME_LABELS: Record<ThemeMode, string> = {
  black: "Pure black",
  dark: "Dark",
  light: "Light",
};

/** Background reported to the OS for browser chrome, per mode. */
export const THEME_COLORS: Record<ThemeMode, string> = {
  black: "#000000",
  dark: "#121212",
  light: "#f4f4f5",
};

/**
 * Script inlined in <head> so the stored mode applies before first paint.
 * Without it a light-mode user gets a full black flash on every cold start,
 * because the static export prerenders without `data-theme` and every app
 * chunk loads async.
 *
 * Built here rather than written as a literal in the layout so the storage key
 * and mode list cannot drift from the ones the app actually uses.
 */
export function themeBootstrapScript(): string {
  const modes = JSON.stringify(THEME_MODES);
  const key = JSON.stringify(STORAGE_KEY);
  const fallback = JSON.stringify(DEFAULT_THEME);
  return (
    `(function(){try{` +
    `var m=localStorage.getItem(${key});` +
    `document.documentElement.dataset.theme=${modes}.indexOf(m)>-1?m:${fallback};` +
    `}catch(e){document.documentElement.dataset.theme=${fallback};}})()`
  );
}
