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

  it("defines a matchup row for every attacking type", () => {
    for (const type of TYPE_ORDER) {
      expect(chart.matchups[type]).toBeDefined();
    }
  });

  it("only stores non-neutral matchups", () => {
    for (const entry of Object.values(chart.matchups)) {
      for (const value of Object.values(entry)) {
        expect(value).not.toBe(1);
      }
    }
  });

  it("has exactly the eight Gen 6+ immunities", () => {
    const immunities: string[] = [];
    for (const [attacking, entry] of Object.entries(chart.matchups)) {
      for (const [defending, value] of Object.entries(entry)) {
        if (value === 0) immunities.push(`${attacking}->${defending}`);
      }
    }
    expect(immunities.sort()).toEqual(
      [
        "normal->ghost",
        "fighting->ghost",
        "poison->steel",
        "ground->flying",
        "electric->ground",
        "psychic->dark",
        "ghost->normal",
        "dragon->fairy",
      ].sort(),
    );
  });
});

// Cross-checks against well-known Pokemon, to catch data entry errors that
// self-consistent tests would miss.
describe("known Pokemon matchups", () => {
  it("Charizard (fire/flying) takes 4x from rock and nothing from ground", () => {
    const e = effectivenessAgainst(["fire", "flying"], chart);
    expect(e.rock).toBe(4);
    expect(e.ground).toBe(0);
    expect(e.water).toBe(2);
    expect(e.electric).toBe(2);
    expect(e.grass).toBe(0.25);
    expect(e.bug).toBe(0.25);
  });

  it("Sableye (dark/ghost) is immune to normal, fighting and psychic", () => {
    const e = effectivenessAgainst(["dark", "ghost"], chart);
    expect(e.normal).toBe(0);
    expect(e.fighting).toBe(0);
    expect(e.psychic).toBe(0);
    // Fairy is the weakness Gen 6 introduced for this otherwise unhittable pair.
    expect(e.fairy).toBe(2);
  });

  it("Bulbasaur (grass/poison) takes a quarter from grass", () => {
    const e = effectivenessAgainst(["grass", "poison"], chart);
    expect(e.grass).toBe(0.25);
    expect(e.fighting).toBe(0.5);
    expect(e.water).toBe(0.5);
    expect(e.ground).toBe(1);
  });

  it("Magnezone (electric/steel) resists a great deal and dies to ground", () => {
    const e = effectivenessAgainst(["electric", "steel"], chart);
    expect(e.ground).toBe(4);
    expect(e.fighting).toBe(2);
    expect(e.fire).toBe(2);
    expect(e.poison).toBe(0);
    // Only Steel halves Grass here; Electric is neutral to it.
    expect(e.grass).toBe(0.5);
    expect(e.flying).toBe(0.25);
  });
});

describe("effectivenessAgainst", () => {
  it("handles a mono type", () => {
    const e = effectivenessAgainst(["normal"], chart);
    expect(e.fighting).toBe(2);
    expect(e.ghost).toBe(0);
    // Normal resists nothing, so everything else is neutral.
    expect(e.water).toBe(1);
    expect(e.steel).toBe(1);
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
    // Skarmory: Ground is nullified by Flying, Poison by Steel.
    const e = effectivenessAgainst(["steel", "flying"], chart);
    expect(e.ground).toBe(0);
    expect(e.poison).toBe(0);
    // Steel does not resist Electric, so Flying's weakness stands.
    expect(e.electric).toBe(2);
    expect(e.fire).toBe(2);
    expect(e.grass).toBe(0.25);
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

  it("gives a value for every one of the 18 attacking types", () => {
    const e = effectivenessAgainst(["water"], chart);
    expect(Object.keys(e)).toHaveLength(18);
  });
});

describe("bucketize", () => {
  it("always returns six buckets in descending order", () => {
    const buckets = bucketize(["normal"], chart);
    expect(buckets.map((b) => b.multiplier)).toEqual([4, 2, 1, 0.5, 0.25, 0]);
  });

  it("labels buckets with fraction glyphs", () => {
    const buckets = bucketize(["normal"], chart);
    expect(buckets.map((b) => b.label)).toEqual([
      "4×",
      "2×",
      "1×",
      "½×",
      "¼×",
      "0×",
    ]);
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

  it("puts everything in the neutral bucket when nothing is selected", () => {
    const buckets = bucketize([], chart);
    expect(buckets.find((b) => b.multiplier === 1)!.types).toHaveLength(18);
  });

  it("never drops a type, even beyond the two-type cap", () => {
    // Three types can produce 8x or 0.125x, which match no canonical step.
    const buckets = bucketize(["rock", "ground", "fire"], chart);
    const all = buckets.flatMap((b) => b.types);
    expect(all).toHaveLength(18);
    expect(new Set(all).size).toBe(18);
    // Water is 2 * 2 * 2 = 8x here, and snaps to the 4x bucket rather than vanishing.
    expect(buckets.find((b) => b.multiplier === 4)!.types).toContain("water");
  });

  it("keeps a true immunity distinct from a very small multiplier", () => {
    const buckets = bucketize(["rock", "ground", "flying"], chart);
    // Electric is 1 * 0 * 2 = 0, a real immunity.
    expect(buckets.find((b) => b.multiplier === 0)!.types).toContain(
      "electric",
    );
  });

  it("never rounds a small non-zero multiplier down to an immunity", () => {
    // Bug is resisted by all three, giving 0.5^3 = 0.125 — exactly equidistant
    // between the 0.25 and 0 steps. Reporting it as an immunity would be a
    // materially wrong answer, so it must land in the quarter bucket.
    const buckets = bucketize(["fire", "fighting", "poison"], chart);
    expect(buckets.find((b) => b.multiplier === 0.25)!.types).toContain("bug");
    expect(buckets.find((b) => b.multiplier === 0)!.types).not.toContain("bug");
  });
});
