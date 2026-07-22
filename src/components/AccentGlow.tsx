"use client";

import { useEffect } from "react";

type Props = {
  /** One colour, or two for a dual-type blend. Empty clears the glow. */
  colors: readonly string[];
};

/**
 * Publishes the accent as a CSS variable rather than rendering anything.
 *
 * The glow itself is drawn by `body::after` so it sits behind all content.
 * Rendering it as an element inside <main> would paint it over the bucket
 * chips, and tinting those is exactly what the design rules out — they are the
 * fastest recognition signal on the screen.
 */
export function AccentGlow({ colors }: Props) {
  // Callers build a fresh array each render, so the effect keys on the joined
  // value; depending on array identity would re-run it on every render.
  const key = colors.join(",");

  useEffect(() => {
    const root = document.documentElement;
    if (key === "") {
      root.style.removeProperty("--accent-glow");
      return;
    }
    const list = key.split(",");
    const from = list[0];
    const to = list[list.length - 1];
    root.style.setProperty(
      "--accent-glow",
      `linear-gradient(90deg, ${from}, ${to})`,
    );
  }, [key]);

  return null;
}
