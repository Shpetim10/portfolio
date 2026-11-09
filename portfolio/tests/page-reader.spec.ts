import { expect, test } from "./fixtures";

/*
 * Page reader (<Scroll> in a case study): a full-page screenshot in a scrolling
 * window with a minimap, jump chips and a full-screen mode. Runs on the real
 * HERISAGA Authoring story, which carries five of them.
 */

const URL = "/work/herisaga-authoring/";

test.describe("page reader", () => {
  test("renders five readers, each a labelled, focusable region with its full-page image", async ({
    page,
  }) => {
    await page.goto(URL);
    const readers = page.locator(".reader");
    await expect(readers).toHaveCount(5);
    for (const reader of await readers.all()) {
      const region = reader.getByRole("region");
      await expect(region).toHaveAttribute("tabindex", "0");
      await expect(region.locator("img")).toHaveAttribute("alt", /.{40,}/);
    }
  });

  test("a jump chip scrolls to its point and is marked current; the readout follows", async ({ page }) => {
    await page.goto(URL);
    const reader = page.locator(".reader").first();
    await reader.scrollIntoViewIfNeeded();
    const chips = reader.locator(".reader__stop");
    await expect(chips.first()).toHaveAttribute("aria-current", "true");

    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(chips.first()).not.toHaveAttribute("aria-current", "true");

    await chips.last().click();
    await expect(chips.last()).toHaveAttribute("aria-current", "true");
    await expect(reader.locator(".reader__readout")).toHaveText("100%");
  });

  test("full screen opens where you were, takes the keyboard, and Esc returns focus to its button", async ({
    page,
  }) => {
    await page.goto(URL);
    const reader = page.locator(".reader").first();
    await reader.scrollIntoViewIfNeeded();
    await reader.locator(".reader__stop").nth(1).click();
    const top = (selector: string) =>
      page.evaluate((s) => {
        const el = document.querySelector<HTMLElement>(s)!;
        return el.scrollTop / el.scrollHeight;
      }, selector);
    // The chip's point is 0.06 down the page; wait for the smooth scroll to arrive.
    await expect.poll(() => top(".reader__scroller")).toBeCloseTo(0.06, 2);
    const before = await top(".reader__scroller");

    const open = reader.getByRole("button", { name: /full screen/i });
    await open.click();
    const dialog = page.locator("dialog.reader-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".reader__scroller")).toBeFocused();
    expect(Math.abs((await top("dialog .reader__scroller")) - before)).toBeLessThan(0.01);

    await page.keyboard.press("PageDown");
    await expect.poll(() => top("dialog .reader__scroller")).toBeGreaterThan(before);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(open).toBeFocused();
  });

  test("never widens the page, inline or full screen", async ({ page }) => {
    await page.goto(URL);
    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBeLessThanOrEqual(0);
    const reader = page.locator(".reader").first();
    await reader.scrollIntoViewIfNeeded();
    await reader.getByRole("button", { name: /full screen/i }).click();
    await expect(page.locator("dialog.reader-dialog")).toBeVisible();
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
