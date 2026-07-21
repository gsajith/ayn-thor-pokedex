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

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const API = "https://pokeapi.co/api/v2";

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
  const res = await fetch(`${API}/type/${typeName}`);
  if (!res.ok) {
    throw new Error(`${typeName}: HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * The type endpoints key on *forms*, not species, so their names carry form
 * suffixes — "deoxys-normal", "aegislash-shield", "maushold-family-of-four".
 * The species endpoint gives the clean name for each dex number, so one extra
 * request buys correct names for the whole dex.
 */
async function fetchSpeciesNames() {
  const res = await fetch(`${API}/pokemon-species?limit=100000`);
  if (!res.ok) {
    throw new Error(`pokemon-species: HTTP ${res.status} ${res.statusText}`);
  }
  const payload = await res.json();
  const names = new Map();
  for (const entry of payload.results) {
    names.set(idFromUrl(entry.url), entry.name);
  }
  return names;
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

  const problems = rows.filter((r) => r.types.length < 1 || r.types.length > 2);
  if (problems.length > 0) {
    throw new Error(
      `${problems.length} species have an unexpected type count, e.g. ` +
        JSON.stringify(problems[0]),
    );
  }

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(rows, null, 2) + "\n", "utf8");

  process.stderr.write(
    `Wrote ${rows.length} species to ${outPath} ` +
      `(ids ${rows[0].id}–${rows[rows.length - 1].id})\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`build-species-data failed: ${error.message}\n`);
  process.exit(1);
});
