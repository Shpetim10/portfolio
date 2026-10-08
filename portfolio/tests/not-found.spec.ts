import { expect, test, type Page } from "./fixtures";

/*
 * T14 · 404 — PART NOT FOUND. Rendered by app/global-not-found.tsx outside the
 * site layout. Budget: under 150KB of JS (gzipped, as transferred) on mobile,
 * where the 3D chunk never loads. Desktop turns the 3D Instrument by drag or
 * by the rotate buttons (the headless browser's software WebGL is admitted
 * through the test probe).
 */

const URL = "/no/such/part/";

/** Bytes transferred for every script the page has loaded (Resource Timing; same-origin). */
const scriptBytes = (page: Page) =>
  page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
      .filter((entry) => entry.initiatorType === "script" || entry.name.endsWith(".js"))
      .reduce((sum, entry) => sum + entry.transferSize, 0),
  );

const threeLoaded = (page: Page) =>
  page.evaluate(() =>
    (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).some((entry) =>
      /\.js$/.test(entry.name),
    )
      ? [...document.scripts].some((script) => /three|fiber/i.test(script.src))
      : false,
  );

test.describe("404 · content", () => {
  test("says what's missing, where, and the way back", async ({ page }) => {
    const response = await page.goto(URL);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle(/^Part not found/);
    await expect(page.locator("h1")).toHaveText(/part not found/i);
    await expect(page.locator(".section-index")).toContainText("Assembly check");

    // Exploded drawing: four plates, the fifth in phantom lines; the slot is dimensioned.
    const drawing = page.locator(".pnf__figure .instrument-drawing");
    await expect(drawing.locator(".instrument-drawing__plate")).toHaveCount(5);
    await expect(
      drawing.locator('[data-layer="services"][data-missing] .instrument-drawing__phantom'),
    ).toHaveCount(1);
    await expect(drawing.locator('[data-layer="services"] .instrument-drawing__fill')).toHaveCount(0);
    for (const slot of ["top", "bottom", "rule"]) {
      await expect(page.locator(`.pnf__marks [data-slot="${slot}"]`)).toBeAttached();
    }
    await expect(page.locator(".pnf__callout")).toContainText("P/N 03 — Services");
    await expect(page.locator(".pnf__callout")).toContainText("Not found");
    await expect(page.locator(".pnf__figure figcaption")).toContainText(
      "slot for P/N 03 — Services is empty",
    );

    // The requested address, filled in by the browser (one static 404.html answers every URL).
    await expect(page.locator(".pnf__path")).toHaveText(URL);

    const home = page.getByRole("link", { name: "Return to assembly" });
    await expect(home).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Read the resume" })).toHaveAttribute("href", "/resume/");
  });

  test("no site layout: no header, preloader, cursor or smooth scroll", async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator(".site-header, .preloader, .cursor, .title-block")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
  });
});

test.describe("404 · mobile budget", () => {
  test("under 150KB of JS, and no 3D", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the budget is measured on mobile");
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500); // past any idle-time loading
    const bytes = await scriptBytes(page);
    expect(bytes).toBeGreaterThan(0);
    expect(bytes).toBeLessThan(150 * 1024);
    expect(await threeLoaded(page)).toBe(false);
    await expect(page.locator(".pnf__canvas canvas")).toHaveCount(0);
    await expect(page.locator('[data-stage="controls"]')).toHaveCount(0);
  });
});

test.describe("404 · desktop", () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(isMobile, "drag is a desktop interaction");
    await page.addInitScript(() => {
      window.__NOT_FOUND_PROBE__ = { allowSoftware: true };
    });
  });

  const read = (page: Page) => page.evaluate(() => window.__NOT_FOUND_PROBE__!.read!());

  test("the 3D Instrument loads after first paint and turns by drag", async ({ page }) => {
    await page.goto(URL);
    const figure = page.locator(".pnf__figure");
    await expect(figure).toHaveAttribute("data-renderer", "3d", { timeout: 15_000 });
    await expect(page.locator(".pnf__canvas canvas")).toHaveCount(1);

    const box = (await figure.boundingBox())!;
    const before = (await read(page)).spin;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2, { steps: 8 });
    await expect(figure).toHaveAttribute("data-dragging", "");
    await page.mouse.up();
    await expect(figure).not.toHaveAttribute("data-dragging");
    // 160px at 0.5°/px ≈ 80°, plus idle spin.
    expect((await read(page)).spin - before).toBeGreaterThan((60 * Math.PI) / 180);

    // The dimension line follows the turning part (transforms only).
    await expect(page.locator('.pnf__marks [data-slot="rule"]')).toHaveAttribute("transform", /scale\(1 /);
  });

  test("rotate buttons are the drag's keyboard / single-pointer alternative", async ({ page }) => {
    await page.goto(URL);
    const right = page.getByRole("button", { name: "Rotate the Instrument right" });
    await expect(right).toBeVisible({ timeout: 15_000 });
    const before = (await read(page)).spin;
    await right.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(900); // medium (600ms) turn
    const turned = (await read(page)).spin - before;
    expect(turned).toBeGreaterThan((40 * Math.PI) / 180);
    expect(turned).toBeLessThan((55 * Math.PI) / 180); // 45° + a little idle spin
  });

  test("reduced motion: the static drawing, no 3D, no controls", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await expect(page.locator(".pnf__figure")).not.toHaveAttribute("data-renderer", "3d");
    await expect(page.locator(".pnf__canvas canvas")).toHaveCount(0);
    await expect(page.locator('[data-stage="controls"]')).toHaveCount(0);
    await expect(page.locator(".pnf__figure .instrument-drawing")).toHaveCSS("opacity", "1");
  });
});
