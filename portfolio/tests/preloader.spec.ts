import { expect, test, type Page } from "@playwright/test";

/*
 * T01 preloader. Imports @playwright/test directly (not ./fixtures) so every
 * test here starts as a genuine first visit.
 * An init script logs each preloader state change with its time since
 * navigation start: live (JS took over) → exit (stops blocking) → removed.
 */

type Log = { state: string; at: number }[];
type LogWindow = Window & { __preloader: Log };

const CAP = 2500;

const recordStates = (page: Page) =>
  page.addInitScript(() => {
    const log: Log = [];
    (window as unknown as LogWindow).__preloader = log;
    new MutationObserver((records) => {
      for (const record of records) {
        const node = record.target as HTMLElement;
        if (record.type === "attributes" && node.id === "preloader") {
          log.push({ state: node.dataset.state ?? "", at: performance.now() });
        }
        for (const removed of record.removedNodes) {
          if ((removed as HTMLElement).id === "preloader")
            log.push({ state: "removed", at: performance.now() });
        }
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  });

const stateTimes = async (page: Page) => {
  const log = await page.evaluate(() => (window as unknown as LogWindow).__preloader);
  return Object.fromEntries(log.map(({ state, at }) => [state, at])) as Record<string, number>;
};

const preloader = (page: Page) => page.locator("#preloader");

test.describe("preloader · first visit", () => {
  test("counts to 100, blinks, exits, and never shows again this session", async ({ page, isMobile }) => {
    await recordStates(page);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    await expect(preloader(page)).toContainText("Calibrating");
    await expect(preloader(page).locator('[data-part="value"]')).toHaveText("100", { timeout: CAP });
    await expect(preloader(page)).toBeAttached(); // still on screen for the blink + exit
    await expect(preloader(page)).toHaveCount(0, { timeout: CAP });
    await expect(page.locator("html")).toHaveAttribute("data-preloader", "done");

    // Sequence length: count + blink, from JS taking over to the exit.
    const { live, exit } = await stateTimes(page);
    const sequence = exit - live;
    if (isMobile) {
      expect(sequence).toBeLessThanOrEqual(1200 + 50);
    } else {
      expect(sequence).toBeGreaterThanOrEqual(1200);
      expect(sequence).toBeLessThanOrEqual(1800 + 50);
    }
    expect(exit).toBeLessThanOrEqual(CAP);

    // Repeat visit: hidden before first paint by the inline script, then removed.
    await page.reload();
    const hidden = await page.evaluate(() => {
      const node = document.getElementById("preloader");
      return !node || getComputedStyle(node).display === "none";
    });
    expect(hidden).toBe(true);
    await expect(preloader(page)).toHaveCount(0);
  });

  test("the counter never runs ahead of real loading", async ({ page }) => {
    // Hold every font back: the readout stalls short of 100 until they land or the deadline forces it.
    await page.route("**/*.woff2", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.continue().catch(() => {});
    });
    await page.goto("/", { waitUntil: "domcontentloaded" }); // `load` would wait for the held fonts
    await expect(page.locator("#preloader[data-state='live']")).toBeAttached();
    await page.waitForTimeout(700);
    const value = Number(await preloader(page).locator('[data-part="value"]').textContent());
    expect(value).toBeLessThan(100);
  });

  test("never blocks longer than 2.5s on slow 4G", async ({ page, context }) => {
    await recordStates(page);
    // Lighthouse "slow 4G": 150ms RTT, 1.6 Mbps down, 750 kbps up — plus fonts that never arrive in time.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await page.route("**/*.woff2", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 6000));
      await route.continue().catch(() => {});
    });
    await page.goto("/", { waitUntil: "commit" });

    // Done blocking = exit started, removed, or hidden by the CSS failsafe (JS later than the cap).
    const unblockedAt = await page.waitForFunction(
      () => {
        const node = document.getElementById("preloader");
        const free =
          !node ||
          node.dataset.state === "exit" ||
          node.dataset.state === "skip" ||
          getComputedStyle(node).visibility === "hidden";
        return free && performance.now();
      },
      undefined,
      { timeout: 10_000 },
    );
    const paintedAt = await page.evaluate(
      () => performance.getEntriesByName("first-paint")[0]?.startTime ?? 0,
    );
    expect(Number(await unblockedAt.jsonValue()) - paintedAt).toBeLessThanOrEqual(CAP + 50);
  });

  test("any key or tap skips it", async ({ page, isMobile }) => {
    await recordStates(page);
    await page.goto("/");
    await expect(page.locator("#preloader[data-state='live']")).toBeAttached();
    if (isMobile) await page.touchscreen.tap(200, 200);
    else await page.keyboard.press("Space");
    await expect(preloader(page)).toHaveCount(0, { timeout: 400 });
    const { live, removed } = await stateTimes(page);
    expect(removed - live).toBeLessThan(1000); // well short of a full sequence
  });

  test("lands the line on the hero horizon and hands the page back", async ({ page, isMobile }) => {
    test.skip(isMobile, "same choreography; geometry is checked once");
    await page.goto("/");
    // Inject a horizon (the hero ships its own in T03) before the exit measures it.
    await page.evaluate(() => {
      const horizon = document.createElement("div");
      horizon.dataset.horizon = "";
      Object.assign(horizon.style, {
        position: "fixed",
        left: "10px",
        top: "600px",
        width: "800px",
        height: "1px",
      });
      document.body.append(horizon);
    });
    await expect(page.locator("#preloader[data-state='exit']")).toBeAttached({ timeout: CAP });
    // Blocking ends at the exit: the page takes clicks through the overlay.
    expect(await preloader(page).evaluate((n) => getComputedStyle(n).pointerEvents)).toBe("none");
    // Sample the rule every frame; its last frame before removal is where it landed.
    const landed = await page.evaluate(
      () =>
        new Promise<{ x: number; y: number; width: number }>((resolve) => {
          let last = { x: 0, y: 0, width: 0 };
          const sample = () => {
            const rule = document.querySelector('#preloader [data-part="rule"]');
            if (!rule) return resolve(last);
            const box = rule.getBoundingClientRect();
            last = { x: box.left, y: box.top + box.height / 2, width: box.width };
            requestAnimationFrame(sample);
          };
          sample();
        }),
    );
    expect(Math.abs(landed.x - 10)).toBeLessThan(2);
    expect(Math.abs(landed.width - 800)).toBeLessThan(4);
    expect(Math.abs(landed.y - 600.5)).toBeLessThan(2);
    await expect(preloader(page)).toHaveCount(0, { timeout: 500 });
  });
});

test.describe("preloader · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no counter, a short fade", async ({ page }) => {
    await recordStates(page);
    await page.goto("/");
    await expect(preloader(page).locator('[data-part="value"]')).toBeHidden();
    await expect(preloader(page)).toHaveCount(0, { timeout: 1500 });
    const { exit, removed } = await stateTimes(page);
    expect(removed - exit).toBeLessThan(400); // 200ms fade
  });
});

test.describe("preloader · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("is never shown", async ({ page }) => {
    await page.goto("/");
    await expect(preloader(page)).toBeHidden();
    await expect(page.locator("h1")).toBeVisible();
  });
});
