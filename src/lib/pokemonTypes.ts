export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

/** Canonical game order. Laid out 6-per-row this is exactly the grid in SPEC.md. */
export const TYPE_ORDER: readonly PokemonType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

/**
 * Abbreviations follow the long-standing GameFAQs Pokemon Crystal type
 * affinity guide, which drops vowels rather than truncating. That guide is
 * Gen 2 and so has no Fairy; FRY is filled in to match the same convention.
 *
 * Note GRS (Grass) and GRN (Ground) are deliberately distinct.
 */
export const TYPE_ABBREV: Record<PokemonType, string> = {
  normal: "NRM",
  fire: "FIR",
  water: "WTR",
  electric: "ELE",
  grass: "GRS",
  ice: "ICE",
  fighting: "FGT",
  poison: "PSN",
  ground: "GRN",
  flying: "FLY",
  psychic: "PSY",
  bug: "BUG",
  rock: "RCK",
  ghost: "GHO",
  dragon: "DRA",
  dark: "DRK",
  steel: "STL",
  fairy: "FRY",
};

export const TYPE_LABEL: Record<PokemonType, string> = {
  normal: "Normal",
  fire: "Fire",
  water: "Water",
  electric: "Electric",
  grass: "Grass",
  ice: "Ice",
  fighting: "Fighting",
  poison: "Poison",
  ground: "Ground",
  flying: "Flying",
  psychic: "Psychic",
  bug: "Bug",
  rock: "Rock",
  ghost: "Ghost",
  dragon: "Dragon",
  dark: "Dark",
  steel: "Steel",
  fairy: "Fairy",
};

/*
 * Bolder and more separated than the canonical Pokemon palette this started
 * from, which was tuned for large surfaces rather than 18 chips crowded onto a
 * 537px-wide panel.
 *
 * Two constraints, both measured rather than eyeballed:
 *
 * 1. Perceptual separation. Ground and Electric were both yellows and read as
 *    the same chip in use; they are now 43.6 apart in CIE Lab, up from 29.5.
 *    The closest remaining pair is Water/Flying at 20.8, up from Ground/Rock
 *    at 15.2.
 * 2. Legibility. `readableTextOn` picks each chip's ink from this value, and
 *    the sheen laid over the fill erodes that contrast, so every colour has to
 *    clear 4.5:1 against its own sheened surface. Several bolder mid-tones
 *    (Poison, Ghost, Fighting) had to move darker to get there — a colour
 *    whose luminance sits mid-scale suits neither black nor white text. The
 *    floor is currently 4.53:1 at Fighting.
 *
 * Changing any value here means re-checking both. `scripts/palette-check.mjs`
 * does it.
 */
export const TYPE_COLOR: Record<PokemonType, string> = {
  normal: "#B9B3A6",
  fire: "#FF7A2F",
  water: "#4E92F7",
  electric: "#FFD119",
  grass: "#5FC03A",
  ice: "#6FD6DC",
  fighting: "#CE2E24",
  poison: "#9E2FB4",
  ground: "#C97F2A",
  flying: "#9C8BF5",
  psychic: "#F94E76",
  bug: "#9EC61A",
  rock: "#C6B36A",
  ghost: "#67479F",
  dragon: "#6A3BF5",
  dark: "#57473B",
  steel: "#9FB0C9",
  fairy: "#FF77C8",
};

export const CHIP_TEXT_DARK = "#101010";
export const CHIP_TEXT_LIGHT = "#ffffff";

/** WCAG relative luminance. */
export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two luminances, 1:1 to 21:1. */
export function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Type colours span a wide luminance range, and several sit near the midpoint
 * where neither foreground is obviously right. Comparing actual contrast beats
 * a fixed luminance threshold: a threshold picked by eye put white text on
 * Normal, Fire, Water, Flying, Psychic, Rock and Fairy at ratios as low as
 * 2.48:1, all of which fail WCAG AA.
 */
export function readableTextOn(hex: string): string {
  const background = relativeLuminance(hex);
  const onDark = contrastRatio(background, relativeLuminance(CHIP_TEXT_DARK));
  const onLight = contrastRatio(background, relativeLuminance(CHIP_TEXT_LIGHT));
  return onDark >= onLight ? CHIP_TEXT_DARK : CHIP_TEXT_LIGHT;
}
