import Fuse from "fuse.js";
import { SPECIES, Species } from "./species";

export const SEARCH_LIMIT = 20;

/**
 * Fuzziness is a rescue path, not the primary ranking. A correctly typed query
 * is resolved by the deterministic tiers below and never reordered by fuzzy
 * scoring; Fuse only fills remaining slots. This matters because the on-screen
 * keyboard covers most of the screen, so retyping a query is expensive and a
 * correct query must not be answered with a surprising result.
 */
const fuse = new Fuse(SPECIES, {
  keys: ["name", "label"],
  threshold: 0.45,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

export function searchSpecies(
  query: string,
  limit: number = SEARCH_LIMIT,
): Species[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const seen = new Set<number>();
  const results: Species[] = [];

  const push = (species: Species) => {
    if (seen.has(species.id) || results.length >= limit) return;
    seen.add(species.id);
    results.push(species);
  };

  // Tier 1: exact match on slug or display label.
  for (const species of SPECIES) {
    if (species.name === q || species.label.toLowerCase() === q) push(species);
  }

  // Tier 2: prefix match. SPECIES is dex-ordered, so these come out in dex order.
  for (const species of SPECIES) {
    if (
      species.name.startsWith(q) ||
      species.label.toLowerCase().startsWith(q)
    ) {
      push(species);
    }
  }

  // Tier 3: fuzzy, only to fill slots the deterministic tiers left empty.
  if (results.length < limit) {
    for (const { item } of fuse.search(q, { limit: limit * 2 })) {
      push(item);
      if (results.length >= limit) break;
    }
  }

  return results;
}
