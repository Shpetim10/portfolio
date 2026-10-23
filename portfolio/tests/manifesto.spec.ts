import { expect, test, type Page } from "./fixtures";

/*
 * T04c manifesto with Winged Victory + signature block. One progress value p
 * drives the section: words light in reading order up to p 0.88, Victory
 * assembles and completes exactly with the last word, and the wing annotation
 * shows from p 0.9. Desktop pins the stage (CSS sticky); compact keeps Victory
 * in a sticky band. Contrast is measured from what is painted: each word's
 * effective opacity (its own × every ancestor's) blends bone over carbon.
 */

type Read = {
  p: number;
  sculpture: number;
  formedAt: number;
  noted: boolean;
  start: number;
  end: number;
};
type ProbeWindow = Window & { __MANIFESTO_PROBE__?: { read?: () => Read } };

const withProbe = (page: Page) =>
  page.addInitScript(() => {
    (window as ProbeWindow).__MANIFESTO_PROBE__ = {};
  });
const read = (page: Page) => page.evaluate(() => (window as ProbeWindow).__MANIFESTO_PROBE__!.read!());
const ready = (page: Page) =>
  expect
    .poll(() => page.evaluate(() => typeof (window as ProbeWindow).__MANIFESTO_PROBE__?.read))
    .toBe("function");

const section = (page: Page) => page.locator("section#manifesto");

/** Scrolls to progress p, then lets the scroll settle. */
async function toProgress(page: Page, p: number, settle = 300) {
  const { start, end } = await read(page);
  await page.evaluate((y) => window.scrollTo(0, y), start + (end - start) * p);
  await page.waitForTimeout(settle);
}

/** Every word's painted opacity, and the minimum WCAG contrast of any word against carbon. */
const measure = (page: Page) =>
  page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const hex = (name: string) =>
      root
        .getPropertyValue(name)
        .trim()
        .replace("#", "")
        .match(/../g)!
        .map((pair) => parseInt(pair, 16));
    const bone = hex("--color-bone");
    const carbon = hex("--color-carbon");
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const opacity = (node: Element | null) => {
      let value = 1;
      for (let el = node; el; el = el.parentElement) value *= Number(getComputedStyle(el).opacity);
      return value;
    };
    const words = [...document.querySelectorAll('[data-manifesto="word"]')];
    const opacities = words.map(opacity);
    const contrast = (alpha: number) => {
      const lit = luminance(bone.map((c, i) => c * alpha + carbon[i] * (1 - alpha)));
      return (lit + 0.05) / (luminance(carbon) + 0.05);
    };
    return { opacities, minContrast: Math.min(...opacities.map(contrast)) };
  });

