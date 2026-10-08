import { expect, test, type Page } from "./fixtures";

/*
 * T05 metrics. The owner's metrics aren't supplied yet, so the homepage shows
 * a marked placeholder; the populated section is exercised on /lab, where
 * MetricList runs on design-system budgets (12 col · 1.6 s · 2.5 s · 200 KB · 0.05).
 */

const FINAL = ["12", "1.6", "2.5", "200", "0.05"];
const SPOKEN = ["12 col", "1.6 s", "2.5 s", "200 KB", "0.05"];

const figures = (page: Page) => page.locator("#metrics .counter__value");
const dotColors = (page: Page) =>
  page
    .locator("#metrics .metric__dot")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));

/** Scrolls until `ratio` of the list is in view (from the bottom edge), then lets the motion run. */
async function revealList(page: Page, ratio: number, settle: number) {
  await page.evaluate((r) => {
    const list = document.querySelector<HTMLElement>("#metrics .metrics")!;
    const box = list.getBoundingClientRect();
    window.scrollTo(0, box.top + window.scrollY - window.innerHeight + box.height * r);
  }, ratio);
  await page.waitForTimeout(settle);
}

test.describe("metrics · homepage", () => {
  test("section [03] marks missing metrics instead of inventing them", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section#metrics");
    await expect(section).toHaveAttribute("aria-labelledby", "metrics-index");
    await expect(section.locator(".section-index")).toContainText("[03]");
    await expect(section.locator(".metrics__todo[data-todo]")).toBeVisible();
    await expect(section.locator(".metric")).toHaveCount(0);
  });
});

test.describe("metrics · layout", () => {
  test("one row on desktop, two columns on mobile with the lead spanning; figures fit", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/lab/");
    await page.evaluate(() => document.fonts.ready);
    const cells = await page.locator("#metrics .metric").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        const end = (node.querySelector(".counter__suffix") ?? node.querySelector(".counter__value"))!;
        return { x: box.x, y: box.y, width: box.width, reach: end.getBoundingClientRect().right - box.x };
      }),
    );
    expect(cells).toHaveLength(5);
    for (const cell of cells) expect(cell.reach).toBeLessThanOrEqual(cell.width);

    if (isMobile) {
      const [lead, ...rest] = cells;
      expect(rest[0].width).toBeLessThan(lead.width / 2); // lead spans both columns
      expect(rest[0].y).toBe(rest[1].y);
      expect(rest[0].x).toBeLessThan(rest[1].x);
      expect(rest[2].y).toBeGreaterThan(rest[0].y);
    } else {
      expect(new Set(cells.map((cell) => Math.round(cell.y))).size).toBe(1);
    }

    const value = figures(page).first();
    await expect(value).toHaveCSS("font-variant-numeric", "tabular-nums");
    const label = await page
      .locator("#metrics .metric__label")
      .first()
      .evaluate((node) => getComputedStyle(node).fontSize);
    expect(label).toBe("14px"); // small: 0.875rem
  });

  test("no horizontal overflow at 375, 768 and 2560", async ({ page, isMobile }) => {
    test.skip(isMobile, "viewport sweep runs on the desktop project");
    for (const width of [375, 768, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/lab/#metrics");
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    }
  });
});

test.describe("metrics · CALIBRATE", () => {
  test("waits below 60% in view, then counts once to the final values; one signal dot", async ({ page }) => {
    await page.goto("/lab/");
    await page.evaluate(() => document.fonts.ready);
    await expect(figures(page)).toHaveText(["00", "0.0", "0.0", "000", "0.00"]);

    await revealList(page, 0.4, 600); // under 60% in view: still waiting
    await expect(figures(page).first()).toHaveText("00");

    await revealList(page, 0.8, 1600); // 1.24s of motion, under the 1.6s cap
    await expect(figures(page)).toHaveText(FINAL);
    for (const transform of await page
      .locator("#metrics .dimension [data-anim-part]")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform))) {
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    }
    await expect(page.locator("#metrics .metric__dot").first()).toHaveCSS("opacity", "1");
    const [lead, ...rest] = await dotColors(page);
    expect(lead).toBe("rgb(255, 79, 0)");
    for (const color of rest) expect(color).not.toBe(lead);

    // Once: scrolling away and back doesn't count again.
    await page.evaluate(() => window.scrollTo(0, 0));
    await revealList(page, 0.8, 300);
    await expect(figures(page)).toHaveText(FINAL);
  });

  test("screen readers get the final values, never the count; no live region", async ({ page }) => {
    await page.goto("/lab/");
    const list = page.locator("#metrics dl");
    await expect(list).toHaveAttribute("aria-live", "off");
    await expect(page.locator("#metrics [aria-live]:not([aria-live='off'])")).toHaveCount(0);
    await expect(page.locator("#metrics .metric__reading .sr-only")).toHaveText(SPOKEN);
    expect(
      await page.locator("#metrics .metric__figure").evaluateAll((nodes) => nodes.map((n) => n.ariaHidden)),
    ).toEqual(Array(5).fill("true"));
  });
});

test.describe("metrics · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no count: final values from the start, the list fades in", async ({ page }) => {
    await page.goto("/lab/");
    await expect(figures(page)).toHaveText(FINAL);
    await revealList(page, 0.8, 500);
    await expect(figures(page)).toHaveText(FINAL);
    await expect(page.locator("#metrics .metrics")).toHaveCSS("opacity", "1");
  });
});

test.describe("metrics · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("final values are in the HTML", async ({ page }) => {
    await page.goto("/lab/");
    await expect(figures(page)).toHaveText(FINAL);
    await expect(page.locator("#metrics .metric__reading .sr-only")).toHaveText(SPOKEN);
    await expect(page.locator("#metrics .metric__dot").first()).toHaveCSS("opacity", "1");
  });
});
