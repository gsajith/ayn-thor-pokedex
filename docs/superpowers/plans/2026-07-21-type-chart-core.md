# Type Chart Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select up to two defending types and see, at a glance, what every attacking type does to that combination.

**Architecture:** Pure data and pure functions in `src/lib/`, dumb presentational components in `src/components/`, one client component in `src/app/page.tsx` holding selection state. The chart is keyed by generation with only Gen 6+ populated, so later generations are a data change rather than a refactor. Effectiveness computation is separated from rendering so it can be unit tested without a DOM.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, CSS Modules, Vitest (added by this plan).

## Global Constraints

- Target viewport is **537×412 CSS px** — landscape, measured on device in issue #1. Never reintroduce the old 360×413 estimate.
- Vertical budget: 44px search + 144px grid + 224px buckets = 412px. Must not scroll in either axis.
- Layout must be fluid, not fixed-pixel, so the ~58px reclaimed by standalone PWA install is absorbed gracefully.
- Grid is 6 columns × 3 rows, chips roughly 89×48px, labelled with 3–4 letter abbreviations.
- Selection caps at two. A third tap is ignored. Tapping a lit chip deselects it. A clear-all control sits by the search bar.
- Buckets run descending 4× → 2× → 1× → ½× → ¼× → 0×, neutral in its natural sorted position. **Empty buckets stay visible** so positions never shift.
- Search box is rendered but non-functional in this slice.
- No Tailwind. CSS Modules only.
- Commit messages follow Conventional Commits.

---

### Task 1: Type vocabulary

**Files:**
- Create: `src/lib/pokemonTypes.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PokemonType` union, `TYPE_ORDER`, `TYPE_ABBREV`, `TYPE_LABEL`, `TYPE_COLOR`, `readableTextOn(hex: string): string`.

`TYPE_ORDER` is the canonical game order and lays out left-to-right, top-to-bottom into exactly the 6×3 grid the spec draws.

- [ ] **Step 1: Create the module**

```ts
export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

/** Canonical game order. Laid out 6-per-row this is exactly the grid in SPEC.md. */
export const TYPE_ORDER: readonly PokemonType[] = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export const TYPE_ABBREV: Record<PokemonType, string> = {
  normal: "NOR", fire: "FIR", water: "WAT", electric: "ELE",
  grass: "GRA", ice: "ICE", fighting: "FIG", poison: "PSN",
  ground: "GRD", flying: "FLY", psychic: "PSY", bug: "BUG",
  rock: "ROC", ghost: "GHO", dragon: "DRA", dark: "DAR",
  steel: "STE", fairy: "FAI",
};

export const TYPE_LABEL: Record<PokemonType, string> = {
  normal: "Normal", fire: "Fire", water: "Water", electric: "Electric",
  grass: "Grass", ice: "Ice", fighting: "Fighting", poison: "Poison",
  ground: "Ground", flying: "Flying", psychic: "Psychic", bug: "Bug",
  rock: "Rock", ghost: "Ghost", dragon: "Dragon", dark: "Dark",
  steel: "Steel", fairy: "Fairy",
};

export const TYPE_COLOR: Record<PokemonType, string> = {
  normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", electric: "#F7D02C",
  grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
  ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
  rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
  steel: "#B7B7CE", fairy: "#D685AD",
};

/** Type colours span a wide luminance range; pick a foreground that stays legible. */
export function readableTextOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.4 ? "#101010" : "#ffffff";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pokemonTypes.ts
git commit -m "feat: add Pokemon type vocabulary and colours"
```

---

### Task 2: Type chart data, effectiveness computation, and tests

**Files:**
- Create: `src/lib/typeChart.ts`
- Create: `src/lib/typeChart.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script and `vitest` devDependency)

**Interfaces:**
- Consumes: `PokemonType`, `TYPE_ORDER` from Task 1.
- Produces: `Generation`, `GenerationChart`, `TYPE_CHARTS`, `DEFAULT_GENERATION`, `effectivenessAgainst(defending, chart)`, `Bucket`, `BUCKET_STEPS`, `bucketize(defending, chart)`.

The chart stores only non-neutral matchups; anything absent is 1×. Keyed by generation so Gen 2–5 and Gen 1 slot in as data later.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest --no-audit --no-fund
```

- [ ] **Step 2: Add the test script to package.json**

