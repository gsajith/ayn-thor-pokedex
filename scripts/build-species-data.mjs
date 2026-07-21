#!/usr/bin/env node
/**
 * Fetches every Pokemon species and its type(s) from PokeAPI and writes a
 * bundled JSON file consumed at build time.
 *
 * Fetches the 18 type endpoints rather than ~1025 species endpoints. Each type
 * endpoint lists every Pokemon of that type along with a `slot` (1 = primary,
 * 2 = secondary) and a URL containing the id, so inverting 18 responses yields
 * the complete species -> types map. That is 18 requests instead of 1025.
 *
 * Idempotent: same upstream data produces byte-identical output.
 *
 *   node scripts/build-species-data.mjs [--out path]
 */

import { writeFile, mkdir, readFile, access } from "node:fs/promises";
import { dirname, resolve, join } from "node:path";
import { PNG } from "pngjs";

const API = "https://pokeapi.co/api/v2";

const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const SPRITE_DIR = "public/sprites";

/** Kept low to stay polite to raw.githubusercontent.com. */
const DOWNLOAD_CONCURRENCY = 12;

/** PokeAPI gives alternate forms (megas, regional variants) ids of 10001+. */
const MAX_BASE_FORM_ID = 10000;

const TYPE_NAMES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

/** Names where capitalising hyphen-separated segments reads wrong. */
const LABEL_EXCEPTIONS = {
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "mr-mime": "Mr. Mime",
  "mr-rime": "Mr. Rime",
  "mime-jr": "Mime Jr.",
  "nidoran-f": "Nidoran♀",
  "nidoran-m": "Nidoran♂",
  "farfetchd": "Farfetch'd",
  "sirfetchd": "Sirfetch'd",
  "type-null": "Type: Null",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "flabebe": "Flabébé",
  "chi-yu": "Chi-Yu",
  "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu",
  "wo-chien": "Wo-Chien",
  "great-tusk": "Great Tusk",
  "iron-valiant": "Iron Valiant",
  "roaring-moon": "Roaring Moon",
  "walking-wake": "Walking Wake",
  "iron-leaves": "Iron Leaves",
  "gouging-fire": "Gouging Fire",
  "raging-bolt": "Raging Bolt",
  "iron-boulder": "Iron Boulder",
  "iron-crown": "Iron Crown",
};

function toLabel(slug) {
  if (LABEL_EXCEPTIONS[slug]) return LABEL_EXCEPTIONS[slug];
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function idFromUrl(url) {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) throw new Error(`Cannot parse id from url: ${url}`);
  return Number(match[1]);
}

async function fetchType(typeName) {
  const res = await fetchWithRetry(`${API}/type/${typeName}`);
  return res.json();
}

/**
 * The type endpoints key on *forms*, not species, so their names carry form
 * suffixes — "deoxys-normal", "aegislash-shield", "maushold-family-of-four".
 * The species endpoint gives the clean name for each dex number, so one extra
 * request buys correct names for the whole dex.
 */
async function fetchSpeciesNames() {
  const res = await fetchWithRetry(`${API}/pokemon-species?limit=100000`);
  const payload = await res.json();
  const names = new Map();
  for (const entry of payload.results) {
    names.set(idFromUrl(entry.url), entry.name);
  }
  return names;
}

/**
 * Over a thousand downloads, transient network failures are a certainty rather
 * than an edge case, and a whole-run abort on one blip is a bad trade. Retries
 * with backoff; a persistent failure still throws.
 */
