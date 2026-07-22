import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  STORAGE_KEY,
  THEME_COLORS,
  THEME_MODES,
  themeBootstrapScript,
} from "./themeConstants";

describe("themeBootstrapScript", () => {
  const script = themeBootstrapScript();

  it("never interpolates undefined", () => {
    // This is the assertion that was missing: the first version imported these
    // constants from a "use client" module into a Server Component, so every
    // value serialised to `undefined` and the emitted script threw on load.
    expect(script).not.toContain("undefined");
  });

  it("embeds the real storage key and mode list", () => {
    expect(script).toContain(JSON.stringify(STORAGE_KEY));
    for (const mode of THEME_MODES) {
      expect(script).toContain(JSON.stringify(mode));
    }
    expect(script).toContain(JSON.stringify(DEFAULT_THEME));
  });

  it("is syntactically valid and applies a stored mode before paint", () => {
    const root = { dataset: {} as Record<string, string> };
    const run = (stored: string | null) => {
      root.dataset = {};
      new Function(
        "localStorage",
        "document",
        script,
      )({ getItem: () => stored }, { documentElement: root });
      return root.dataset.theme;
    };
    expect(run("light")).toBe("light");
    expect(run("dark")).toBe("dark");
    expect(run(null)).toBe(DEFAULT_THEME);
    expect(run("neon")).toBe(DEFAULT_THEME);
  });

  it("falls back rather than throwing when storage is unavailable", () => {
    const root = { dataset: {} as Record<string, string> };
    new Function("localStorage", "document", script)(
      {
        getItem() {
          throw new Error("SecurityError");
        },
      },
      { documentElement: root },
    );
    expect(root.dataset.theme).toBe(DEFAULT_THEME);
  });

  it("has a chrome colour for every mode", () => {
    for (const mode of THEME_MODES) {
      expect(THEME_COLORS[mode]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
