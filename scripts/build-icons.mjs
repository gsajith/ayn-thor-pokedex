#!/usr/bin/env node
/**
 * Draws the PWA icons.
 *
 * Generated rather than committed as opaque binaries so the shape is reviewable
 * and regenerable. A Poke Ball reads instantly at 48px on a home screen, which
 * a wordmark would not.
 *
 *   node scripts/build-icons.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { PNG } from "pngjs";

const OUT_DIR = "public";

/** Matches the app's pure-black AMOLED background. */
const BACKGROUND = [0, 0, 0];
const RED = [0xee, 0x15, 0x15];
const WHITE = [0xf0, 0xf0, 0xf0];
const OUTLINE = [0x10, 0x10, 0x10];

/**
 * Maskable icons are cropped to a circle on some launchers, so the ball is
 * drawn at 80% of the canvas to stay inside the safe zone.
 */
const BALL_SCALE = 0.8;

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * BALL_SCALE;

  const band = radius * 0.16;
  const buttonOuter = radius * 0.3;
  const buttonInner = radius * 0.17;
  const edge = radius * 0.07;

  const put = (x, y, [r, g, b]) => {
    const o = (y * size + x) * 4;
    png.data[o] = r;
    png.data[o + 1] = g;
    png.data[o + 2] = b;
    png.data[o + 3] = 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.hypot(dx, dy);

      if (dist > radius) {
        put(x, y, BACKGROUND);
        continue;
      }
      if (dist > radius - edge) {
        put(x, y, OUTLINE);
        continue;
      }
      if (dist <= buttonInner) {
        put(x, y, WHITE);
        continue;
      }
      if (dist <= buttonOuter) {
        put(x, y, OUTLINE);
        continue;
      }
      if (Math.abs(dy) <= band / 2) {
        put(x, y, OUTLINE);
        continue;
      }
      put(x, y, dy < 0 ? RED : WHITE);
    }
  }

  return PNG.sync.write(png);
}

async function main() {
  const dir = resolve(OUT_DIR);
  await mkdir(dirname(resolve(dir, "x")), { recursive: true });

  for (const size of [192, 512]) {
    const file = resolve(dir, `icon-${size}.png`);
    await writeFile(file, drawIcon(size));
    process.stderr.write(`Wrote ${file}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`build-icons failed: ${error.message}\n`);
  process.exit(1);
});
