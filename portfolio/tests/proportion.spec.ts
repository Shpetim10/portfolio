import { expect, test, type Page } from "./fixtures";

/*
 * T09d proportion bridge — the Vitruvian Man between Experience and Education.
 * Covers the markup (an aside, not a section; indexes untouched), the scroll
 * mapping without any pin, the note thresholds, the labels staying on their
 * anchors at every width, the links, and the reduced-motion state.
 */

type Read = {
  p: number;
  drawing: number;
  shown: { practice: boolean; theory: boolean };
  start: number;
  end: number;
};
type ProbeWindow = Window & {
  __PROPORTION_PROBE__?: { read?: () => Read; hold?: (value: number | null) => void };
};

const band = (page: Page) => page.locator("aside.proportion");

const withProbe = (page: Page) =>
  page.addInitScript(() => {
    (window as ProbeWindow).__PROPORTION_PROBE__ = {};
  });
const read = (page: Page) => page.evaluate(() => (window as ProbeWindow).__PROPORTION_PROBE__!.read!());
const hold = (page: Page, value: number | null) =>
  page.evaluate((v) => (window as ProbeWindow).__PROPORTION_PROBE__!.hold!(v), value);
const probeReady = (page: Page) =>
  expect
    .poll(() => page.evaluate(() => typeof (window as ProbeWindow).__PROPORTION_PROBE__?.read))
    .toBe("function");

/** Centres the band in the viewport and lets Lenis settle. */
const frameBand = async (page: Page) => {
  await band(page).evaluate((el: HTMLElement) =>
    window.scrollTo({
      top: el.getBoundingClientRect().top + scrollY - (innerHeight - el.offsetHeight) / 2,
      behavior: "instant",
    }),
  );
  await page.waitForTimeout(800);
};

/** Distance between each note's target (its signal dot) and the drawing anchor it marks. */
const anchorErrors = (page: Page) =>
  band(page).evaluate((root) => {
    const [square, ...halves] = root.querySelectorAll<SVGPathElement>(".drawing__geometry path");
    const sq = square.getBoundingClientRect();
    // The circle (an ellipse once the box isn't square): the union of its two halves.
    const [a, b] = halves.map((half) => half.getBoundingClientRect());
    const left = Math.min(a.left, b.left);
    const ry = (Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top)) / 2;
    const rx = (Math.max(a.right, b.right) - left) / 2;
    const cx = left + rx;
    const cy = Math.min(a.top, b.top) + ry;
    const centre = (el: Element | null) => {
      const b = el!.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    };
    const desktop = matchMedia("(width >= 64rem)").matches;
    const targets = desktop
      ? {
          practice: { x: sq.right, y: sq.top },
          theory: { x: cx - rx * Math.SQRT1_2, y: cy + ry * Math.SQRT1_2 },
        }
      : { practice: { x: sq.left + sq.width / 2, y: sq.top }, theory: { x: cx, y: cy + ry } };
    const dot = (note: string) =>
      centre(
        root.querySelector(
          desktop
            ? `.proportion__leader[data-note="${note}"] .leader__dot`
            : `.proportion__stem[data-note="${note}"] .proportion__stem-dot`,
        ),
      );
    return (["practice", "theory"] as const).map((note) => {
      const d = dot(note);
      return Math.hypot(d.x - targets[note].x, d.y - targets[note].y);
    });
  });

