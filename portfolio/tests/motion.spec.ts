import { expect, test, type Page } from "./fixtures";

/*
 * P0-03 motion kit. Runs against the static export like every other suite.
 * The probe (src/motion/gsap.ts) exposes live ScrollTrigger / animation counts
 * only when this init script opts in.
 */

type Probe = { triggers: () => number; animations: () => number };
type ProbeWindow = Window & { __MOTION_PROBE__?: true | Probe; __navMarker?: number };

const enableProbe = (page: Page) =>
  page.addInitScript(() => {
    (window as ProbeWindow).__MOTION_PROBE__ = true;
  });

/** The INVERT specimen's plate (other paper sections on /lab carry their own). */
const INVERT_PLATE = ".inversion:has(> #invert) > [data-anim-part='plate']";

const IDENTITY = ["none", "matrix(1, 0, 0, 1, 0, 0)"];
const transformOf = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));

/** Brings a section into view (native scroll; Lenis and ScrollTrigger follow it) and lets its motion finish. */
async function playSection(page: Page, id: string) {
  await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(1800); // longest motion is 1000ms + staggers; UI cap is 1.6s
}

test.describe("motion kit · full motion", () => {
  test.skip(({ isMobile }) => isMobile, "pointer + scroll choreography is checked on desktop");

  test("every signature motion plays once and lands on its final state", async ({ page }) => {
    await page.goto("/lab/");
    await page.evaluate(() => document.fonts.ready);

    // Before scrolling: below-the-fold motions hold their start state.
    await expect(page.locator("#reveal .reveal__line").first()).toBeAttached();
    for (const transform of await transformOf(page, "#reveal .reveal__line")) {
      expect(IDENTITY).not.toContain(transform); // lowered behind its mask
    }
    for (const transform of await transformOf(page, "#annotate .leader__run")) {
      expect(transform).toBe("matrix(0, 0, 0, 1, 0, 0)"); // elbow not drawn yet
    }
    await expect(page.locator("#calibrate .counter:visible .counter__value").first()).toHaveText("00");
    expect(await transformOf(page, INVERT_PLATE)).toEqual(["matrix(1, 0, 0, 1, 0, 0)"]); // plate covers paper
    expect(
      await page
        .locator("#annotate [data-anim-part='label']")
        .first()
        .evaluate((n) => getComputedStyle(n).opacity),
    ).toBe("0");

    await playSection(page, "reveal");
    const lines = await transformOf(page, "#reveal .reveal__line");
    expect(lines.length).toBeGreaterThan(1);
    for (const transform of lines) expect(IDENTITY).toContain(transform);
    // One mask per line, no split nested inside another split.
    await expect(page.locator("#reveal .reveal__line-mask")).toHaveCount(lines.length);
    await expect(page.locator("#reveal .reveal__line .reveal__line")).toHaveCount(0);

    await playSection(page, "annotate");
    const labels = page.locator("#annotate .part-label");
    await expect(labels).toHaveText([
      "P/N 01 — Interface",
      "P/N 02 — API",
      "P/N 03 — Services",
      "P/N 04 — Data",
      "P/N 05 — Infrastructure",
    ]);
    for (const transform of await transformOf(page, "#annotate .leader__run, #annotate .leader__leg svg")) {
      expect(IDENTITY).toContain(transform);
    }

    await playSection(page, "calibrate");
    await expect(page.locator("#calibrate .counter:visible .counter__value")).toHaveText(["12", "1.6"]);
    for (const transform of await transformOf(page, "#calibrate .dimension:visible [data-anim-part]")) {
      expect(IDENTITY).toContain(transform);
    }

    await playSection(page, "invert");
    expect(await transformOf(page, INVERT_PLATE)).toEqual(["matrix(1, 0, 0, 0, 0, 0)"]);
  });

  test("animates only transform and opacity", async ({ page }) => {
    // Collect, per element and property, every distinct inline style value it takes.
    await page.addInitScript(() => {
      const ids = new WeakMap<Node, number>();
      const values: Record<string, string[]> = {};
      const parse = (css: string | null) =>
        Object.fromEntries(
          (css ?? "")
            .split(";")
            .map((rule) => rule.split(":").map((part) => part.trim()))
            .filter(([prop]) => prop)
            .map(([prop, ...value]) => [prop, value.join(":")]),
        );
      new MutationObserver((records) => {
        for (const { target, oldValue } of records) {
          if (!ids.has(target)) ids.set(target, Object.keys(values).length + 1);
          const before = parse(oldValue);
          const after = parse((target as Element).getAttribute("style"));
          for (const prop of new Set([...Object.keys(before), ...Object.keys(after)])) {
            if (before[prop] === after[prop]) continue;
            const seen = (values[`${ids.get(target)}|${prop}`] ??= []);
            for (const value of [before[prop] ?? "", after[prop] ?? ""])
              if (!seen.includes(value)) seen.push(value);
          }
        }
      }).observe(document, {
        attributes: true,
        attributeFilter: ["style"],
        attributeOldValue: true,
        subtree: true,
      });
      (window as Window & { __styleValues?: Record<string, string[]> }).__styleValues = values;
    });

    await page.goto("/lab/");
    for (const id of ["reveal", "annotate", "calibrate", "invert"]) await playSection(page, id);

    // Pointer layer: cursor lens + magnetic pull.
    const target = page.locator("#cursor [data-cursor='view']");
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    const magnet = page.locator("#magnetic .button[data-magnetic]:not(:disabled)");
    await magnet.scrollIntoViewIfNeeded();
    const mbox = (await magnet.boundingBox())!;
    await page.mouse.move(mbox.x + mbox.width - 2, mbox.y + 4, { steps: 12 });
    await page.waitForTimeout(600);

    const animated = await page.evaluate(() => {
      const values = (window as Window & { __styleValues?: Record<string, string[]> }).__styleValues ?? {};
      // Setup writes toggle a property between at most two values (set / cleared);
      // an animation passes through many. Anything with 3+ distinct values was animated.
      const keys = Object.entries(values).filter(([, seen]) => seen.length > 2);
      return [...new Set(keys.map(([key]) => key.split("|")[1]))].sort();
    });
    expect(animated.length).toBeGreaterThan(0);
    // transform-origin is set once per element; GSAP rewrites its % form as the equivalent px.
    for (const prop of animated)
      expect(["opacity", "transform", "translate", "transform-origin"]).toContain(prop);
  });

  test("navigating away and back 10 times leaks nothing and never double-triggers", async ({ page }) => {
    await enableProbe(page);
    await page.goto("/lab/");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.evaluate(() => ((window as ProbeWindow).__navMarker = 1));

    const snapshot = () =>
      page.evaluate(() => {
        const probe = (window as ProbeWindow).__MOTION_PROBE__ as Probe;
        return {
          triggers: probe.triggers(),
          animations: probe.animations(),
          cursors: document.querySelectorAll(".cursor").length,
          lines: document.querySelectorAll(".reveal__line").length,
          masks: document.querySelectorAll(".reveal__line-mask").length,
          nestedLines: document.querySelectorAll(".reveal__line .reveal__line").length,
          stillSamePage: (window as ProbeWindow).__navMarker === 1,
        };
      });
    const roundTrip = async () => {
      await page.getByRole("link", { name: "← Index" }).click();
      await page.waitForURL((url) => url.pathname === "/");
      await expect(page.locator(".reveal")).toHaveCount(0);
      await page.goBack();
      await page.waitForURL("**/lab/");
      await expect(page.locator("#reveal .reveal__line").first()).toBeAttached();
    };
    const settle = () => page.waitForTimeout(1200);

    // Baseline after one round trip: the first visit also carries one-off load
    // work (font-load re-split, initial paint) that later visits don't repeat.
    const first = await snapshot();
    await roundTrip();
    await settle();
    const baseline = await snapshot();
    expect(baseline.triggers).toBe(first.triggers);
    expect(baseline.triggers).toBeGreaterThan(0);
    expect(baseline.cursors).toBe(1);

    for (let i = 0; i < 10; i++) await roundTrip();
    await settle();

    // Same page instance (client-side navigation), same live GSAP state after 10 more round trips.
    expect(await snapshot()).toEqual(baseline);

    // Motions still fire exactly once after the round trips: REVEAL plays on entry,
    // then leaving and re-entering its trigger neither resets nor replays it.
    await playSection(page, "reveal");
    const lines = () => transformOf(page, "#reveal .reveal__line");
    for (const transform of await lines()) expect(IDENTITY).toContain(transform);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.locator("section#reveal").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(100); // a replay would show lines lowered again here
    for (const transform of await lines()) expect(IDENTITY).toContain(transform);
    expect((await snapshot()).triggers).toBeLessThanOrEqual(baseline.triggers);
  });

  test("cursor tracks the pointer, opens the lens over media and steps aside for text", async ({ page }) => {
    await page.goto("/lab/");
    const cursor = page.locator(".cursor");
    await expect(cursor).toHaveCount(1);
    await expect(cursor).toHaveCSS("opacity", "0");

    await page.mouse.move(200, 200);
    await page.mouse.move(240, 220, { steps: 4 });
    await expect(cursor).toHaveCSS("opacity", "1");
    await expect(page.locator("html")).toHaveAttribute("data-cursor", "custom");

    const media = page.locator("#cursor [data-cursor='drag']");
    await media.scrollIntoViewIfNeeded();
    const box = (await media.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
    await expect(cursor.locator("[data-part='label']")).toHaveText("drag");
    await expect(cursor.locator("[data-part='lens']")).toHaveCSS("opacity", "1");
    await expect(cursor.locator("[data-part='dot']")).toHaveCSS("opacity", "0");

    await page.locator("#lab-cursor-field").hover();
    await expect(cursor).toHaveAttribute("data-state", "text");
    await expect(page.locator("#lab-cursor-field")).toHaveCSS("cursor", "auto");

    await page.locator("#cursor [data-surface='paper']").hover();
    await expect(cursor).toHaveAttribute("data-surface", "paper");
  });

  test("magnetic pull stays within 6px and settles back", async ({ page }) => {
    await page.goto("/lab/");
    const button = page.locator("#magnetic .button[data-magnetic]:not(:disabled)");
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width - 1, box.y + 1, { steps: 8 });
    await page.waitForTimeout(600);
    const pulled = await button.evaluate((node) =>
      getComputedStyle(node).translate.split(" ").map(parseFloat),
    );
    expect(pulled[0]).toBeGreaterThan(4);
    expect(pulled[0]).toBeLessThanOrEqual(6);
    expect(pulled[1]).toBeLessThan(-4);
    expect(pulled[1]).toBeGreaterThanOrEqual(-6);

    await page.mouse.move(box.x + box.width / 2, box.y - 200, { steps: 4 });
    await page.waitForTimeout(600);
    expect(await button.evaluate((node) => getComputedStyle(node).translate)).toMatch(/^(none|0px( 0px)?)$/);
  });
});