async function fetchWithRetry(url, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      // 4xx other than rate limiting will not improve on retry.
      if (res.status < 500 && res.status !== 429) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
  }
  throw new Error(`${url}: ${lastError?.message ?? "unknown error"}`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a sprite unless it is already on disk, so re-runs cost no network.
 * Returns the raw PNG bytes either way.
 */
async function loadSprite(id, spriteDir) {
  const file = join(spriteDir, `${id}.png`);
  if (await exists(file)) return readFile(file);

  const res = await fetchWithRetry(`${SPRITE_BASE}/${id}.png`);
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(file, bytes);
  return bytes;
}

function saturationOf(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Picks a sprite's representative colour.
 *
 * Naive averaging turns every sprite into the same brown-grey, so pixels are
 * bucketed by coarse RGB and each vote is weighted by saturation. That lets a
 * small area of vivid colour outrank a large area of outline or shadow, which
 * is what actually makes a sprite recognisable. Fully transparent pixels are
 * ignored, as are near-black and near-white ones, which are almost always
 * outline and highlight rather than identity.
 *
 * Greyscale sprites have no saturated pixels at all, so the filters relax in
 * stages rather than failing.
 */
function extractAccent(pngBytes) {
  const png = PNG.sync.read(pngBytes);
  const { data, width, height } = png;

  const attempt = (minAlpha, minLuma, maxLuma, minSaturation) => {
    const buckets = new Map();
    for (let i = 0; i < width * height; i++) {
      const o = i * 4;
      const [r, g, b, a] = [data[o], data[o + 1], data[o + 2], data[o + 3]];
      if (a < minAlpha) continue;

      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (luma < minLuma || luma > maxLuma) continue;

      const saturation = saturationOf(r, g, b);
      if (saturation < minSaturation) continue;

      // 5 bits per channel: fine enough to separate shades, coarse enough
      // that anti-aliased neighbours land in the same bucket.
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { weight: 0, r: 0, g: 0, b: 0, count: 0 };
        buckets.set(key, bucket);
      }
      const weight = 1 + saturation * 3;
      bucket.weight += weight;
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
      bucket.count += 1;
    }

    let best = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.weight > best.weight) best = bucket;
    }
    return best;
  };

  const best =
    attempt(200, 0.08, 0.92, 0.25) ??
    attempt(200, 0.05, 0.95, 0.1) ??
    attempt(128, 0, 1, 0);

  if (!best) return "#808080";

  const toHex = (value) =>
    Math.round(value / best.weight)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(best.r)}${toHex(best.g)}${toHex(best.b)}`.toUpperCase();
}

/** Runs `worker` over `items` with a bounded number in flight. */
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index], index);
      }
    })(),
  );
  await Promise.all(runners);
  return results;
}

async function main() {
  const outArg = process.argv.indexOf("--out");
  const outPath = resolve(
    outArg !== -1 ? process.argv[outArg + 1] : "src/data/species.json",
  );

  process.stderr.write(
    `Fetching ${TYPE_NAMES.length} type endpoints + species names…\n`,
  );
  const [responses, speciesNames] = await Promise.all([
    Promise.all(TYPE_NAMES.map(fetchType)),
    fetchSpeciesNames(),
  ]);

  /** @type {Map<number, {name: string, slots: Array<[number, string]>}>} */
  const species = new Map();

  for (const payload of responses) {
    for (const entry of payload.pokemon) {
      const id = idFromUrl(entry.pokemon.url);
      if (id >= MAX_BASE_FORM_ID) continue;

      let record = species.get(id);
      if (!record) {
        record = { name: entry.pokemon.name, slots: [] };
        species.set(id, record);
      }
      record.slots.push([entry.slot, payload.name]);
    }
  }

  const missingNames = [];
  const rows = [...species.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, record]) => {
      const speciesName = speciesNames.get(id);
      if (!speciesName) missingNames.push(id);
      const name = speciesName ?? record.name;
      return {
        id,
        name,
        label: toLabel(name),
        types: record.slots
          .sort((a, b) => a[0] - b[0])
          .map(([, typeName]) => typeName),
      };
    });

  if (missingNames.length > 0) {
    throw new Error(
      `No species name for ${missingNames.length} ids, e.g. ${missingNames[0]}`,
    );
  }

  // The reverse direction: a species that appears in no type endpoint would
  // otherwise be dropped silently, since nothing above iterates the species
  // list. Guarding both directions makes an incomplete fetch loud.
  const covered = new Set(rows.map((row) => row.id));
  const uncovered = [...speciesNames.keys()].filter(
    (id) => id < MAX_BASE_FORM_ID && !covered.has(id),
  );
  if (uncovered.length > 0) {
    throw new Error(
      `${uncovered.length} species appear in no type endpoint, ` +
        `e.g. ${uncovered[0]} (${speciesNames.get(uncovered[0])})`,
    );
  }

  const problems = rows.filter((r) => r.types.length < 1 || r.types.length > 2);
  if (problems.length > 0) {
    throw new Error(
      `${problems.length} species have an unexpected type count, e.g. ` +
        JSON.stringify(problems[0]),
    );
  }

  const spriteDir = resolve(SPRITE_DIR);
  await mkdir(spriteDir, { recursive: true });

  process.stderr.write(`Fetching sprites and extracting accents…\n`);
  let downloaded = 0;
  const accents = await mapWithConcurrency(
    rows,
    DOWNLOAD_CONCURRENCY,
    async (row) => {
      const cached = await exists(join(spriteDir, `${row.id}.png`));
      const bytes = await loadSprite(row.id, spriteDir);
      if (!cached) downloaded += 1;
      return extractAccent(bytes);
    },
  );

  rows.forEach((row, index) => {
    row.accent = accents[index];
  });

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(rows, null, 2) + "\n", "utf8");

  process.stderr.write(
    `Wrote ${rows.length} species to ${outPath} ` +
      `(ids ${rows[0].id}–${rows[rows.length - 1].id}); ` +
      `${downloaded} sprites downloaded, ${rows.length - downloaded} cached\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`build-species-data failed: ${error.message}\n`);
  process.exit(1);
});
