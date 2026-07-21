"use client";

import { useSyncExternalStore } from "react";
import { PokemonType, TYPE_ORDER } from "./pokemonTypes";
import { Species } from "./species";

/**
 * Where an override came from. Manual edits are made on the detail page; a
 * future per-game data-pack import writes `imported` entries through the same
 * store rather than needing a parallel mechanism.
 */
export type OverrideSource = "manual" | "imported";

export interface TypeOverride {
  types: PokemonType[];
  source: OverrideSource;
}

export type OverrideMap = Record<number, TypeOverride>;

/** Versioned so a future shape change is detected rather than misparsed. */
export const STORAGE_KEY = "pokedex.type-overrides.v1";

const VALID_TYPES = new Set<string>(TYPE_ORDER);

const EMPTY: OverrideMap = Object.freeze({}) as OverrideMap;

let cache: OverrideMap | null = null;
const subscribers = new Set<() => void>();

function isValidEntry(value: unknown): value is TypeOverride {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<TypeOverride>;
  if (entry.source !== "manual" && entry.source !== "imported") return false;
  if (!Array.isArray(entry.types)) return false;
  if (entry.types.length < 1 || entry.types.length > 2) return false;
  if (!entry.types.every((t) => typeof t === "string" && VALID_TYPES.has(t))) {
    return false;
  }
  // A duplicated type would silently square its multipliers.
  return new Set(entry.types).size === entry.types.length;
}

/**
 * Reads and validates the stored map.
 *
 * A hand-edited or half-written entry must never take the dex down mid-battle,
 * so parsing is total: unparseable storage yields an empty map, and a single
 * bad entry is dropped while its valid siblings still load.
 */
export function parseOverrides(raw: string | null): OverrideMap {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  const result: OverrideMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    const id = Number(key);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (!isValidEntry(value)) continue;
    result[id] = { types: [...value.types], source: value.source };
  }
  return result;
}

function read(): OverrideMap {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    cache = parseOverrides(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can throw outright in private modes or when quota-blocked.
    cache = {};
  }
  return cache;
}

function write(next: OverrideMap) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Keep the in-memory correction even if it cannot be persisted; losing
      // it on reload beats refusing the edit outright.
    }
  }
  for (const notify of subscribers) notify();
}

export function getOverrides(): OverrideMap {
  return read();
}

export function setOverride(
  id: number,
  types: PokemonType[],
  source: OverrideSource = "manual",
) {
  write({ ...read(), [id]: { types: [...types], source } });
}

export function clearOverride(id: number) {
  const next = { ...read() };
  delete next[id];
  write(next);
}

export function clearAllOverrides() {
  write({});
}

/** Bulk write path for a future per-game data-pack import. */
export function importOverrides(entries: Record<number, PokemonType[]>) {
  const next = { ...read() };
  for (const [key, types] of Object.entries(entries)) {
    const id = Number(key);
    const candidate = { types, source: "imported" as const };
    if (!Number.isInteger(id) || id <= 0 || !isValidEntry(candidate)) continue;
    next[id] = { types: [...types], source: "imported" };
  }
  write(next);
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** Static export prerenders without storage, so the server snapshot is empty. */
function getServerSnapshot(): OverrideMap {
  return EMPTY;
}

export function useOverrides(): OverrideMap {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

export interface ResolvedSpecies extends Species {
  /** True when the displayed types came from a correction, not the bundle. */
  overridden: boolean;
  overrideSource?: OverrideSource;
}

/**
 * The single seam through which species data reaches the UI. Every consumer
 * calls this, so "reads the override layer" is structural rather than a rule
 * each component has to remember.
 */
export function resolveSpecies(
  species: Species,
  overrides: OverrideMap,
): ResolvedSpecies {
  const override = overrides[species.id];
  if (!override) return { ...species, overridden: false };
  return {
    ...species,
    types: override.types,
    overridden: true,
    overrideSource: override.source,
  };
}

/** Test seam: drops the module cache so a fresh read hits storage again. */
export function resetOverridesCacheForTests() {
  cache = null;
}