Set `"test": "vitest run"` in `scripts`.

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { TYPE_ORDER } from "./pokemonTypes";
import {
  DEFAULT_GENERATION,
  TYPE_CHARTS,
  bucketize,
  effectivenessAgainst,
} from "./typeChart";

const chart = TYPE_CHARTS[DEFAULT_GENERATION];

describe("chart integrity", () => {
  it("covers all 18 types in Gen 6+", () => {
    expect(chart.types).toHaveLength(18);
    expect([...chart.types].sort()).toEqual([...TYPE_ORDER].sort());
  });

  it("only stores non-neutral matchups", () => {
    for (const entry of Object.values(chart.matchups)) {
      for (const value of Object.values(entry)) {
        expect(value).not.toBe(1);
      }
    }
  });
});

describe("effectivenessAgainst", () => {
  it("handles a mono type", () => {
    const e = effectivenessAgainst(["normal"], chart);
    expect(e.ghost).toBe(0);
    expect(e.rock).toBe(0.5);
    expect(e.steel).toBe(0.5);
    expect(e.water).toBe(1);
  });

  it("stacks dual types to 4x", () => {
    const e = effectivenessAgainst(["rock", "ground"], chart);
    expect(e.water).toBe(4);
    expect(e.grass).toBe(4);
  });

  it("stacks dual types to a quarter", () => {
    const e = effectivenessAgainst(["grass", "poison"], chart);
    expect(e.grass).toBe(0.25);
    expect(e.fire).toBe(2);
    expect(e.psychic).toBe(2);
    expect(e.flying).toBe(2);
  });

  it("lets an immunity win over a weakness", () => {
    const e = effectivenessAgainst(["rock", "ground"], chart);
    expect(e.electric).toBe(0);
  });

  it("applies immunity from either half of a dual type", () => {
    const e = effectivenessAgainst(["steel", "flying"], chart);
    expect(e.ground).toBe(0);
    expect(e.poison).toBe(0);
    expect(e.electric).toBe(1);
  });

  it("is order independent", () => {
    expect(effectivenessAgainst(["grass", "poison"], chart)).toEqual(
      effectivenessAgainst(["poison", "grass"], chart),
    );
  });

  it("returns all neutral for an empty selection", () => {
    const e = effectivenessAgainst([], chart);
    expect(Object.values(e).every((v) => v === 1)).toBe(true);
  });

  it("ignores a duplicated type", () => {
    expect(effectivenessAgainst(["fire", "fire"], chart)).toEqual(
      effectivenessAgainst(["fire"], chart),
    );
  });
});

