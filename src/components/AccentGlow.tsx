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
  useEffect(() => {
    const root = document.documentElement;
    if (colors.length === 0) {
      root.style.removeProperty("--accent-glow");
      return;
    }
    const value =
      colors.length === 1
        ? `linear-gradient(90deg, ${colors[0]}, ${colors[0]})`
        : `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`;
    root.style.setProperty("--accent-glow", value);
  }, [colors]);

  return null;
}