test.describe("motion kit · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no splitting, counting, scrambling or drawing — content fades in", async ({ page }) => {
    await page.goto("/lab/");
    await expect(page.locator(".reveal__line")).toHaveCount(0);
    // Final values and labels are in place before anything scrolls into view.
    await expect(page.locator("#calibrate .counter:visible .counter__value")).toHaveText([
      /^(4|8|12)$/,
      "1.6",
    ]);
    await expect(page.locator("#annotate .part-label").first()).toHaveText("P/N 01 — Interface");
    for (const transform of await transformOf(
      page,
      "#annotate [data-anim-part='run'], #calibrate [data-anim-part='rule']",
    )) {
      expect(IDENTITY).toContain(transform);
    }

    for (const id of ["reveal", "annotate", "calibrate"]) {
      await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }
    await expect(page.locator("#reveal .reveal")).toHaveCSS("opacity", "1");
    await expect(page.locator("#annotate > div > .col-span-full").first()).toHaveCSS("opacity", "1");

    // INVERT fades its plate instead of wiping it: never scaled mid-way.
    await page.locator("section#invert").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const plate = page.locator(INVERT_PLATE);
    await expect(plate).toHaveCSS("opacity", "0");
    expect(IDENTITY).toContain(await plate.evaluate((n) => getComputedStyle(n).transform));
  });

  test("magnetic pull is off", async ({ page, isMobile }) => {
    test.skip(isMobile, "no pointer hover on mobile");
    await page.goto("/lab/");
    const button = page.locator("#magnetic .button[data-magnetic]:not(:disabled)");
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width - 1, box.y + 1, { steps: 8 });
    await page.waitForTimeout(500);
    expect(await button.evaluate((node) => getComputedStyle(node).translate)).toBe("none");
  });
});

test.describe("motion kit · touch", () => {
  test.skip(({ isMobile }) => !isMobile, "touch behaviour is checked on the mobile project");

  test("no custom cursor and no hidden native cursor on touch devices", async ({ page }) => {
    await page.goto("/lab/");
    await expect(page.locator(".cursor")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveAttribute("data-cursor", /.*/);
  });

  test("motions still play on mobile and leave no horizontal overflow", async ({ page }) => {
    await page.goto("/lab/");
    for (const id of ["reveal", "annotate", "calibrate", "invert"]) await playSection(page, id);
    await expect(page.locator("#calibrate .counter:visible .counter__value")).toHaveText(["4", "1.6"]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  });
});
