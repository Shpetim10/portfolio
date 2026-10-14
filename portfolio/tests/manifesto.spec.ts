import { expect, test, type Page } from "./fixtures";

/*
 * T04 manifesto + portrait. One sentence to a line; the line at the viewport
 * centre is lit (opacity), the lines above it read, the lines below unread, continuously
 * with scroll, like lyrics. The portrait unmasks top → bottom.
 * Contrast is measured from what is painted: each line's effective opacity
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

/** Minimum WCAG contrast of any line against carbon, plus each line's opacity. */
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
    const lines = [...text.querySelectorAll(".manifesto__line")];
    const opacities = lines.map(opacity);
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

  test("manifesto at reading size beside the portrait on desktop; portrait first on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const text = (await page.locator(".manifesto__text").boundingBox())!;
    const portrait = (await page.locator(".portrait").boundingBox())!;
    const style = await page.locator(".manifesto__text").evaluate((node) => {
      const s = getComputedStyle(node);
      return { fontSize: parseFloat(s.fontSize), lineHeight: s.lineHeight, family: s.fontFamily };
    });
    expect(style.family).not.toMatch(/Big Shoulders/i); // text face, not the condensed display face

    if (isMobile) {
      expect(portrait.y + portrait.height).toBeLessThanOrEqual(text.y);
      expect(style.fontSize).toBeLessThanOrEqual(40); // --manifesto-size: clamp(1.5rem, 2.6vw, 2.5rem)
    } else {
      expect(portrait.x).toBeGreaterThanOrEqual(text.x + text.width); // portrait in the right columns
      expect(Math.abs(portrait.y - text.y)).toBeLessThan(portrait.height); // same row
      expect(style.fontSize).toBeCloseTo(37.44, 1); // --manifesto-size at 1440: 2.6vw
      expect(parseFloat(style.lineHeight) / style.fontSize).toBeGreaterThanOrEqual(1.25);
    }
  });
});

/** Scrolls so line `index` sits at the viewport centre. */
async function centreLine(page: Page, index: number) {
  await page.evaluate((i) => {
    const line = document.querySelectorAll<HTMLElement>(".manifesto__line")[i];
    const rect = line.getBoundingClientRect();
    window.scrollBy(0, rect.top + rect.height / 2 - window.innerHeight / 2);
  }, index);
  await page.waitForTimeout(400);
}

test.describe("manifesto · lines", () => {
  test("one sentence per line, in order", async ({ page }) => {
    await page.goto("/");
    const lines = page.locator(".manifesto__line");
    expect(await lines.count()).toBeGreaterThan(1);
    for (const text of await lines.allTextContents()) expect(text.trim()).toMatch(/[.!?]$/);
    // Stacked, never side by side.
    const boxes = await lines.evaluateAll((nodes) =>
      nodes.map((node) => {
        const { top, bottom } = node.getBoundingClientRect();
        return { top, bottom };
      }),
    );
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom);
  });

  test("read · reading · unread: the line at the centre is lit, above it read, below it unread", async ({
    page,
  }) => {
    await page.goto("/");
    const token = (name: string) =>
      section(page).evaluate((node, n) => parseFloat(getComputedStyle(node).getPropertyValue(n)), name);
    const [read, unread] = [await token("--manifesto-read"), await token("--manifesto-unread")];
    expect(read).toBeGreaterThan(unread); // told apart by brightness alone
    const count = await page.locator(".manifesto__line").count();

    // Before the paragraph: everything is still to be read.
    await placeText(page, 0.95);
    let state = await measure(page);
    for (const value of state.opacities) expect(value).toBeCloseTo(unread, 2);
    expect(state.minContrast).toBeGreaterThanOrEqual(3);

    // Each line, centred in turn, is the one being read: lit; earlier lines read; later ones unread.
    for (const index of [0, Math.floor(count / 2), count - 1]) {
      await centreLine(page, index);
      state = await measure(page);
      expect(state.opacities[index]).toBeCloseTo(1, 1);
      expect(state.opacities[index]).toBe(Math.max(...state.opacities));
      expect(state.minContrast).toBeGreaterThanOrEqual(3);
      state.opacities.forEach((value, i) => {
        if (i < index) expect(value).toBeGreaterThanOrEqual(read - 0.01);
        if (i > index) expect(value).toBeLessThanOrEqual(unread + 0.01);
      });
    }

    // In the gap between two lines: the one leaving is part-way down to read, the one arriving part-way up
    // from unread (a hand-over, not a jump).
    await centreLine(page, 0);
    await page.evaluate(() => {
      const [a, b] = [...document.querySelectorAll<HTMLElement>(".manifesto__line")];
      const mid = (a.getBoundingClientRect().bottom + b.getBoundingClientRect().top) / 2; // the gap between them
      window.scrollBy(0, mid - window.innerHeight / 2);
    });
    await page.waitForTimeout(400);
    state = await measure(page);
    expect(state.opacities[0]).toBeLessThan(1);
    expect(state.opacities[1]).toBeLessThan(1);
    expect(state.opacities[0]).toBeGreaterThan(read - 0.01);
    expect(state.opacities[1]).toBeGreaterThan(unread);

    // Sweep the whole range in small steps: contrast never dips.
    for (let ratio = 1; ratio >= -1; ratio -= 0.125) {
      await placeText(page, ratio, 120);
      expect((await measure(page)).minContrast).toBeGreaterThanOrEqual(3);
    }

    // Long past: all read, none gone.
    await placeText(page, -3);
    state = await measure(page);
    for (const value of state.opacities) expect(value).toBeCloseTo(read, 2);
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

  test("no scrubbed lyric, no unmask: the paragraph and portrait fade in", async ({ page }) => {
    await page.goto("/");
    await placeText(page, 0.3, 600);
    for (const value of (await measure(page)).opacities) expect(value).toBeCloseTo(1, 2);
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
    for (const value of state.opacities) expect(value).toBe(1);
    expect(state.minContrast).toBeGreaterThan(15);
    const plate = page.locator('[data-manifesto="plate"]');
    expect(await plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d)).toBe(0);
    await expect(page.locator(".portrait__label")).toContainText(/^Operator — /i);
  });
});
