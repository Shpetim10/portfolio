import { expect, test, type Page } from "./fixtures";

/*
 * T04 manifesto + portrait. Words brighten dust → bone (opacity) as the
 * paragraph crosses the viewport centre; the portrait unmasks top → bottom.
 * Contrast is measured from what is painted: each word's effective opacity
 * (its own × every ancestor's) blends bone over carbon.
 */

const section = (page: Page) => page.locator("section#manifesto");

/** Scrolls so the paragraph's top sits at `ratio` of the viewport height, then lets things settle. */
async function placeText(page: Page, ratio: number, settle = 400) {
  await page.evaluate((r) => {
    const text = document.querySelector<HTMLElement>('[data-manifesto="text"]')!;
    const top = text.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight * r);
  }, ratio);
  await page.waitForTimeout(settle);
}

/** Minimum WCAG contrast of any word (or the unsplit paragraph) against carbon, plus each word's opacity. */
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
    const text = document.querySelector('[data-manifesto="text"]')!;
    const words = [...text.querySelectorAll(".manifesto__word")];
    const opacities = (words.length ? words : [text]).map(opacity);
    const contrast = (alpha: number) => {
      const lit = luminance(bone.map((c, i) => c * alpha + carbon[i] * (1 - alpha)));
      return (lit + 0.05) / (luminance(carbon) + 0.05);
    };
    return { opacities, minContrast: Math.min(...opacities.map(contrast)) };
  });

test.describe("manifesto · layout", () => {
  test("section index, manifesto and portrait with its caption", async ({ page }) => {
    await page.goto("/");
    const manifesto = section(page);
    await expect(manifesto).toHaveAttribute("aria-labelledby", "manifesto-index");
    await expect(manifesto.locator(".section-index")).toContainText("[02]");
    await expect(manifesto.locator(".section-index")).toContainText("Manifesto");
    // Missing content is marked, never invented.
    await expect(manifesto.locator(".manifesto__todo")).toBeVisible();
    await expect(manifesto.locator('[data-manifesto="text"]')).toHaveAttribute("data-todo", "");
    await expect(manifesto.locator(".portrait__placeholder [data-todo]")).toBeVisible();

    // The label decodes once the portrait has unmasked.
    const caption = manifesto.locator("figcaption");
    await caption.scrollIntoViewIfNeeded();
    await expect(caption.locator(".part-label")).toContainText(/operator —/i, { timeout: 4000 });
    // No experience dates yet: the dimension value is a marked placeholder, not a number.
    await expect(caption.locator(".dimension [data-todo]")).toHaveCount(1);
  });

  test("manifesto in display-m beside the portrait on desktop; portrait first on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const text = (await page.locator(".manifesto__text").boundingBox())!;
    const portrait = (await page.locator(".portrait").boundingBox())!;
    const style = await page.locator(".manifesto__text").evaluate((node) => {
      const s = getComputedStyle(node);
      return { fontSize: parseFloat(s.fontSize), family: s.fontFamily };
    });
    expect(style.family).not.toMatch(/Big Shoulders/i); // text face, not the condensed display face

    if (isMobile) {
      expect(portrait.y + portrait.height).toBeLessThanOrEqual(text.y);
      expect(style.fontSize).toBeLessThanOrEqual(32); // heading: clamp(1.5rem, 2.4vw, 2rem)
    } else {
      expect(portrait.x).toBeGreaterThanOrEqual(text.x + text.width); // portrait in the right columns
      expect(Math.abs(portrait.y - text.y)).toBeLessThan(portrait.height); // same row
      expect(style.fontSize).toBe(72); // display-m at 1440: 5vw capped at 4.5rem
    }
  });
});

test.describe("manifesto · words", () => {
  test("brighten in reading order as the paragraph crosses the centre; contrast passes throughout", async ({
    page,
  }) => {
    await page.goto("/");
    const dim = await section(page).evaluate((node) =>
      parseFloat(getComputedStyle(node).getPropertyValue("--manifesto-dim")),
    );
    await expect(page.locator(".manifesto__word").first()).toBeAttached();

    // Before the centre: every word dimmed, none below the floor.
    await placeText(page, 0.9);
    let state = await measure(page);
    for (const value of state.opacities) expect(value).toBeCloseTo(dim, 2);
    expect(state.minContrast).toBeGreaterThanOrEqual(4.5);

    // Halfway through the centre: earlier words brighter than later ones.
    const height = await page
      .locator(".manifesto__text")
      .evaluate((node) => node.getBoundingClientRect().height);
    const viewport = page.viewportSize()!.height;
    await placeText(page, 0.5 - height / 2 / viewport);
    state = await measure(page);
    expect(state.opacities[0]).toBeGreaterThan(state.opacities.at(-1)!);
    expect(state.minContrast).toBeGreaterThanOrEqual(4.5);

    // Sweep the whole range in small steps: contrast never dips.
    for (let ratio = 1; ratio >= -1; ratio -= 0.125) {
      await placeText(page, ratio, 120);
      expect((await measure(page)).minContrast).toBeGreaterThanOrEqual(4.5);
    }

    // Past the centre: fully bone.
    await placeText(page, -1);
    state = await measure(page);
    for (const value of state.opacities) expect(value).toBeCloseTo(1, 2);
  });
});

test.describe("manifesto · portrait", () => {
  test("unmasks top → bottom when it enters, then the caption is drawn", async ({ page }) => {
    await page.goto("/");
    const plate = page.locator('[data-manifesto="plate"]');
    const scaleY = () => plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d);
    await expect.poll(scaleY).toBe(1); // covered, waiting below the fold

    await page.locator(".portrait").scrollIntoViewIfNeeded();
    await expect.poll(scaleY, { timeout: 4000 }).toBe(0);
    const label = page.locator(".portrait__label");
    await expect(label).toHaveCSS("opacity", "1");
    await expect(label).toContainText(/^Operator — /i);
  });
});

test.describe("manifesto · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no split, no unmask: the paragraph and portrait fade in", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".manifesto__word")).toHaveCount(0);
    await placeText(page, 0.3, 600);
    expect((await measure(page)).opacities[0]).toBeCloseTo(1, 2);
    const plate = page.locator('[data-manifesto="plate"]');
    expect(await plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d)).toBe(0);
    await expect(page.locator(".portrait")).toHaveCSS("opacity", "1");
  });
});

test.describe("manifesto · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("text fully readable at full contrast, portrait uncovered", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".manifesto__text")).toBeVisible();
    const state = await measure(page);
    expect(state.opacities).toEqual([1]);
    expect(state.minContrast).toBeGreaterThan(15);
    const plate = page.locator('[data-manifesto="plate"]');
    expect(await plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d)).toBe(0);
    await expect(page.locator(".portrait__label")).toContainText(/^Operator — /i);
  });
});
