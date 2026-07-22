import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  getGeneration,
  parseGeneration,
  resetGenerationCacheForTests,
  setGeneration,
} from "./generation";
import { DEFAULT_GENERATION, GENERATION_OPTIONS } from "./typeChart";

function installStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    },
  });
  return data;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  resetGenerationCacheForTests();
});

describe("parseGeneration", () => {
  it("returns the default for absent or empty storage", () => {
    expect(parseGeneration(null)).toBe(DEFAULT_GENERATION);
    expect(parseGeneration("")).toBe(DEFAULT_GENERATION);
  });

  it("returns the default for an unknown id", () => {
    expect(parseGeneration("gen9000")).toBe(DEFAULT_GENERATION);
  });

  it("returns a stored available id", () => {
    expect(parseGeneration("gen6plus")).toBe("gen6plus");
  });

  it("rejects a declared but unavailable id", () => {
    // Honouring one would select a chart whose matchup data does not exist.
    const unavailable = GENERATION_OPTIONS.find((option) => !option.available);
    expect(unavailable).toBeDefined();
    expect(parseGeneration(unavailable!.id)).toBe(DEFAULT_GENERATION);
  });
});

describe("reading", () => {
  it("returns the default with no window", () => {
    expect(getGeneration()).toBe(DEFAULT_GENERATION);
  });

  it("reads a persisted choice", () => {
    installStorage("gen6plus");
    expect(getGeneration()).toBe("gen6plus");
  });

  it("returns the default when storage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem() {
          throw new Error("blocked");
        },
        setItem() {},
      },
    });
    expect(getGeneration()).toBe(DEFAULT_GENERATION);
  });
});

describe("setGeneration", () => {
  it("persists an available generation", () => {
    const data = installStorage();
    setGeneration("gen6plus");
    expect(data.get(STORAGE_KEY)).toBe("gen6plus");
    expect(getGeneration()).toBe("gen6plus");
  });

  it("refuses an unavailable generation and leaves the current one", () => {
    const data = installStorage();
    const unavailable = GENERATION_OPTIONS.find((option) => !option.available);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    setGeneration(unavailable!.id);
    expect(data.has(STORAGE_KEY)).toBe(false);
    expect(getGeneration()).toBe(DEFAULT_GENERATION);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("keeps the in-session choice when persisting throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem() {
          throw new Error("quota");
        },
      },
    });
    setGeneration("gen6plus");
    expect(getGeneration()).toBe("gen6plus");
  });
});