test.describe("manifesto · layout", () => {
  test("manifesto, Victory and the signature block, in reading order", async ({ page }) => {
    await page.goto("/");
    const manifesto = section(page);
    await expect(manifesto).toHaveAttribute("aria-labelledby", "manifesto-index");
    await expect(manifesto.locator(".section-index")).toContainText("[02]");

    // Real text, one sentence per line, in order, before the figure in the DOM.
    const lines = manifesto.locator(".manifesto__line");
    expect(await lines.count()).toBeGreaterThan(1);
    for (const text of await lines.allTextContents()) expect(text.trim()).toMatch(/[.!?]$/);
    const order = await manifesto.evaluate((node) => {
      const text = node.querySelector(".manifesto__text")!;
      const figure = node.querySelector(".victory")!;
      return text.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBeTruthy();
    // No extra headline: the manifesto is the only large text.
    await expect(manifesto.locator("h1, h2, h3")).toHaveCount(0);

    await expect(manifesto.locator(".victory figcaption")).toHaveText(
      "After the Winged Victory of Samothrace, c. 190 BC. Rebuilt in code.",
    );
    await expect(manifesto.locator(".sculpture__pre")).toHaveAttribute("aria-hidden", "true");

    // Signature: portrait (alt from content), name, role · city, signed line. The old caption is gone.
    const signature = manifesto.locator(".signature");
    await expect(signature.locator("img")).toHaveAttribute("alt", /Shpëtim Shabanaj/);
    await expect(signature.locator(".signature__name")).toHaveText("Shpëtim Shabanaj");
    await expect(signature.locator(".signature__role")).toHaveText("Software Engineer · Tiranë");
    await expect(signature.locator(".signature__sign")).toHaveText("— Shpëtim Shabanaj");
    await expect(manifesto.locator(".part-label, .dimension")).toHaveCount(0);
  });

  test("desktop: manifesto in columns 1–7, Victory in 8–12, fitted and facing it", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "desktop layout");
    await withProbe(page);
    await page.goto("/");
    await ready(page);
    await toProgress(page, 0.5);
    const box = (selector: string) =>
      page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON());
    const [text, plate] = [await box(".manifesto__text"), await box(".victory__plate")];
    expect(plate.x).toBeGreaterThanOrEqual(text.x + text.width);
    const viewport = page.viewportSize()!;
    expect(plate.height).toBeLessThanOrEqual(Math.min(viewport.height * 0.8, 780) + 0.5);
    // Never cropped: the whole sculpture and the whole manifesto are on screen while pinned.
    for (const rect of [text, plate]) {
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});

test.describe("manifesto · progress", () => {
  test.beforeEach(async ({ page }) => {
    await withProbe(page);
    await page.goto("/");
    await ready(page);
  });

  test("words light in order; contrast holds at every position", async ({ page }) => {
    const unread = await section(page).evaluate((node) =>
      parseFloat(getComputedStyle(node).getPropertyValue("--manifesto-unread")),
    );
    await toProgress(page, 0);
    let state = await measure(page);
    for (const value of state.opacities) expect(value).toBeCloseTo(unread, 2);

    await toProgress(page, 0.44);
    state = await measure(page);
    const half = state.opacities.length / 2;
    expect(state.opacities[0]).toBeCloseTo(1, 2);
    expect(state.opacities[Math.floor(half * 0.5)]).toBeCloseTo(1, 2);
    expect(state.opacities.at(-1)).toBeCloseTo(unread, 2);
    // Monotonic: lit words never follow unlit ones.
    for (let i = 1; i < state.opacities.length; i++)
      expect(state.opacities[i]).toBeLessThanOrEqual(state.opacities[i - 1] + 0.001);

    for (let p = -0.2; p <= 1.2; p += 0.1) {
      await toProgress(page, p, 80);
      expect((await measure(page)).minContrast).toBeGreaterThanOrEqual(3);
    }
    await toProgress(page, 1);
    for (const value of (await measure(page)).opacities) expect(value).toBeCloseTo(1, 2);
  });

  test("Victory completes exactly with the last word, at any speed, both ways", async ({ page }) => {
    const { formedAt } = await read(page);
    expect(formedAt).toBeGreaterThan(0.8);
    expect(formedAt).toBeLessThanOrEqual(0.88);
    // Probe and painted word read in one task, so they always describe the same update.
    const sample = () =>
      page.evaluate(() => {
        const words = document.querySelectorAll('[data-manifesto="word"]');
        const lit = Number(getComputedStyle(words[words.length - 1]).opacity);
        return { ...(window as ProbeWindow).__MANIFESTO_PROBE__!.read!(), lit };
      });

    // Jumps, no settling: forwards past the end, back to the start, to just short of the end, and back.
    for (const [p, settle] of [
      [1, 0],
      [0, 0],
      [formedAt - 0.03, 0],
      [1.3, 0],
      [0.2, 0],
      [formedAt, 0],
    ] as const) {
      await toProgress(page, p, settle);
      const { lit, ...state } = await sample();
      if (state.p >= state.formedAt) {
        expect(state.sculpture).toBe(1);
        expect(lit).toBeCloseTo(1, 2);
      } else if (state.p < state.formedAt - 0.001) {
        expect(state.sculpture).toBeLessThan(1);
        expect(lit).toBeLessThan(1);
        expect(state.sculpture).toBeCloseTo(state.p / state.formedAt, 3);
      }
    }
  });

  test("the annotation shows from p 0.9 and hides again below it", async ({ page, isMobile }) => {
    await toProgress(page, 0.85);
    expect((await read(page)).noted).toBe(false);
    await toProgress(page, 0.95, 1200);
    expect((await read(page)).noted).toBe(true);
    if (isMobile) {
      await expect(page.locator(".victory__spec")).toHaveCSS("opacity", "1");
      await expect(page.locator(".victory__spec")).toHaveText(/Material: Code\s*Direction: Forward/i);
    } else {
      const label = page.locator(".victory__leader .leader__label");
      await expect(label).toHaveText(/Material: Code\s*Direction: Forward/i);
      await expect(label).toHaveCSS("opacity", "1");
    }
    await toProgress(page, 0.5, 1200);
    expect((await read(page)).noted).toBe(false);
    if (isMobile) await expect(page.locator(".victory__spec")).toHaveCSS("opacity", "0");
    else await expect(page.locator(".victory__leader .leader__label")).toHaveCSS("opacity", "0");
  });

  test("the canvas takes over the pre's exact box", async ({ page }) => {
    await toProgress(page, 0.5);
    const sculpture = section(page).locator(".sculpture[data-live]");
    await sculpture.waitFor();
    const [pre, canvas] = await Promise.all(
      [".sculpture__pre", ".sculpture__canvas"].map((selector) =>
        sculpture
          .locator(selector)
          .first()
          .evaluate((el) => el.getBoundingClientRect().toJSON()),
      ),
    );
    expect(canvas).toEqual(pre);
  });
});

test.describe("manifesto · pin and band", () => {
  test("desktop: the stage holds still for the pin, ≥ 40vh after the hero's", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop pin");
    await withProbe(page);
    await page.goto("/");
    await ready(page);
    const { start, end } = await read(page);
    const height = page.viewportSize()!.height;
    expect(end - start).toBeCloseTo(height * 1.8, -1); // --manifesto-pin: 180vh

    // The hero's pinned scene ends when its track's bottom meets the viewport's.
    const heroEnd = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".hero")!;
      return hero.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    });
    expect(start - heroEnd).toBeGreaterThanOrEqual(height * 0.4);

    const stageTop = () => page.locator(".manifesto__stage").evaluate((el) => el.getBoundingClientRect().top);
    await toProgress(page, 0.1);
    const pinned = await stageTop();
    for (const p of [0.5, 0.9]) {
      await toProgress(page, p);
      expect(await stageTop()).toBeCloseTo(pinned, 0);
    }
  });

  test("compact: Victory sticks in a band no taller than 46svh", async ({ page, isMobile }) => {
    test.skip(!isMobile, "compact band");
    await withProbe(page);
    await page.goto("/");
    await ready(page);
    const band = page.locator(".victory");
    const height = page.viewportSize()!.height;
    for (const p of [0.2, 0.6, 1]) {
      await toProgress(page, p);
      const rect = await band.evaluate((el) => el.getBoundingClientRect().toJSON());
      expect(rect.height).toBeLessThanOrEqual(height * 0.46 + 0.5);
      expect(rect.top).toBeCloseTo(64, 0); // under the header
    }
  });

  test("no horizontal scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await withProbe(page);
    await page.goto("/");
    await ready(page);
    for (const p of [0, 0.5, 1]) {
      await toProgress(page, p);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    }
  });
});

