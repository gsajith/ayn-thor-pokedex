import { beforeEach, describe, expect, it, vi } from "vitest";
import { SPECIES } from "./species";
import {
  STORAGE_KEY,
  clearAllOverrides,
  clearOverride,
  getOverrides,
  importOverrides,
  parseOverrides,
  resetOverridesCacheForTests,
  resolveSpecies,
  setOverride,
} from "./overrides";

function installStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  };
  vi.stubGlobal("window", { localStorage: storage });
  return storage;
}

const bulbasaur = SPECIES.find((s) => s.id === 1)!;

beforeEach(() => {
  vi.unstubAllGlobals();
  resetOverridesCacheForTests();
});

describe("parseOverrides", () => {
  it("returns an empty map for missing or unparseable storage", () => {
    expect(parseOverrides(null)).toEqual({});
    expect(parseOverrides("")).toEqual({});
    expect(parseOverrides("{ not json")).toEqual({});
    expect(parseOverrides("[1,2,3]")).toEqual({});
    expect(parseOverrides('"a string"')).toEqual({});
  });

  it("round-trips a valid entry", () => {
    const raw = JSON.stringify({ 1: { types: ["grass", "dark"], source: "manual" } });
    expect(parseOverrides(raw)).toEqual({
      1: { types: ["grass", "dark"], source: "manual" },
    });
  });

  it("drops a bad entry but keeps its valid siblings", () => {
    // One corrupt record must not cost the user every other correction.
    const raw = JSON.stringify({
      1: { types: ["grass", "dark"], source: "manual" },
      2: { types: ["not-a-type"], source: "manual" },
      3: { types: [], source: "manual" },
      4: { types: ["fire", "water", "ice"], source: "manual" },
      5: { types: ["fire"], source: "nonsense" },
      6: { types: ["fire", "fire"], source: "manual" },
      7: null,
      8: "nope",
      9: { types: ["ghost"], source: "imported" },
    });
    expect(parseOverrides(raw)).toEqual({
      1: { types: ["grass", "dark"], source: "manual" },
      9: { types: ["ghost"], source: "imported" },
    });
  });

  it("ignores non-numeric and non-positive keys", () => {
    const raw = JSON.stringify({
      abc: { types: ["fire"], source: "manual" },
      "-1": { types: ["fire"], source: "manual" },
      0: { types: ["fire"], source: "manual" },
    });
    expect(parseOverrides(raw)).toEqual({});
  });
});

describe("store", () => {
  it("persists a correction to storage", () => {
    const storage = installStorage();
    setOverride(1, ["grass", "dark"]);
    expect(getOverrides()[1]).toEqual({
      types: ["grass", "dark"],
      source: "manual",
    });
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!)).toEqual({
      1: { types: ["grass", "dark"], source: "manual" },
    });
  });

  it("survives a restart by reloading from storage", () => {
    installStorage({
      [STORAGE_KEY]: JSON.stringify({
        25: { types: ["electric", "steel"], source: "manual" },
      }),
    });
    expect(getOverrides()[25].types).toEqual(["electric", "steel"]);
  });

  it("reverts a single override without touching the others", () => {
    installStorage();
    setOverride(1, ["grass", "dark"]);
    setOverride(4, ["fire", "ghost"]);
    clearOverride(1);
    expect(getOverrides()[1]).toBeUndefined();
    expect(getOverrides()[4].types).toEqual(["fire", "ghost"]);
  });

  it("clears everything, which is what switching hacks needs", () => {
    installStorage();
    setOverride(1, ["grass", "dark"]);
    setOverride(4, ["fire", "ghost"]);
    clearAllOverrides();
    expect(getOverrides()).toEqual({});
  });

  it("records provenance for bulk imports", () => {
    installStorage();
    importOverrides({ 1: ["grass", "dark"], 7: ["water", "fairy"] });
    expect(getOverrides()[1].source).toBe("imported");
    expect(getOverrides()[7].source).toBe("imported");
  });

  it("skips invalid rows during a bulk import", () => {
    installStorage();
    importOverrides({
      1: ["grass", "dark"],
      2: ["bogus"] as never,
      3: [] as never,
    });
    expect(Object.keys(getOverrides())).toEqual(["1"]);
  });

  it("keeps a manual edit distinguishable from an imported one", () => {
    installStorage();
    setOverride(1, ["grass", "dark"], "manual");
    importOverrides({ 4: ["fire", "ghost"] });
    expect(getOverrides()[1].source).toBe("manual");
    expect(getOverrides()[4].source).toBe("imported");
  });

  it("degrades to vanilla when storage itself throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem() {
          throw new Error("SecurityError");
        },
        setItem() {
          throw new Error("SecurityError");
        },
      },
    });
    expect(() => getOverrides()).not.toThrow();
    expect(getOverrides()).toEqual({});
  });

  it("keeps an edit in memory even if it cannot be persisted", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem() {
          throw new Error("QuotaExceededError");
        },
      },
    });
    expect(() => setOverride(1, ["grass", "dark"])).not.toThrow();
    expect(getOverrides()[1].types).toEqual(["grass", "dark"]);
  });
});

describe("resolveSpecies", () => {
  it("returns vanilla data untouched when there is no override", () => {
    const resolved = resolveSpecies(bulbasaur, {});
    expect(resolved.types).toEqual(["grass", "poison"]);
    expect(resolved.overridden).toBe(false);
    expect(resolved.label).toBe("Bulbasaur");
  });

  it("substitutes corrected types and flags the species", () => {
    const resolved = resolveSpecies(bulbasaur, {
      1: { types: ["grass", "dark"], source: "manual" },
    });
    expect(resolved.types).toEqual(["grass", "dark"]);
    expect(resolved.overridden).toBe(true);
    expect(resolved.overrideSource).toBe("manual");
    // Everything else is still the bundled record.
    expect(resolved.id).toBe(1);
    expect(resolved.accent).toBe(bulbasaur.accent);
  });

  it("does not mutate the input species", () => {
    const before = [...bulbasaur.types];
    resolveSpecies(bulbasaur, { 1: { types: ["ghost"], source: "manual" } });
    expect(bulbasaur.types).toEqual(before);
  });
});
