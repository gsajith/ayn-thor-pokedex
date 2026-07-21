import { PokemonType, TYPE_ORDER } from "./pokemonTypes";

/** Only 0, 0.5 and 2 are ever stored; 1 is implied by absence. */
export type Matchup = 0 | 0.5 | 2;

export type MatchupTable = Record<
  PokemonType,
  Partial<Record<PokemonType, Matchup>>
>;

export type Generation = "gen6plus";

export interface GenerationChart {
  id: Generation;
  label: string;
  types: readonly PokemonType[];
  /** attacking type -> defending type -> multiplier. Absent means neutral. */
  matchups: MatchupTable;
}

export const DEFAULT_GENERATION: Generation = "gen6plus";

const GEN6_MATCHUPS: MatchupTable = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: {
    water: 2,
    electric: 0.5,
    grass: 0.5,
    ground: 0,
    flying: 2,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 0.5,
    ground: 2,
    flying: 2,
    dragon: 2,
    steel: 0.5,
  },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: {
    grass: 2,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0,
    fairy: 2,
  },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: {
    electric: 0.5,
    grass: 2,
    fighting: 2,
    bug: 2,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2,
    ice: 2,
    fighting: 0.5,
    ground: 0.5,
    flying: 2,
    bug: 2,
    steel: 0.5,
  },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2,
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5,
  },
};

export const TYPE_CHARTS: Record<Generation, GenerationChart> = {
  gen6plus: {
    id: "gen6plus",
    label: "Gen 6+ (Fairy)",
    types: TYPE_ORDER,
    matchups: GEN6_MATCHUPS,
  },
};

/** Multiplier every attacking type deals to the given defending combination. */
export function effectivenessAgainst(
  defending: readonly PokemonType[],
  chart: GenerationChart,
): Record<PokemonType, number> {
  const unique = Array.from(new Set(defending));
  const result = {} as Record<PokemonType, number>;
  for (const attacking of chart.types) {
    const row = chart.matchups[attacking];
    let multiplier = 1;
    for (const target of unique) {
      multiplier *= row[target] ?? 1;
    }
    result[attacking] = multiplier;
  }
  return result;
}

export const BUCKET_STEPS = [4, 2, 1, 0.5, 0.25, 0] as const;

const BUCKET_LABELS: Record<(typeof BUCKET_STEPS)[number], string> = {
  4: "4×",
  2: "2×",
  1: "1×",
  0.5: "½×",
  0.25: "¼×",
  0: "0×",
};

export interface Bucket {
  multiplier: (typeof BUCKET_STEPS)[number];
  label: string;
  types: PokemonType[];
}

/**
 * Two defending types can only ever produce one of BUCKET_STEPS, but the
 * signature accepts any number. Three or more would yield values like 8x or
 * 0.125x, and matching on exact equality would silently drop those types from
 * every bucket. Snapping to the closest step keeps every type visible and
 * directionally correct instead.
 */
function nearestStep(multiplier: number): (typeof BUCKET_STEPS)[number] {
  // Immunity is qualitatively different from "very small", so 0 is matched
  // exactly and excluded from the search below. Otherwise 0.125 sits exactly
  // between 0.25 and 0, and which one wins would depend on the order of
  // BUCKET_STEPS — making a triple-resist silently read as an immunity.
  if (multiplier === 0) return 0;

  let closest: (typeof BUCKET_STEPS)[number] = 1;
  let smallestGap = Infinity;
  for (const step of BUCKET_STEPS) {
    if (step === 0) continue;
    const gap = Math.abs(step - multiplier);
    if (gap < smallestGap) {
      smallestGap = gap;
      closest = step;
    }
  }
  return closest;
}

/**
 * Always returns all six buckets, including empty ones, so bucket positions
 * stay fixed between lookups and can be learned by muscle memory. Types keep
 * canonical order within a bucket because chart.types is walked in order.
 */
export function bucketize(
  defending: readonly PokemonType[],
  chart: GenerationChart,
): Bucket[] {
  const effectiveness = effectivenessAgainst(defending, chart);
  const byStep = new Map<(typeof BUCKET_STEPS)[number], PokemonType[]>(
    BUCKET_STEPS.map((step) => [step, []]),
  );
  for (const type of chart.types) {
    byStep.get(nearestStep(effectiveness[type]))!.push(type);
  }
  return BUCKET_STEPS.map((multiplier) => ({
    multiplier,
    label: BUCKET_LABELS[multiplier],
    types: byStep.get(multiplier)!,
  }));
}
