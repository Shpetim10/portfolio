import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/work/example-project-01/", "/resume/"];

test.describe("static routes", () => {
  for (const route of ROUTES) {
    test(`${route} renders`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main#main")).toBeVisible();
    });
  }

  test("unknown route serves the 404 page", async ({ page }) => {
    const response = await page.goto("/work/does-not-exist/");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1")).toHaveText("404");
  });

  test("skip link is the first focusable element", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});

/** Sum of layout-shift scores observed so far (Chromium). */
const readCls = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { value: number })[]) {
            total += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(total), 250);
      }),
  );

test.describe("fonts", () => {
  // The 404 page renders real display + text copy (other pages are mostly mono TODO markers).
  for (const route of [...ROUTES, "/404/"]) {
    test(`${route} has zero CLS when web fonts arrive late`, async ({ page }) => {
      // Hold every font back so the size-adjusted fallback paints first, then swaps.
      await page.route("**/*.woff2", async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.continue();
      });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => document.fonts.status)).toBe("loaded");
      expect(await readCls(page)).toBe(0);
    });
  }
});

test.describe("motion runtime", () => {
  test("one requestAnimationFrame loop, Lenis driven by the GSAP ticker", async ({ page }) => {
    // Count invocations per callback function. A loop re-queues the same function every frame.
    await page.addInitScript(() => {
      const calls = new Map<FrameRequestCallback, number>();
      (window as unknown as { __raf: typeof calls }).__raf = calls;
      const native = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => {
        calls.set(callback, (calls.get(callback) ?? 0) + 1);
        return native(callback);
      };
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await page.evaluate(() => (window as unknown as { __raf: Map<unknown, number> }).__raf.clear());

    await page.mouse.move(400, 400);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(500);

    const loops = await page.evaluate(() =>
      [...(window as unknown as { __raf: Map<FrameRequestCallback, number> }).__raf]
        .filter(([, count]) => count > 20)
        .map(([callback]) => callback.toString()),
    );
    // ScrollTrigger keeps an empty keep-alive RAF (`_rafBugFix`: re-queues itself, does no work).
    const keepAlive =
      /^function\s*[\w$]*\(\)\s*\{\s*return\s+[\w$]+\s*&&\s*requestAnimationFrame\([\w$]+\);?\s*\}$/;
    const working = loops.filter((source) => !keepAlive.test(source));
    expect(working).toHaveLength(1); // the GSAP ticker — Lenis has no loop of its own
    expect(loops.length - working.length).toBeLessThanOrEqual(1);
  });

  test("reduced motion follows the OS setting live", async ({ page }) => {
    const html = page.locator("html");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(html).toHaveAttribute("data-motion", "full");
    await expect(html).toHaveClass(/lenis/);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(html).toHaveAttribute("data-motion", "reduce");
    await expect(html).not.toHaveClass(/lenis/); // native scroll, no smoothing

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(html).toHaveAttribute("data-motion", "full");
    await expect(html).toHaveClass(/lenis/);
  });

  test("input type is exposed for touch gating", async ({ page, isMobile }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-input", isMobile ? "touch" : "fine");
  });
});
