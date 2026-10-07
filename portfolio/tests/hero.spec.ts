import { expect, test, type Page } from "./fixtures";

/*
 * T03 hero + the Instrument. The hero probe (src/components/sections/hero/HeroStage.tsx)
 * reports which renderer is live, the progress the last frame was drawn at, and
 * which labels are annotated. It only exists when an init script opts in.
 */

type Read = { renderer: string; drawn: number; explode: number; annotated: boolean[] };
type ProbeWindow = Window & { __HERO_PROBE__?: { allowSoftware?: boolean; read?: () => Read } };

const enableProbe = (page: Page, options: { allowSoftware?: boolean } = {}) =>
  page.addInitScript((opts) => {
    (window as ProbeWindow).__HERO_PROBE__ = opts;
  }, options);

const read = (page: Page) => page.evaluate(() => (window as ProbeWindow).__HERO_PROBE__!.read!());

/** Progress the page's current scroll position implies, and what the last frame drew. */
const syncState = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ expected: number; drawn: number }>((resolve) =>
        // After a frame: Lenis, ScrollTrigger and the renderer have all run for the current scroll.
        requestAnimationFrame(() => {
          const hero = document.querySelector<HTMLElement>(".hero")!;
          const raw = (window.scrollY - hero.offsetTop) / (hero.offsetHeight - window.innerHeight);
          const probe = (window as ProbeWindow).__HERO_PROBE__!.read!();
          resolve({ expected: Math.min(1, Math.max(0, raw)), drawn: probe.drawn });
        }),
      ),
  );

/** Jumps to a point in the pinned scroll (0 → 1) and lets everything settle. */
async function scrollHero(page: Page, progress: number) {
  await page.evaluate((p) => {
    const hero = document.querySelector<HTMLElement>(".hero")!;
    window.scrollTo(0, hero.offsetTop + (hero.offsetHeight - window.innerHeight) * p);
  }, progress);
  await page.waitForTimeout(1200); // longest label motion: draw + decode ≈ 0.9s
}

test.describe("hero · layout", () => {
  test("name, positioning, status block and horizon", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("section.hero");
    await expect(hero).toHaveAttribute("data-mode", "live");
    await expect(hero.locator("h1")).toHaveId("hero-name");
    await expect(hero).toHaveAttribute("aria-labelledby", "hero-name");
    // Missing content is marked, never invented.
    await expect(hero.locator("h1")).toHaveAttribute("data-todo", "");
    await expect(hero.locator(".hero__positioning")).toHaveAttribute("data-todo", "");

    const status = hero.locator(".hero__status");
    await expect(status.locator(".hero__role")).toBeVisible();
    await expect(status.locator(".status__availability")).toBeVisible();
    await expect(status.locator("[data-clock]")).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    await expect(status.locator(".hero__cue")).toHaveText(/scroll/i);
    await expect(hero.locator("[data-horizon]")).toHaveCount(1);
  });

  test("the Instrument overlaps the name: in front on desktop, under it on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const name = (await page.locator(".hero__name").boundingBox())!;
    const figure = (await page.locator(".hero__figure").boundingBox())!;
    const z = (selector: string) =>
      page.locator(selector).evaluate((node) => Number(getComputedStyle(node).zIndex));

    if (isMobile) {
      expect(name.y).toBeLessThan(figure.y); // name above
      expect(await z(".hero__name")).toBeGreaterThan(await z(".hero__figure")); // and in front
    } else {
      const overlapX = Math.min(name.x + name.width, figure.x + figure.width) - Math.max(name.x, figure.x);
      const overlapY = Math.min(name.y + name.height, figure.y + figure.height) - Math.max(name.y, figure.y);
      expect(overlapX).toBeGreaterThan(0);
      expect(overlapY).toBeGreaterThan(0);
      expect(figure.x + figure.width / 2).toBeGreaterThan(720); // centre-right
      expect(await z(".hero__figure")).toBeGreaterThan(await z(".hero__name")); // name behind
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  });

  test("the LCP element is the name text", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const inName = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          new PerformanceObserver((list) => {
            const last = list.getEntries().at(-1) as PerformanceEntry & { element: Element | null };
            resolve(!!last.element?.closest("#hero-name"));
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }),
    );
    expect(inName).toBe(true);
  });
});

test.describe("hero · scroll choreography", () => {
  test("explodes and annotates, names leave, and it all reverses", async ({ page }) => {
    await enableProbe(page);
    await page.goto("/");
    await expect.poll(async () => (await read(page)).renderer).toMatch(/^(3d|drawing)$/);

    const start = await read(page);
    expect(start.explode).toBe(0);
    expect(start.annotated).toEqual([false, false, false, false, false]);
    await expect(page.locator(".instrument-note").first()).toHaveCSS("opacity", "0");

    await scrollHero(page, 1);
    const end = await read(page);
    expect(end.explode).toBe(1);
    expect(end.annotated).toEqual([true, true, true, true, true]);
    await expect(page.locator(".instrument-note .part-label")).toHaveText([
      "P/N 01 — Interface",
      "P/N 02 — API",
      "P/N 03 — Services",
      "P/N 04 — Data",
      "P/N 05 — Infrastructure",
    ]);
    await expect(page.locator(".instrument-note__line").first()).toHaveText("What people touch");
    // Name lines have risen out of their masks.
    for (const transform of await page
      .locator(".hero__line")
      .evaluateAll((nodes) => nodes.map((node) => new DOMMatrix(getComputedStyle(node).transform).m42))) {
      expect(transform).toBeLessThan(0);
    }

    await scrollHero(page, 0);
    const back = await read(page);
    expect(back.explode).toBe(0);
    expect(back.annotated).toEqual([false, false, false, false, false]);
  });

  test("stays in sync when scrolling fast in both directions", async ({ page, isMobile }) => {
    await enableProbe(page);
    await page.goto("/");
    await expect.poll(async () => (await read(page)).renderer).toMatch(/^(3d|drawing)$/);

    const samples: { expected: number; drawn: number }[] = [];
    if (isMobile) {
      // Touch scrolling is native: jump around the pin as a fling would.
      for (const p of [0.9, 0.1, 0.7, 0.3, 1, 0, 0.55]) {
        await page.evaluate((target) => {
          const hero = document.querySelector<HTMLElement>(".hero")!;
          window.scrollTo(0, hero.offsetTop + (hero.offsetHeight - window.innerHeight) * target);
        }, p);
        samples.push(await syncState(page));
      }
    } else {
      // Hard wheel flicks, down then up, sampled mid-flight without waiting for Lenis to settle.
      await page.mouse.move(700, 400);
      for (const delta of [1600, 1600, 1600, -2400, -2400, 2400, -3200]) {
        await page.mouse.wheel(0, delta);
        for (let i = 0; i < 4; i++) samples.push(await syncState(page));
      }
    }

    const moving = new Set(samples.map(({ drawn }) => drawn.toFixed(2)));
    expect(moving.size).toBeGreaterThan(3); // the samples really cover the explode
    for (const { expected, drawn } of samples) expect(Math.abs(expected - drawn)).toBeLessThan(0.005);
  });
});

