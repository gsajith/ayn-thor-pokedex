import { describe, expect, it } from "vitest";
import { SPECIES } from "./species";
import { SEARCH_LIMIT, searchSpecies } from "./speciesSearch";

const names = (query: string, limit?: number) =>
  searchSpecies(query, limit).map((s) => s.name);

describe("species data", () => {
  it("covers the full national dex", () => {
    expect(SPECIES).toHaveLength(1025);
    expect(SPECIES[0]).toMatchObject({ id: 1, name: "bulbasaur" });
    expect(SPECIES.at(-1)!.id).toBe(1025);
  });

  it("has unique, ascending ids and one or two types each", () => {
    const ids = SPECIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id, i) => i === 0 || id > ids[i - 1])).toBe(true);
    expect(
      SPECIES.every((s) => s.types.length >= 1 && s.types.length <= 2),
    ).toBe(true);
  });

  it("orders dual types with the primary type first", () => {
    expect(SPECIES.find((s) => s.name === "bulbasaur")!.types).toEqual([
      "grass",
      "poison",
    ]);
    expect(SPECIES.find((s) => s.name === "charizard")!.types).toEqual([
      "fire",
      "flying",
    ]);
  });

  it("excludes alternate forms", () => {
    expect(SPECIES.every((s) => s.id < 10000)).toBe(true);
    expect(SPECIES.some((s) => s.name.includes("-mega"))).toBe(false);
  });

  it("uses species names, not form names", () => {
    // The type endpoints key on forms, so names arrive as "deoxys-normal",
    // "aegislash-shield", "maushold-family-of-four". The build script resolves
    // them against the species endpoint; this guards that from regressing.
    const expected: Record<number, string> = {
      386: "deoxys",
      413: "wormadam",
      487: "giratina",
      492: "shaymin",
      550: "basculin",
      555: "darmanitan",
      641: "tornadus",
      681: "aegislash",
      741: "oricorio",
      745: "lycanroc",
      849: "toxtricity",
      877: "morpeko",
      892: "urshifu",
      925: "maushold",
    };
    for (const [id, name] of Object.entries(expected)) {
      expect(SPECIES.find((s) => s.id === Number(id))!.name).toBe(name);
    }
  });

  it("gives every species a valid accent colour", () => {
    for (const species of SPECIES) {
      expect(species.accent, species.name).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it("extracts accents that are distinct rather than muddy", () => {
    // A naive average would collapse every sprite to the same brown-grey, so
    // assert the population is actually varied and saturated.
    const distinct = new Set(SPECIES.map((s) => s.accent));
    expect(distinct.size).toBeGreaterThan(SPECIES.length * 0.8);

    const saturation = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const max = Math.max(r, g, b);
      return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
    };
    const grey = SPECIES.filter((s) => saturation(s.accent) < 0.15);
    expect(grey.length).toBeLessThan(20);
  });

  it("extracts recognisable accents for well-known sprites", () => {
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map(
        (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
      );
      const max = Math.max(r, g, b);
      const delta = max - Math.min(r, g, b);
      if (delta === 0) return -1;
      let h: number;
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
      return Math.round(h * 60 + 360) % 360;
    };
    const accentOf = (id: number) => SPECIES.find((s) => s.id === id)!.accent;

    // Charmander and Charizard are orange.
    expect(hue(accentOf(4))).toBeGreaterThanOrEqual(10);
    expect(hue(accentOf(4))).toBeLessThanOrEqual(45);
    expect(hue(accentOf(6))).toBeGreaterThanOrEqual(10);
    expect(hue(accentOf(6))).toBeLessThanOrEqual(45);
    // Pikachu is yellow.
    expect(hue(accentOf(25))).toBeGreaterThanOrEqual(45);
    expect(hue(accentOf(25))).toBeLessThanOrEqual(70);
    // Lucario is blue.
    expect(hue(accentOf(448))).toBeGreaterThanOrEqual(180);
    expect(hue(accentOf(448))).toBeLessThanOrEqual(250);
  });

  it("renders awkward names readably", () => {
    const label = (name: string) =>
      SPECIES.find((s) => s.name === name)?.label;
    expect(label("ho-oh")).toBe("Ho-Oh");
    expect(label("mr-mime")).toBe("Mr. Mime");
    expect(label("nidoran-f")).toBe("Nidoran♀");
    expect(label("farfetchd")).toBe("Farfetch'd");
    expect(label("type-null")).toBe("Type: Null");
  });
});

describe("searchSpecies", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(searchSpecies("")).toEqual([]);
    expect(searchSpecies("   ")).toEqual([]);
  });

  it("ranks an exact match first", () => {
    expect(names("pikachu")[0]).toBe("pikachu");
    // Exact wins even though other species share the prefix.
    expect(names("dragonite")[0]).toBe("dragonite");
  });

  it("returns prefix matches in dex order", () => {
    const result = names("char");
    expect(result.slice(0, 3)).toEqual([
      "charmander",
      "charmeleon",
      "charizard",
    ]);
  });

  it("is case insensitive", () => {
    expect(names("PIKACHU")[0]).toBe("pikachu");
    expect(names("ChAr").slice(0, 1)).toEqual(["charmander"]);
  });

  it("matches on the display label as well as the slug", () => {
    // Label is "Mr. Mime"; the slug is "mr-mime".
    expect(names("mr.")).toContain("mr-mime");
  });

  it("rescues a misspelling that prefix matching alone would miss", () => {
    // No species starts with "charzrd", so this can only come from fuzzy.
    expect(names("charzrd")).toContain("charizard");
    expect(names("pikchu")).toContain("pikachu");
  });

  it("does not let fuzzy scoring displace a correctly typed query", () => {
    // "bulba" is a clean prefix; the first result must be the prefix match.
    expect(names("bulba")[0]).toBe("bulbasaur");
    expect(names("squirt")[0]).toBe("squirtle");
  });

  it("respects the result limit", () => {
    expect(searchSpecies("a").length).toBeLessThanOrEqual(SEARCH_LIMIT);
    expect(searchSpecies("a", 5)).toHaveLength(5);
  });

  it("never returns duplicates", () => {
    const result = searchSpecies("char");
    expect(new Set(result.map((s) => s.id)).size).toBe(result.length);
  });

  it("returns an empty list for a query that matches nothing", () => {
    expect(searchSpecies("zzzzzzqqqq")).toEqual([]);
  });
});
