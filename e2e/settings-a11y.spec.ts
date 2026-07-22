import { expect, test } from "@playwright/test";

/**
 * The settings radiogroups keep the keyboard contract their ARIA roles imply.
 *
 * `role="radiogroup"` is a promise about behaviour, not just a label: arrow
 * keys move between options and the group is a single tab stop. This shipped
 * without either, which is what #20 records. The device is a handheld with a
 * d-pad, so directional input is a real path rather than a theoretical one.
 */

async function openSettings(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.waitForSelector('[role="radiogroup"]');
}

test("arrow keys move through the theme group and selection follows", async ({ page }) => {
  await openSettings(page);

  const theme = page.getByRole("radiogroup", { name: "Theme" });
  const options = theme.getByRole("radio");
  await expect(options).toHaveCount(3);

  // Pure black is the default, so the group starts on the first option.
  await expect(options.nth(0)).toHaveAttribute("aria-checked", "true");

  await options.nth(0).focus();
  await page.keyboard.press("ArrowRight");

  await expect(options.nth(1)).toBeFocused();
  await expect(options.nth(1)).toHaveAttribute("aria-checked", "true");
  await expect(options.nth(0)).toHaveAttribute("aria-checked", "false");

  // Selection following focus must actually apply the theme, not just move a ring.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.keyboard.press("ArrowLeft");
  await expect(options.nth(0)).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "black");

  // Wrapping keeps the group navigable without hunting for the end.
  await page.keyboard.press("ArrowLeft");
  await expect(options.nth(2)).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("vertical arrows drive the group as well as horizontal", async ({ page }) => {
  await openSettings(page);

  const options = page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio");
  await options.nth(0).focus();

  await page.keyboard.press("ArrowDown");
  await expect(options.nth(1)).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(options.nth(0)).toBeFocused();
});

test("the generation group skips options whose chart does not exist", async ({ page }) => {
  await openSettings(page);

  const group = page.getByRole("radiogroup", { name: "Type chart generation" });
  const options = group.getByRole("radio");
  await expect(options).toHaveCount(3);

  // Gen 1 and Gen 2-5 are declared but unpopulated, so only Gen 6+ is live.
  await expect(options.nth(0)).toBeDisabled();
  await expect(options.nth(1)).toBeDisabled();
  await expect(options.nth(2)).toBeEnabled();
  await expect(options.nth(2)).toHaveAttribute("aria-checked", "true");

  // With one selectable option, arrowing must stay put rather than focusing a
  // disabled row and appearing to select something the app cannot honour.
  await options.nth(2).focus();
  await page.keyboard.press("ArrowRight");
  await expect(options.nth(2)).toBeFocused();
  await expect(options.nth(2)).toHaveAttribute("aria-checked", "true");
});

test("each radiogroup is a single tab stop", async ({ page }) => {
  await openSettings(page);

  const options = page.getByRole("radiogroup", { name: "Theme" }).getByRole("radio");

  // Roving tabindex: only the checked option is reachable by Tab, so Tab moves
  // past the group rather than through all three of its options.
  await expect(options.nth(0)).toHaveAttribute("tabindex", "0");
  await expect(options.nth(1)).toHaveAttribute("tabindex", "-1");
  await expect(options.nth(2)).toHaveAttribute("tabindex", "-1");

  await options.nth(0).focus();
  await page.keyboard.press("ArrowRight");

  // The roving index follows the selection, so the group stays re-enterable
  // at wherever the user left it.
  await expect(options.nth(1)).toHaveAttribute("tabindex", "0");
  await expect(options.nth(0)).toHaveAttribute("tabindex", "-1");
});

test("settings fits the panel without scrolling the page", async ({ page }) => {
  await openSettings(page);

  const overflow = await page.evaluate(() => ({
    vertical: document.body.scrollHeight - document.body.clientHeight,
    horizontal: document.body.scrollWidth - document.body.clientWidth,
    scrollRegions: Array.from(document.querySelectorAll<HTMLElement>("div")).filter(
      (el) => getComputedStyle(el).overflowY === "auto" && el.scrollHeight > el.clientHeight,
    ).length,
  }));

  // The settings body scrolls; the page must not, or the back button leaves
  // the screen and the user is stranded.
  expect(overflow.vertical).toBe(0);
  expect(overflow.horizontal).toBe(0);
  expect(overflow.scrollRegions).toBe(1);
});