test.describe("proportion bridge", () => {
  test("an aside between Experience and Education; section indexes untouched", async ({ page }) => {
    await page.goto("/");
    const order = await page.locator("main > *").evaluateAll((all) => all.map((el) => el.id || el.className));
    const experience = order.indexOf("experience");
    expect(order[experience + 1]).toContain("proportion");
    expect(order[experience + 2]).toBe("education");

    await expect(page.getByRole("complementary", { name: "Proportion" })).toHaveCount(1);
    await expect(band(page).locator("section, h2, .section-index")).toHaveCount(0);
    await expect(band(page).locator("figure figcaption")).toContainText(
      "After Leonardo da Vinci, Vitruvian Man, c. 1490.",
    );
    // The scan's credit, as its photographer asks, beside the image.
    await expect(band(page).locator("figcaption")).toContainText("Photo: Luc Viatour / Lucnix.be");
    await expect(band(page).getByRole("link", { name: "Lucnix.be" })).toHaveAttribute(
      "href",
      "https://lucnix.be",
    );
    await expect(page.locator("#experience .section-index")).toContainText("[06]");
    await expect(page.locator("#education .section-index")).toContainText("[07]");
    await expect(page.locator("#awards .section-index")).toContainText("[08]");
  });

  test("Experience's bottom and Education's top padding are halved", async ({ page }) => {
    await page.goto("/");
    const pads = await page.evaluate(() => {
      const pad = (selector: string, side: "paddingTop" | "paddingBottom") =>
        parseFloat(getComputedStyle(document.querySelector(selector)!)[side]);
      return {
        experience: pad("#experience > .section-pad", "paddingBottom"),
        education: pad("#education > .section-pad", "paddingTop"),
        normal: pad("#experience > .section-pad", "paddingTop"),
      };
    });
    expect(pads.experience).toBeCloseTo(pads.normal / 2, 0);
    expect(pads.education).toBeCloseTo(pads.normal / 2, 0);
  });

  test("holds still while the figure forms, then scrolls on; the scroll itself never stops", async ({
    page,
  }) => {
    await withProbe(page);
    await page.goto("/");
    await probeReady(page);
    await expect(band(page)).toHaveAttribute("data-mode", "live");
    // CSS sticky, never a ScrollTrigger pin: nothing is reparented or wrapped in a spacer.
    await expect(page.locator(".pin-spacer")).toHaveCount(0);
    await expect(band(page).locator(".proportion__figure")).toHaveCSS("position", "sticky");

    const { start, end } = await read(page);
    const geometry = await band(page).evaluate((el: HTMLElement) => ({
      top: el.getBoundingClientRect().top + scrollY,
      height: el.offsetHeight,
      vh: innerHeight,
    }));
    const stickAt = geometry.top;
    const releaseAt = geometry.top + geometry.height - geometry.vh;
    expect(start).toBeCloseTo(geometry.top - geometry.vh * 0.85, -1);
    // The stage is still before the figure starts forming (p .45) …
    expect((stickAt - start) / (end - start)).toBeLessThan(0.45);
    // … and the finished drawing is held a while before it moves again.
    expect(releaseAt - end).toBeGreaterThan(geometry.vh * 0.1);

    const at = async (y: number) => {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      await page.waitForTimeout(600);
      return page.evaluate(() => ({
        y: scrollY,
        stage: document.querySelector(".proportion__figure")!.getBoundingClientRect().top,
        band: document.querySelector("aside.proportion")!.getBoundingClientRect().top,
      }));
    };
    for (const f of [0.1, 0.45, 0.7, 1]) {
      const y = stickAt + (releaseAt - stickAt) * f;
      const state = await at(y);
      expect(state.band + state.y).toBeCloseTo(geometry.top, 0); // the page scrolls 1:1 underneath
      expect(Math.abs(state.stage)).toBeLessThan(1); // the stage holds still
      const { p } = await read(page);
      expect(p).toBeCloseTo(Math.min(1, (state.y - start) / (end - start)), 2);
    }
    expect((await read(page)).p).toBe(1);
    expect((await at(releaseAt + 200)).stage).toBeCloseTo(-200, -1); // released
  });

  test("PRACTICE is drawn from p .30, THEORY from p .55, both ways", async ({ page }) => {
    await withProbe(page);
    await page.goto("/");
    await probeReady(page);
    await frameBand(page);
    const expectations: [number, boolean, boolean][] = [
      [0.1, false, false],
      [0.31, true, false],
      [0.56, true, true],
      [1, true, true],
      [0.4, true, false],
      [0, false, false],
    ];
    for (const [p, practice, theory] of expectations) {
      await hold(page, p);
      const state = await read(page);
      expect(state.drawing).toBeCloseTo(p, 3);
      expect(state.shown).toEqual({ practice, theory });
    }
  });

  test("labels stay on the square and circle at every width", async ({ page }) => {
    await withProbe(page);
    for (const width of [320, 375, 768, 1023, 1024, 1280, 1440, 1920, 2560]) {
      await page.setViewportSize({ width, height: width >= 1024 ? 900 : 800 });
      await page.goto("/");
      await probeReady(page);
      await frameBand(page);
      await hold(page, 1);
      await page.waitForTimeout(900); // ANNOTATE runs to the end
      for (const error of await anchorErrors(page)) expect(error, `at ${width}px`).toBeLessThan(2);
      // The notes never leave the page.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("the links reach Experience and Education by keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/");
    await frameBand(page);
    const practice = band(page).getByRole("link", { name: "Practice: up to Experience" });
    const theory = band(page).getByRole("link", { name: "Theory: down to Education" });
    await expect(practice).toHaveAttribute("href", "#experience");
    await expect(theory).toHaveAttribute("href", "#education");

    await practice.focus();
    await expect(practice).toBeFocused();
    await expect(practice).toHaveCSS("outline-style", "solid");
    // Focused, the note is drawn whatever p is.
    await expect(band(page).locator('.proportion__leader[data-note="practice"] .leader__label')).toHaveCSS(
      "opacity",
      "1",
    );
    await page.keyboard.press("Tab");
    await expect(theory).toBeFocused();

    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.locator("#education").evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBeLessThan(5);
    await frameBand(page);
    await practice.click();
    await expect
      .poll(() => page.locator("#experience").evaluate((el) => Math.round(el.getBoundingClientRect().top)))
      .toBeLessThan(5);
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("final drawing, both notes and both hairlines shown, nothing animated", async ({
      page,
      isMobile,
    }) => {
      await page.goto("/");
      await frameBand(page);
      await expect(band(page).locator(".drawing")).not.toHaveAttribute("data-live", /.*/);
      const notes = isMobile ? ".proportion__stem-label" : ".proportion__leader .leader__label";
      for (const label of await band(page).locator(notes).all())
        await expect(label).toHaveCSS("opacity", "1");
      const threads = isMobile ? ".proportion__stem-thread" : ".proportion__thread";
      for (const thread of await band(page).locator(threads).all()) await expect(thread).toBeVisible();
      for (const error of await anchorErrors(page)) expect(error).toBeLessThan(2);
    });
  });
});