describe("bucketize", () => {
  it("always returns six buckets in descending order", () => {
    const buckets = bucketize(["normal"], chart);
    expect(buckets.map((b) => b.multiplier)).toEqual([4, 2, 1, 0.5, 0.25, 0]);
  });

  it("keeps empty buckets so positions never shift", () => {
    const buckets = bucketize(["normal"], chart);
    expect(buckets.find((b) => b.multiplier === 4)!.types).toEqual([]);
    expect(buckets.find((b) => b.multiplier === 0)!.types).toEqual(["ghost"]);
  });

  it("places every type in exactly one bucket", () => {
    const buckets = bucketize(["grass", "poison"], chart);
    const all = buckets.flatMap((b) => b.types);
    expect(all).toHaveLength(18);
    expect(new Set(all).size).toBe(18);
  });

  it("orders types within a bucket by canonical type order", () => {
    const buckets = bucketize(["grass", "poison"], chart);
    const two = buckets.find((b) => b.multiplier === 2)!.types;
    expect(two).toEqual(["fire", "ice", "flying", "psychic"]);
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `typeChart.ts` does not exist.

- [ ] **Step 6: Write the implementation**

```ts
import { PokemonType, TYPE_ORDER } from "./pokemonTypes";

/** Only 0, 0.5 and 2 are ever stored; 1 is implied by absence. */
export type Matchup = 0 | 0.5 | 2;

export type MatchupTable = Record<PokemonType, Partial<Record<PokemonType, Matchup>>>;

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
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
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
    let multiplier = 1;
    for (const target of unique) {
      multiplier *= chart.matchups[attacking][target] ?? 1;
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
 * Always returns all six buckets, including empty ones, so bucket positions
 * stay fixed between lookups and can be learned by muscle memory.
 */
export function bucketize(
  defending: readonly PokemonType[],
  chart: GenerationChart,
): Bucket[] {
  const effectiveness = effectivenessAgainst(defending, chart);
  return BUCKET_STEPS.map((multiplier) => ({
    multiplier,
    label: BUCKET_LABELS[multiplier],
    types: chart.types.filter((t) => effectiveness[t] === multiplier),
  }));
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 14 tests.

- [ ] **Step 8: Commit**

```bash
git add src/lib/typeChart.ts src/lib/typeChart.test.ts vitest.config.ts package.json package-lock.json
git commit -m "feat: add Gen 6+ type chart and effectiveness computation"
```

---

### Task 3: TypeChip and TypeGrid

**Files:**
- Create: `src/components/TypeChip.tsx`, `src/components/TypeChip.module.css`
- Create: `src/components/TypeGrid.tsx`, `src/components/TypeGrid.module.css`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `<TypeChip type size onClick selected dimmed />`, `<TypeGrid selected onToggle />`.

`TypeChip` is shared by the grid and the buckets so colour and label logic exist once. It renders a `<button>` when given `onClick`, otherwise a `<span>`.

- [ ] **Step 1: Create TypeChip**

```tsx
import { CSSProperties } from "react";
import {
  PokemonType,
  TYPE_ABBREV,
  TYPE_COLOR,
  TYPE_LABEL,
  readableTextOn,
} from "@/lib/pokemonTypes";
import styles from "./TypeChip.module.css";

type Props = {
  type: PokemonType;
  size?: "grid" | "bucket";
  selected?: boolean;
  onClick?: () => void;
};

export function TypeChip({ type, size = "bucket", selected, onClick }: Props) {
  const background = TYPE_COLOR[type];
  const style: CSSProperties = {
    background,
    color: readableTextOn(background),
  };
  const className = [
    styles.chip,
    size === "grid" ? styles.grid : styles.bucket,
    selected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!onClick) {
    return (
      <span className={className} style={style}>
        {TYPE_ABBREV[type]}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={TYPE_LABEL[type]}
    >
      {TYPE_ABBREV[type]}
    </button>
  );
}
```

- [ ] **Step 2: Create TypeChip.module.css**

```css
.chip {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  font-family: inherit;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
}

.grid {
  width: 100%;
  height: 100%;
  min-height: 40px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 90ms linear, box-shadow 90ms linear;
}

.grid.selected {
  opacity: 1;
  box-shadow:
    0 0 0 2px var(--background),
    0 0 0 4px currentColor;
}

.bucket {
  padding: 3px 7px;
  font-size: 12px;
}
```

Unselected grid chips are dimmed rather than greyed so the colour stays recognisable while selection remains obvious.

- [ ] **Step 3: Create TypeGrid**

```tsx
import { PokemonType, TYPE_ORDER } from "@/lib/pokemonTypes";
import { TypeChip } from "./TypeChip";
import styles from "./TypeGrid.module.css";

type Props = {
  selected: readonly PokemonType[];
  onToggle: (type: PokemonType) => void;
};

export function TypeGrid({ selected, onToggle }: Props) {
  return (
    <div className={styles.grid} role="group" aria-label="Defending types">
      {TYPE_ORDER.map((type) => (
        <TypeChip
          key={type}
          type={type}
          size="grid"
          selected={selected.includes(type)}
          onClick={() => onToggle(type)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create TypeGrid.module.css**

```css
.grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 1fr;
  gap: 6px;
  min-height: 0;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/TypeChip.tsx src/components/TypeChip.module.css src/components/TypeGrid.tsx src/components/TypeGrid.module.css
git commit -m "feat: add type chip and 6x3 type grid"
```

---

### Task 4: EffectivenessBuckets

**Files:**
- Create: `src/components/EffectivenessBuckets.tsx`, `src/components/EffectivenessBuckets.module.css`

**Interfaces:**
- Consumes: `Bucket` from Task 2, `TypeChip` from Task 3.
- Produces: `<EffectivenessBuckets buckets />`.

- [ ] **Step 1: Create the component**

```tsx
import { Bucket } from "@/lib/typeChart";
import { TypeChip } from "./TypeChip";
import styles from "./EffectivenessBuckets.module.css";

type Props = { buckets: Bucket[] };

export function EffectivenessBuckets({ buckets }: Props) {
  return (
    <div className={styles.buckets}>
      {buckets.map((bucket) => (
        <div
          key={bucket.multiplier}
          className={styles.row}
          data-empty={bucket.types.length === 0}
        >
          <span className={styles.multiplier}>{bucket.label}</span>
          <div className={styles.types}>
            {bucket.types.map((type) => (
              <TypeChip key={type} type={type} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create EffectivenessBuckets.module.css**

```css
.buckets {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-height: 0;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-height: 26px;
  padding: 3px 0;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: none;
}

.multiplier {
  flex: 0 0 30px;
  font-family: var(--font-geist-mono), ui-monospace, monospace;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: var(--muted);
}

.row[data-empty="false"] .multiplier {
  color: var(--foreground);
}

.types {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EffectivenessBuckets.tsx src/components/EffectivenessBuckets.module.css
git commit -m "feat: add defensive effectiveness buckets"
```

---

### Task 5: Compose the home screen

**Files:**
- Modify: `src/app/page.tsx` (replaces the viewport readout from issue #1)
- Modify: `src/app/page.module.css`

**Interfaces:**
- Consumes: everything above.
- Produces: the app's home screen.

Selection state lives here. The cap is enforced on the way in: a third tap returns the existing selection unchanged.

- [ ] **Step 1: Rewrite page.tsx**

```tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { EffectivenessBuckets } from "@/components/EffectivenessBuckets";
import { TypeGrid } from "@/components/TypeGrid";
import { PokemonType } from "@/lib/pokemonTypes";
import { DEFAULT_GENERATION, TYPE_CHARTS, bucketize } from "@/lib/typeChart";
import styles from "./page.module.css";

const MAX_SELECTED = 2;

export default function Home() {
  const [selected, setSelected] = useState<PokemonType[]>([]);

  const toggle = useCallback((type: PokemonType) => {
    setSelected((current) => {
      if (current.includes(type)) return current.filter((t) => t !== type);
      // Third tap is ignored rather than replacing an existing pick.
      if (current.length >= MAX_SELECTED) return current;
      return [...current, type];
    });
  }, []);

  const buckets = useMemo(
    () => bucketize(selected, TYPE_CHARTS[DEFAULT_GENERATION]),
    [selected],
  );

  return (
    <main className={styles.page}>
      <div className={styles.searchRow}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search Pokémon…"
          aria-label="Search Pokémon"
          disabled
        />
        <button
          type="button"
          className={styles.clear}
          onClick={() => setSelected([])}
          disabled={selected.length === 0}
        >
          Clear
        </button>
      </div>

      <TypeGrid selected={selected} onToggle={toggle} />

      <EffectivenessBuckets buckets={buckets} />
    </main>
  );
}
```

- [ ] **Step 2: Rewrite page.module.css**

The three-row grid is the vertical budget expressed directly: fixed search row, grid sized to its content, buckets taking the rest.

```css
.page {
  display: grid;
  grid-template-rows: auto 144px 1fr;
  gap: 8px;
  flex: 1;
  min-height: 0;
  padding: 8px;
  padding-top: max(8px, env(safe-area-inset-top));
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}

.searchRow {
  display: flex;
  gap: 6px;
  align-items: center;
}

.search {
  flex: 1;
  min-width: 0;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: #0d0d0d;
  color: var(--foreground);
  font-family: inherit;
  font-size: 14px;
}

.search::placeholder {
  color: var(--muted);
}

.search:disabled {
  opacity: 0.6;
}

.clear {
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--foreground);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.clear:disabled {
  color: var(--muted);
  cursor: default;
}
```

- [ ] **Step 3: Verify the build and layout**

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
```

Expected: all pass, static export written to `out/`.

Then serve `out/` and confirm at 537×412 that `document.documentElement.scrollHeight === clientHeight` and `scrollWidth === clientWidth` — no scrolling in either axis.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/app/page.module.css
git commit -m "feat: compose type chart home screen"
```

---

## Self-Review

**Spec coverage** — every acceptance criterion in issue #2 maps to a task: chart keyed by generation (Task 2), computation with all six multipliers (Task 2), unit tests covering dual stacking, immunities, 4× and ¼× (Task 2), 6×3 grid of abbreviated chips (Task 3), two-type cap with deselect and clear-all (Tasks 3 and 5), mono-type correctness (Task 2 test), six buckets with empties preserved (Tasks 2 and 4), fits 537×412 without scrolling (Task 5), fluid layout (Task 5, `1fr` bucket row).

**Placeholders** — none; every step carries complete code.

**Type consistency** — `bucketize` returns `Bucket[]`, consumed as `buckets: Bucket[]` in Task 4. `TypeChip` props match both call sites. `effectivenessAgainst` and `bucketize` share the `(defending, chart)` argument order throughout.
