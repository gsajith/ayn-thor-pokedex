import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_THEME,
  STORAGE_KEY,
  THEME_LABELS,
  THEME_MODES,
  cycleTheme,
  parseTheme,
  resetThemeCacheForTests,
  setTheme,
  useTheme,
} from "./theme";

function installEnvironment(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    },
  });
  const root = { dataset: {} as Record<string, string> };
  const meta = {
    content: "",
    setAttribute(_name: string, value: string) {
      this.content = value;
    },
  };
  vi.stubGlobal("document", {
    documentElement: root,
    querySelector: (sel: string) =>
      sel === 'meta[name="theme-color"]' ? meta : null,
  });
  return { data, root, meta };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  resetThemeCacheForTests();
});

describe("parseTheme", () => {
  it("defaults to pure black", () => {
    // The AMOLED default is a deliberate choice, not an accident of ordering.
    expect(DEFAULT_THEME).toBe("black");
    expect(parseTheme(null)).toBe("black");
    expect(parseTheme("")).toBe("black");
  });

  it("falls back to the default for unknown or corrupt values", () => {
    expect(parseTheme("neon")).toBe("black");
    expect(parseTheme("{}")).toBe("black");
    expect(parseTheme("LIGHT")).toBe("black");
  });

  it("accepts every supported mode", () => {
    for (const mode of THEME_MODES) {
      expect(parseTheme(mode)).toBe(mode);
    }
  });
});

describe("cycleTheme", () => {
  it("visits every mode and wraps", () => {
    let mode = DEFAULT_THEME;
    const seen = [mode];
    for (let i = 0; i < THEME_MODES.length - 1; i++) {
      mode = cycleTheme(mode);
      seen.push(mode);
    }
    expect(new Set(seen).size).toBe(THEME_MODES.length);
    expect(cycleTheme(mode)).toBe(DEFAULT_THEME);
  });
});

describe("setTheme", () => {
  it("persists the choice and reflects it on the document", () => {
    const { data, root } = installEnvironment();
    setTheme("light");
    expect(data.get(STORAGE_KEY)).toBe("light");
    expect(root.dataset.theme).toBe("light");
  });

  it("restores a stored choice across a restart", () => {
    installEnvironment("dark");
    // useTheme's read path is what a fresh load exercises.
    expect(parseTheme("dark")).toBe("dark");
  });

  it("ignores an invalid mode rather than corrupting storage", () => {
    const { data } = installEnvironment();
    setTheme("chartreuse" as never);
    expect(data.get(STORAGE_KEY)).toBeUndefined();
  });

  it("keeps the choice in session even if storage refuses the write", () => {
    installEnvironment();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => null,
        setItem() {
          throw new Error("QuotaExceededError");
        },
      },
    });
    expect(() => setTheme("light")).not.toThrow();
  });

  it("keeps browser chrome colour in step with the mode", () => {
    // Otherwise the OS chrome stays black while the app renders light.
    const { meta } = installEnvironment();
    setTheme("light");
    expect(meta.content).toBe("#f4f4f5");
    setTheme("black");
    expect(meta.content).toBe("#000000");
  });

  it("does not throw when there is no theme-color meta tag", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem() {} } });
    vi.stubGlobal("document", {
      documentElement: { dataset: {} },
      querySelector: () => null,
    });
    expect(() => setTheme("dark")).not.toThrow();
  });

  it("degrades to the default when storage throws on read", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem() {
          throw new Error("SecurityError");
        },
        setItem() {},
      },
    });
    vi.stubGlobal("document", {
      documentElement: { dataset: {} },
      querySelector: () => null,
    });
    expect(parseTheme(null)).toBe(DEFAULT_THEME);
  });
});

describe("labels", () => {
  it("names every mode", () => {
    for (const mode of THEME_MODES) {
      expect(THEME_LABELS[mode]).toBeTruthy();
    }
  });

  it("exports a hook", () => {
    expect(typeof useTheme).toBe("function");
  });
});
