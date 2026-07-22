import { expect, test } from "@playwright/test";

/**
 * The type chart's layout invariants, swept across every selection state.
 *
 * The failure this guards against is not cosmetic. In #9 a wrapped second line
 * of chips painted into the next bucket's band, so a 1x type appeared to sit
 * in the 1/2x row — the chart confidently showed a wrong answer. The buckets
 * run on roughly 12px of headroom at 412px, so a modest change to a row
 * height, padding or font size can reintroduce that.
 *
 * Every assertion here was previously an ad-hoc script pasted into a console
 * once per PR, which is to say it was enforced by whether anyone remembered.
 */

/** Browser height, and the taller standalone-install height. */
const HEIGHTS = [412, 470];

type Violation = {
  state: string;
  height: number;
  problem: string;
  detail: string;
};

/**
 * Drives every selection state in-page and returns the violations.
 *
 * Deliberately one `evaluate` rather than a Playwright call per state: 171
 * states x two heights is 342 rounds, and at a few milliseconds of protocol
 * overhead each that turns a fast check into one nobody will run.
 */
async function sweep(page: import("@playwright/test").Page, height: number) {
  return page.evaluate(async (viewportHeight): Promise<Violation[]> => {
    const settle = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const chips = () =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('[class*="TypeGrid"] button'));
    const labels = chips().map((chip) => chip.getAttribute("aria-label") ?? "?");
    const clearSelection = () => {
      for (const chip of chips()) {
        if (chip.getAttribute("aria-pressed") === "true") chip.click();
      }
    };

    const violations: Violation[] = [];

    const inspect = (state: string) => {
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>('[class*="EffectivenessBuckets_row"]'),
      );

      if (rows.length !== 6) {
        violations.push({ state, height: viewportHeight, problem: "row count", detail: `${rows.length} rows` });
        return;
      }

      // The scrolling box is <body>, not <html>: `overflow-x: hidden` on body
      // makes it the scroller, so a documentElement check can never fire. An
      // earlier manual sweep read the wrong element and detected nothing.
      const vertical = document.body.scrollHeight - document.body.clientHeight;
      if (vertical > 0) {
        violations.push({ state, height: viewportHeight, problem: "page scrolls vertically", detail: `${vertical}px` });
      }
      const horizontal = document.body.scrollWidth - document.body.clientWidth;
      if (horizontal > 0) {
        violations.push({ state, height: viewportHeight, problem: "page scrolls horizontally", detail: `${horizontal}px` });
      }

      rows.forEach((row, index) => {
        const rowBox = row.getBoundingClientRect();

        if (rowBox.bottom > viewportHeight + 0.5) {
          violations.push({
            state,
            height: viewportHeight,
            problem: `row ${index} past the viewport`,
            detail: `bottom ${rowBox.bottom.toFixed(1)}`,
          });
        }

        // The real #9 assertion: a chip must stay inside the row that labels
        // it. Row-to-row overlap alone would miss a chip overflowing into a
        // neighbour while the row boxes themselves stayed disjoint.
        for (const chip of Array.from(row.querySelectorAll<HTMLElement>("[data-type]"))) {
          const chipBox = chip.getBoundingClientRect();
          if (chipBox.top < rowBox.top - 0.5 || chipBox.bottom > rowBox.bottom + 0.5) {
            violations.push({
              state,
              height: viewportHeight,
              problem: `chip escapes row ${index}`,
              detail: `${chip.dataset.type} at ${chipBox.top.toFixed(1)}-${chipBox.bottom.toFixed(1)} vs row ${rowBox.top.toFixed(1)}-${rowBox.bottom.toFixed(1)}`,
            });
          }
        }
      });
    };

    clearSelection();
    await settle();
    inspect("(nothing selected)");

    for (let i = 0; i < labels.length; i++) {
      clearSelection();
      chips()[i].click();
      await settle();
      inspect(labels[i]);

      for (let j = i + 1; j < labels.length; j++) {
        clearSelection();
        chips()[i].click();
        chips()[j].click();
        await settle();
        inspect(`${labels[i]} + ${labels[j]}`);
      }
    }

    clearSelection();
    return violations;
  }, height);
}

for (const height of HEIGHTS) {
  test(`buckets hold every selection state at 537x${height}`, async ({ page }) => {
    await page.setViewportSize({ width: 537, height });
    await page.goto("/");
    await page.waitForSelector('[class*="EffectivenessBuckets_row"]');

    const violations = await sweep(page, height);

    expect(
      violations,
      violations
        .slice(0, 10)
        .map((v) => `${v.state}: ${v.problem} (${v.detail})`)
        .join("\n"),
    ).toEqual([]);
  });
}

test("every type stays reachable and lands in exactly one bucket", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector('[class*="EffectivenessBuckets_row"]');

  const placement = await page.evaluate(() => {
    const chips = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[class*="TypeGrid"] button'),
    );
    chips.find((c) => c.getAttribute("aria-label") === "Rock")?.click();
    chips.find((c) => c.getAttribute("aria-label") === "Ground")?.click();

    const inBuckets = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[class*="EffectivenessBuckets_row"] [data-type]',
      ),
    ).map((node) => node.dataset.type);

    return { count: inBuckets.length, unique: new Set(inBuckets).size };
  });

  // A type silently dropped from every bucket is the quietest possible way for
  // this screen to lie, since nothing on it would look broken.
  expect(placement.count).toBe(18);
  expect(placement.unique).toBe(18);
});
