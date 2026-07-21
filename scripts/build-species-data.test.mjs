import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { extractAccent, fetchWithRetry } from "./build-species-data.mjs";

/**
 * Builds a PNG in memory from a pixel-painting callback, so these tests
 * exercise the extraction logic itself rather than asserting properties of the
 * already-committed species data.
 */
function makePng(width, height, paint) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const [r, g, b, a] = paint(x, y);
      png.data[offset] = r;
      png.data[offset + 1] = g;
      png.data[offset + 2] = b;
      png.data[offset + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

const rgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

describe("extractAccent", () => {
  it("returns an uppercase six-digit hex colour", () => {
    const png = makePng(8, 8, () => [200, 30, 30, 255]);
    expect(extractAccent(png)).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("finds the dominant colour of a solid sprite", () => {
    const png = makePng(8, 8, () => [200, 30, 30, 255]);
    const [r, g, b] = rgb(extractAccent(png));
    expect(r).toBeGreaterThan(150);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(80);
  });

  it("ignores transparent pixels rather than averaging them in", () => {
    // A small opaque red blob on a large transparent field. Counting the
    // transparent pixels would drag the result towards black.
    const png = makePng(16, 16, (x, y) =>
      x < 4 && y < 4 ? [200, 30, 30, 255] : [0, 0, 0, 0],
    );
    const [r, g, b] = rgb(extractAccent(png));
    expect(r).toBeGreaterThan(150);
    expect(g).toBeLessThan(80);
    expect(b).toBeLessThan(80);
  });

  it("lets a small vivid area outrank a large dull one", () => {
    // 75% near-black outline, 25% vivid green. An unweighted vote would pick
    // the outline; saturation weighting must pick the green.
    const png = makePng(16, 16, (x, y) =>
      x < 8 && y < 8 ? [40, 200, 60, 255] : [12, 12, 14, 255],
    );
    const [r, g, b] = rgb(extractAccent(png));
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(120);
  });

  it("does not let near-white highlights dominate", () => {
    const png = makePng(16, 16, (x, y) =>
      x < 6 ? [30, 80, 220, 255] : [250, 250, 250, 255],
    );
    const [r, g, b] = rgb(extractAccent(png));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it("still resolves a fully greyscale sprite via relaxed filters", () => {
    const png = makePng(8, 8, () => [130, 130, 130, 255]);
    const accent = extractAccent(png);
    expect(accent).toMatch(/^#[0-9A-F]{6}$/);
    const [r, g, b] = rgb(accent);
    // Grey in, grey out — but a real colour, not the hard-coded fallback path.
    expect(Math.abs(r - g)).toBeLessThan(12);
    expect(Math.abs(g - b)).toBeLessThan(12);
  });

  it("falls back rather than throwing on a fully transparent sprite", () => {
    const png = makePng(8, 8, () => [0, 0, 0, 0]);
    expect(extractAccent(png)).toBe("#808080");
  });

  it("keeps every channel inside 0-255", () => {
    const png = makePng(8, 8, () => [255, 255, 0, 255]);
    const [r, g, b] = rgb(extractAccent(png));
    for (const channel of [r, g, b]) {
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });

  it("names the offending file when a buffer is not a PNG", () => {
    const garbage = Buffer.from("definitely not a png");
    expect(() => extractAccent(garbage, "sprite 6 (charizard) at /x/6.png"))
      .toThrow(/sprite 6 \(charizard\) at \/x\/6\.png: cannot decode PNG/);
  });
});

describe("fetchWithRetry", () => {
  const withStubbedFetch = async (impl, run) => {
    const original = globalThis.fetch;
    globalThis.fetch = impl;
    try {
      return await run();
    } finally {
      globalThis.fetch = original;
    }
  };

  it("returns the response on success without retrying", async () => {
    let calls = 0;
    await withStubbedFetch(
      async () => {
        calls++;
        return new Response("ok", { status: 200 });
      },
      async () => {
        const res = await fetchWithRetry("https://example.test/a");
        expect(res.status).toBe(200);
      },
    );
    expect(calls).toBe(1);
  });

  it("does not retry a 404, which will never improve", async () => {
    let calls = 0;
    await withStubbedFetch(
      async () => {
        calls++;
        return new Response("no", { status: 404, statusText: "Not Found" });
      },
      async () => {
        await expect(fetchWithRetry("https://example.test/b")).rejects.toThrow(
          /404/,
        );
      },
    );
    // Previously the fast-fail throw was swallowed by its own catch and this
    // burned all four attempts.
    expect(calls).toBe(1);
  });

  it("retries a 500 and succeeds when the server recovers", async () => {
    let calls = 0;
    await withStubbedFetch(
      async () => {
        calls++;
        return calls < 3
          ? new Response("bad", { status: 500, statusText: "Server Error" })
          : new Response("ok", { status: 200 });
      },
      async () => {
        const res = await fetchWithRetry("https://example.test/c");
        expect(res.status).toBe(200);
      },
    );
    expect(calls).toBe(3);
  });

  it("retries a transport failure", async () => {
    let calls = 0;
    await withStubbedFetch(
      async () => {
        calls++;
        if (calls < 2) throw new TypeError("fetch failed");
        return new Response("ok", { status: 200 });
      },
      async () => {
        const res = await fetchWithRetry("https://example.test/d");
        expect(res.status).toBe(200);
      },
    );
    expect(calls).toBe(2);
  });

  it("gives up after the attempt limit and names the url", async () => {
    await withStubbedFetch(
      async () => new Response("bad", { status: 503, statusText: "Unavailable" }),
      async () => {
        await expect(
          fetchWithRetry("https://example.test/e", 2),
        ).rejects.toThrow(/example\.test\/e.*503/);
      },
    );
  });
});
