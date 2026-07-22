/**
 * Audits TYPE_COLOR on the two properties that are easy to break by eye.
 *
 * Run with `npm run check:palette` after touching the palette.
 *
 * 1. Perceptual separation — CIE Lab distance between all 153 chip pairs. Two
 *    types that read as the same colour make the grid actively misleading,
 *    which is worse than merely ugly.
 * 2. Legibility — `readableTextOn` picks each chip's ink against the flat
 *    fill, but the chip sheen is composited over it afterwards, eroding the
 *    contrast that was computed. Each colour is checked against its own
 *    sheened surface at several points down the text band.
 *
 * Exits non-zero on a violation so CI fails rather than warns.
 */
import { readFileSync } from "node:fs";

/** Mirrors --chip-sheen in globals.css. Keep in step with it. */
const SHEEN_TOP_ALPHA = 0.16;
const SHEEN_BOTTOM_ALPHA = 0.13;
const SHEEN_MIDPOINT = 0.52;

const MIN_CONTRAST = 4.5;
/** Below roughly this, two fills are hard to tell apart at chip size. */
const MIN_SEPARATION = 18;

const source = readFileSync(new URL("../src/lib/pokemonTypes.ts", import.meta.url), "utf8");
const block = source.match(/export const TYPE_COLOR[^{]*\{([^}]*)\}/s);
if (!block) {
  console.error("Could not find TYPE_COLOR in src/lib/pokemonTypes.ts");
  process.exit(1);
}
const palette = {};
for (const [, name, hex] of block[1].matchAll(/(\w+):\s*"(#[0-9A-Fa-f]{6})"/g)) {
  palette[name] = hex;
}

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const linear = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

function lab(hex) {
  const [r, g, b] = channels(hex).map(linear);
  let x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [f(x), f(y), f(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const separation = (a, b) => {
  const p = lab(a); const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const luminance = (hex) => { const [r, g, b] = channels(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const composite = (fg, alpha, bg) => bg.map((c, i) => Math.round(fg[i] * alpha + c * (1 - alpha)));
const toHex = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

const names = Object.keys(palette);
const failures = [];

let closest = { distance: Infinity };
for (let i = 0; i < names.length; i++) {
  for (let j = i + 1; j < names.length; j++) {
    const distance = separation(palette[names[i]], palette[names[j]]);
    if (distance < closest.distance) closest = { distance, pair: `${names[i]}/${names[j]}` };
    if (distance < MIN_SEPARATION) {
      failures.push(`${names[i]} and ${names[j]} are only ${distance.toFixed(1)} apart (min ${MIN_SEPARATION})`);
    }
  }
}

let floor = { ratio: Infinity };
for (const name of names) {
  const fill = palette[name];
  // Mirrors readableTextOn: whichever ink wins against the flat fill.
  const ink = contrast(fill, "#101010") >= contrast(fill, "#ffffff") ? "#101010" : "#ffffff";
  let worst = Infinity;
  for (const t of [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]) {
    const sheen = t <= SHEEN_MIDPOINT
      ? { colour: [255, 255, 255], alpha: SHEEN_TOP_ALPHA * (1 - t / SHEEN_MIDPOINT) }
      : { colour: [0, 0, 0], alpha: SHEEN_BOTTOM_ALPHA * ((t - SHEEN_MIDPOINT) / (1 - SHEEN_MIDPOINT)) };
    const surface = toHex(composite(sheen.colour, sheen.alpha, channels(fill)));
    worst = Math.min(worst, contrast(surface, ink));
  }
  if (worst < floor.ratio) floor = { ratio: worst, name };
  if (worst < MIN_CONTRAST) {
    failures.push(`${name} text is ${worst.toFixed(2)}:1 on its sheened fill (min ${MIN_CONTRAST})`);
  }
}

console.log(`closest pair:  ${closest.pair} at ${closest.distance.toFixed(1)}`);
console.log(`contrast floor: ${floor.name} at ${floor.ratio.toFixed(2)}:1`);

if (failures.length) {
  console.error("\nPalette check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("palette ok");