test.describe("hero · renderers", () => {
  test("the 3D scene takes over from the drawing, in the single animation loop", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "the renderer hand-over is checked once");
    await enableProbe(page, { allowSoftware: true });
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
    await expect.poll(async () => (await read(page)).renderer, { timeout: 10_000 }).toBe("3d");
    await expect(page.locator(".hero__canvas canvas")).toHaveCount(1);
    await expect(page.locator(".hero__figure")).toHaveAttribute("data-renderer", "3d");

    // Rendering 3D adds no requestAnimationFrame loop of its own.
    await page.evaluate(() => (window as unknown as { __raf: Map<unknown, number> }).__raf.clear());
    await page.waitForTimeout(1000);
    const loops = await page.evaluate(
      () =>
        [...(window as unknown as { __raf: Map<FrameRequestCallback, number> }).__raf].filter(
          ([, count]) => count > 20,
        ).length,
    );
    expect(loops).toBeLessThanOrEqual(2); // the GSAP ticker (+ ScrollTrigger's empty keep-alive)
  });

  test("without hardware WebGL the drawing runs the same choreography", async ({ page }) => {
    await enableProbe(page);
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      // @ts-expect-error -- overloads: hide every WebGL context, keep 2D
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        return /webgl/.test(type) ? null : getContext.call(this, type as "2d", ...(rest as []));
      };
    });
    await page.goto("/");
    await page.waitForTimeout(800);
    expect((await read(page)).renderer).toBe("drawing");
    await expect(page.locator(".hero__canvas canvas")).toHaveCount(0);
    await expect(page.locator(".instrument-drawing")).toHaveCSS("opacity", "1");

    await scrollHero(page, 1);
    expect((await read(page)).annotated).toEqual([true, true, true, true, true]);
    // Each label's dot sits on its plate's right vertex.
    const gaps = await page.evaluate(() =>
      [...document.querySelectorAll<SVGGElement>(".instrument-drawing__plate")].map((plate) => {
        const layer = plate.dataset.layer;
        const dot = document
          .querySelector(`.instrument-note[data-layer="${layer}"] .leader__dot`)!
          .getBoundingClientRect();
        const box = plate.querySelector(".instrument-drawing__line")!.getBoundingClientRect();
        return Math.abs(dot.left + dot.width / 2 - box.right);
      }),
    );
    for (const gap of gaps) expect(gap).toBeLessThan(3);
  });
});

test.describe("hero · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("a static exploded render with labels; no pin, no 3D", async ({ page }) => {
    await enableProbe(page);
    await page.goto("/");
    const hero = page.locator("section.hero");
    await expect(hero).not.toHaveAttribute("data-mode", /.*/);
    await expect(page.locator(".hero__canvas canvas")).toHaveCount(0);
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => (window as ProbeWindow).__HERO_PROBE__?.read)).toBeUndefined();

    const notes = page.locator(".instrument-note");
    await expect(notes).toHaveCount(5);
    for (const note of await notes.all()) await expect(note).toHaveCSS("opacity", "1");
    await expect(page.locator(".instrument-drawing")).toHaveCSS("opacity", "1");
    // Scrolling the hero is ordinary scrolling: nothing pinned.
    await expect(page.locator(".hero__stage")).toHaveCSS("position", "relative");
  });
});

test.describe("hero · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("everything reads: name, labelled parts, status", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-name")).toBeVisible();
    await expect(page.locator(".instrument-note")).toHaveCount(5);
    await expect(page.locator(".instrument-note").first()).toBeVisible();
    await expect(page.locator(".instrument-note__line").last()).toHaveText("What keeps it running");
    await expect(page.locator(".hero__status")).toBeVisible();
  });
});

test.describe("hero · performance", () => {
  test("interactive within 2.5s on a mid-range phone", async ({ page, context, isMobile }) => {
    test.skip(!isMobile, "measured on the mobile project");
    // Mid-range mobile: 4× CPU slowdown on Lighthouse's slow 4G.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await page.goto("/", { waitUntil: "commit" });
    const at = await page.waitForFunction(
      () => performance.getEntriesByName("hero:interactive")[0]?.startTime,
      undefined,
      { timeout: 10_000 },
    );
    expect(Number(await at.jsonValue())).toBeLessThan(2500);
  });
});
