"use client";

import { useSyncExternalStore } from "react";

import {
  DEFAULT_GENERATION,
  GENERATION_OPTIONS,
  type Generation,
} from "./typeChart";

/** Versioned so a future shape change is detected rather than misparsed. */
export const STORAGE_KEY = "pokedex.generation.v1";

let cache: Generation | null = null;
const subscribers = new Set<() => void>();

/**
 * Valid means *available*, not merely declared. A stored id whose chart is not
 * populated — a hand edit, or a build where it briefly existed — must not be
 * honoured, or the app would render matchups from a chart it does not have.
 */
function isAvailable(value: unknown): value is Generation {
  return GENERATION_OPTIONS.some(
    (option) => option.available && option.id === value,
  );
}

export function parseGeneration(raw: string | null): Generation {
  return isAvailable(raw) ? raw : DEFAULT_GENERATION;
}

function read(): Generation {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_GENERATION;
  try {
    cache = parseGeneration(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can throw outright in private modes or when quota-blocked.
    cache = DEFAULT_GENERATION;
  }
  return cache;
}

export function getGeneration(): Generation {
  return read();
}

export function setGeneration(id: Generation) {
  if (!isAvailable(id)) {
    console.warn("Ignoring unavailable generation", id);
    return;
  }
  cache = id;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Keep the in-session choice even if it cannot be persisted.
    }
  }
  for (const notify of subscribers) notify();
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/** Static export prerenders without storage, so the server snapshot is default. */
function getServerSnapshot(): Generation {
  return DEFAULT_GENERATION;
}

export function useGeneration(): Generation {
  return useSyncExternalStore(subscribe, read, getServerSnapshot);
}

/** Test seam: drops the module cache so a fresh read hits storage again. */
export function resetGenerationCacheForTests() {
  cache = null;
}