test.describe("manifesto · portrait", () => {
  test("unmasks top → bottom when it enters", async ({ page }) => {
    await page.goto("/");
    const plate = page.locator('[data-manifesto="plate"]');
    const scaleY = () => plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d);
    await expect.poll(scaleY).toBe(1); // covered, waiting below the fold
    await page.locator(".portrait").scrollIntoViewIfNeeded();
    await expect.poll(scaleY, { timeout: 4000 }).toBe(0);
  });

  test("the hall-of-fame plaque sits on the page's centre axis, with both tenure figures", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator(".portrait").scrollIntoViewIfNeeded();
    const signature = page.locator(".signature");
    await expect(signature.locator(".signature__eyebrow")).toHaveText("Hall of Fame");
    await expect(signature.locator(".signature__figure")).toHaveText([
      /1\s*YR\s*Industry experience/,
      /4\s*YRS\s*Field involvement/,
    ]);
    const vw = page.viewportSize()!.width;
    for (const selector of [".portrait", ".signature__text"]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(Math.abs(box.x - (vw - box.x - box.width))).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("manifesto · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no pin, no band: all bone, Victory complete, annotation shown, portrait faded in", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    await expect(page.locator(".manifesto")).not.toHaveAttribute("data-mode", /.*/);
    await expect(page.locator(".manifesto__stage")).toHaveCSS("position", "static");
    await expect(page.locator(".victory")).toHaveCSS("position", "static");
    await page.locator(".manifesto__text").scrollIntoViewIfNeeded();
    for (const value of (await measure(page)).opacities) expect(value).toBe(1);
    await expect(section(page).locator(".sculpture__canvas")).toHaveCount(0);
    await expect(section(page).locator(".sculpture__pre")).toBeVisible();
    await expect(page.locator(isMobile ? ".victory__spec" : ".victory__leader .leader__label")).toBeVisible();
    await page.locator(".portrait").scrollIntoViewIfNeeded();
    await expect(page.locator(".portrait")).toHaveCSS("opacity", "1");
  });
});

test.describe("manifesto · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("text fully readable at full contrast, Victory complete, portrait uncovered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".manifesto__text")).toBeVisible();
    const state = await measure(page);
    for (const value of state.opacities) expect(value).toBe(1);
    expect(state.minContrast).toBeGreaterThan(15);
    await expect(section(page).locator(".sculpture__pre")).toBeVisible();
    await expect(page.locator(".victory figcaption")).toBeVisible();
    const plate = page.locator('[data-manifesto="plate"]');
    expect(await plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d)).toBe(0);
  });
});
