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
