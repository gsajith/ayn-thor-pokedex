"use client";

import { useSyncExternalStore } from "react";

export interface ViewportInfo {
  /** CSS pixels, not device pixels. */
  width: number;
  height: number;
  dpr: number;
}

/**
 * Zeroes rather than a guess. The static export prerenders with no window, and
 * inventing plausible numbers here would put a wrong readout on screen during
 * hydration — for a panel whose whole job is reporting the real measurement.
 */
const UNMEASURED: ViewportInfo = Object.freeze({ width: 0, height: 0, dpr: 0 });

/**
 * `useSyncExternalStore` compares snapshots by identity and re-renders until
 * two consecutive reads match. Returning a fresh object each call would spin
 * forever, so the snapshot is cached and only replaced when a value changes.
 */
let snapshot: ViewportInfo = UNMEASURED;

function measure(): ViewportInfo {
  if (typeof window === "undefined") return UNMEASURED;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = window.devicePixelRatio;
  if (
    width === snapshot.width &&
    height === snapshot.height &&
    dpr === snapshot.dpr
  ) {
    return snapshot;
  }
  snapshot = { width, height, dpr };
  return snapshot;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  // `resize` covers rotation on most browsers, but Android WebViews have
  // historically fired only `orientationchange`, and this app runs on one.
  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);
  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
}

function getServerSnapshot(): ViewportInfo {
  return UNMEASURED;
}

export function useViewport(): ViewportInfo {
  return useSyncExternalStore(subscribe, measure, getServerSnapshot);
}

/** True once the browser has actually reported a size. */
export function isMeasured(info: ViewportInfo): boolean {
  return info.width > 0 && info.height > 0;
}
