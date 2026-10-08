import { expect, test, type Page } from "./fixtures";

/*
 * T10 awards. The owner's awards aren't supplied yet, so the homepage shows one
 * marked placeholder certificate; the populated record runs on /lab, where this
 * repository's own CI gates and font licences are filed as six entries.
 */

const section = (page: Page) => page.locator("section#awards");
const surface = (page: Page) => page.locator(".inversion").filter({ has: section(page) });
const exitPlate = (page: Page) => surface(page).locator("[data-anim-part='exit-plate']");

/** Scrolls so the section's bottom edge sits at `fraction` of the viewport height. */
const bottomAt = (page: Page, fraction: number) =>
  section(page).evaluate((node, f) => {
    const bottom = node.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo(0, bottom - window.innerHeight * f);
  }, fraction);

/** WCAG relative-luminance contrast of two "rgb(r, g, b)" colours. */
const contrast = (a: string, b: string) => {
  const lum = (rgb: string) => {
    const [r, g, bl] = rgb
      .match(/\d+(\.\d+)?/g)!
      .slice(0, 3)
      .map((c) => {
        const v = Number(c) / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test.describe("awards · homepage", () => {
  test("section [07] is a paper surface with one placeholder certificate", async ({ page }) => {
    await page.goto("/");
    await expect(section(page)).toHaveAttribute("aria-labelledby", "awards-index");
    await expect(section(page).locator(".section-index")).toContainText("[07]");
    await expect(section(page).locator(".section-index")).toContainText("Awards & Achievements");
    await expect(section(page).locator("h2")).toHaveText("Qualification record · 01 entry");
    await expect(surface(page)).toHaveAttribute("data-surface", "paper");
    await expect(section(page).locator(".certificate")).toHaveCount(1);
    // Title, issuer, year, why, proof and the rest of the record are all unsupplied.
    await expect(section(page).locator("[data-todo]")).toHaveCount(6);
    await expect(section(page).locator(".record__filter")).toHaveCount(0);
  });
});

test.describe("awards · qualification record", () => {
  test("exactly one featured certificate with seal, fields and proof", async ({ page }) => {
    await page.goto("/lab/");
    const certificate = section(page).locator(".certificate");
    await expect(certificate).toHaveCount(1);
    await expect(certificate.locator("h3")).toHaveText("Accessibility score of 0.95 or better");
    await expect(certificate.locator("dt")).toHaveText(["Issuer", "Year", "Placement", "Category"]);
    await expect(certificate.locator(".seal")).toBeVisible();
    await expect(certificate.locator(".seal__core")).toHaveCSS("fill", "rgb(255, 79, 0)");
    await expect(certificate.locator(".proof__link")).toHaveText(/^Verify →/);
    await expect(section(page).locator("h2")).toHaveText("Qualification record · 06 entries");
  });

  test("every proof link opens in a new tab with rel=noopener", async ({ page }) => {
    await page.goto("/lab/");
    const proofs = section(page).locator(".proof__link");
    await expect(proofs).toHaveCount(6);
    for (const proof of await proofs.all()) {
      await expect(proof).toHaveAttribute("target", "_blank");
      await expect(proof).toHaveAttribute("rel", /\bnoopener\b/);
      await expect(proof).toHaveAttribute("href", /^https:\/\//);
    }
  });

  test("filters are toggle buttons that show one category at a time", async ({ page }) => {
    await page.goto("/lab/");
    const filters = section(page).locator(".record__filters button");
    await expect(filters).toHaveText([
      "All05, 5 entries",
      "Certification02, 2 entries",
      "Open source03, 3 entries",
    ]);
    await expect(filters.first()).toHaveAttribute("aria-pressed", "true");
    const groups = section(page).locator(".record__group");
    await expect(groups).toHaveCount(2);
    await expect(groups.locator(".award")).toHaveCount(5);

    await filters.nth(2).click();
    await expect(filters.nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect(filters.first()).toHaveAttribute("aria-pressed", "false");
    await expect(groups.first()).toBeHidden();
    await expect(groups.nth(1)).toBeVisible();
    await expect(section(page).locator("[aria-live='polite']")).toHaveText("Showing 3 entries, open source.");

    await filters.first().click();
    await expect(groups.first()).toBeVisible();
    await expect(section(page).locator(".certificate")).toBeVisible();
  });

  test("text is ink on paper, AA and better", async ({ page }) => {
    await page.goto("/lab/");
    const paper = await surface(page).evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(paper).toBe("rgb(239, 234, 224)");
    const colours = await section(page)
      .locator(
        ".awards__label, .certificate__title, dt, dd, .award__why, .proof__source, .stamp, [aria-pressed='false']",
      )
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).color));
    for (const colour of new Set(colours)) expect(contrast(colour, paper)).toBeGreaterThanOrEqual(4.5);
    // The pressed tab inverts: paper on an ink fill.
    const pressed = await section(page)
      .locator("[aria-pressed='true']")
      .evaluate((node) => [getComputedStyle(node).color, getComputedStyle(node).backgroundColor]);
    expect(contrast(pressed[0], pressed[1])).toBeGreaterThanOrEqual(4.5);
  });

  test("the section inverts back to carbon as it leaves, and again on the way back", async ({ page }) => {
    await page.goto("/lab/");
    await bottomAt(page, 1.2);
    await page.waitForTimeout(1400);
    await bottomAt(page, 0.2);
    await page.waitForTimeout(1400);
    await expect(exitPlate(page)).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await bottomAt(page, 0.9);
    await page.waitForTimeout(1400);
    await expect(exitPlate(page)).toHaveCSS("transform", "matrix(1, 0, 0, 0, 0, 0)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });

  test("focus inside the section is never hidden under the exit plate", async ({ page }) => {
    await page.goto("/lab/");
    await bottomAt(page, 0.2);
    await page.waitForTimeout(1400);
    await section(page).locator(".proof__link").last().focus();
    await expect(exitPlate(page)).toHaveCSS("visibility", "hidden");
  });
});

test.describe("awards · mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "the scrolling tabs are the phone layout");

  test("featured card is full width; filters scroll sideways, the page doesn't", async ({ page }) => {
    await page.goto("/lab/");
    const certificate = section(page).locator(".certificate");
    const width = await certificate.evaluate((node) => node.getBoundingClientRect().width);
    const content = await section(page)
      .locator(".awards")
      .evaluate((node) => node.getBoundingClientRect().width);
    expect(width).toBeCloseTo(content, 0);
    const filters = section(page).locator(".record__filters");
    await expect(filters).toHaveCSS("overflow-x", "auto");
    const edges = await filters.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, viewport: window.innerWidth };
    });
    expect(edges.left).toBeCloseTo(0, 0);
    expect(edges.right).toBeCloseTo(edges.viewport, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });
});

test.describe("awards · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the record appears in place; the exit fades instead of wiping", async ({ page }) => {
    await page.goto("/lab/");
    await section(page).locator(".record").scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(section(page).locator(".record")).toHaveCSS("opacity", "1");
    const transforms = await section(page)
      .locator("[data-awards='card'], [data-awards='seal-dial']")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
    for (const transform of transforms) expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    await expect(section(page).locator("[data-awards='decode']").last()).toHaveText("OSS · 06");

    await bottomAt(page, 0.2);
    await page.waitForTimeout(600);
    await expect(exitPlate(page)).toHaveCSS("opacity", "1");
    await expect(exitPlate(page)).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  });
});
