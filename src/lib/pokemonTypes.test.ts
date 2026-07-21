import { describe, expect, it } from "vitest";
import {
  TYPE_ABBREV,
  TYPE_COLOR,
  TYPE_LABEL,
  TYPE_ORDER,
  contrastRatio,
  readableTextOn,
  relativeLuminance,
} from "./pokemonTypes";

describe("type vocabulary", () => {
  it("has exactly 18 types with no duplicates", () => {
    expect(TYPE_ORDER).toHaveLength(18);
    expect(new Set(TYPE_ORDER).size).toBe(18);
  });

  it("lays out into a full 6x3 grid with no gaps", () => {
    expect(TYPE_ORDER.length % 6).toBe(0);
    expect(TYPE_ORDER.length / 6).toBe(3);
  });

  it("has an abbreviation, label and colour for every type", () => {
    for (const type of TYPE_ORDER) {
      expect(TYPE_ABBREV[type]).toMatch(/^[A-Z]{3,4}$/);
      expect(TYPE_LABEL[type]).toBeTruthy();
      expect(TYPE_COLOR[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("uses a distinct abbreviation per type", () => {
    const abbrevs = TYPE_ORDER.map((t) => TYPE_ABBREV[t]);
    expect(new Set(abbrevs).size).toBe(18);
  });
});

describe("chip legibility", () => {
  // The screen is read mid-battle at a glance, so every chip must clear AA.
  it("meets WCAG AA contrast for all 18 chips", () => {
    for (const type of TYPE_ORDER) {
      const background = TYPE_COLOR[type];
      const ratio = contrastRatio(
        relativeLuminance(background),
        relativeLuminance(readableTextOn(background)),
      );
      expect(
        ratio,
        `${type} (${background}) on ${readableTextOn(background)}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("picks whichever foreground actually scores higher", () => {
    // Normal sits near the luminance midpoint; dark text wins decisively.
    expect(readableTextOn("#A8A77A")).toBe("#101010");
    // Dark is genuinely dark; white wins.
    expect(readableTextOn("#705746")).toBe("#ffffff");
  });

  it("computes known contrast ratios correctly", () => {
    const white = relativeLuminance("#ffffff");
    const black = relativeLuminance("#000000");
    expect(contrastRatio(white, black)).toBeCloseTo(21, 1);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });
});
