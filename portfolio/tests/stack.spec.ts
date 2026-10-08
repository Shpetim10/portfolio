import { expect, test, type Page } from "./fixtures";

/*
 * T08 stack. The owner's skills aren't supplied yet, so the homepage shows the
 * five layer groups with marked placeholders; the populated bill of materials
 * runs on /lab, where this site's own technologies are filed by layer and
 * "used in" the specimen projects carrying that layer (Services left empty).
 */

const LAYERS = ["interface", "api", "services", "data", "infrastructure"];

const lit = (page: Page, selector: string, attribute: string) =>
  page
    .locator(`#stack ${selector}[data-lit]`)
    .evaluateAll((nodes, key) => nodes.map((node) => node.getAttribute(key)), attribute);

const litPlates = (page: Page) => lit(page, ".instrument-drawing__plate", "data-layer");
const litProjects = (page: Page) => lit(page, ".stack__index-item", "data-slug");

test.describe("stack · homepage", () => {
  test("section [05] files every layer, missing technologies marked", async ({ page, isMobile }) => {
    await page.goto("/");
    const section = page.locator("section#stack");
    await expect(section).toHaveAttribute("aria-labelledby", "stack-index");
    await expect(section.locator(".section-index")).toContainText("[05]");
    await expect(section.locator(".section-index")).toContainText("Stack");
    await expect(section.locator("h2")).toHaveText("Bill of materials");
    const groups = isMobile ? section.locator("details") : section.locator("tbody");
    await expect(groups).toHaveCount(5);
    await expect(section.locator(isMobile ? "details [data-todo]" : "tbody [data-todo]")).toHaveCount(5);
    // No logos, no bars: nothing in the section is an image or a meter.
    await expect(section.locator("img, progress, meter")).toHaveCount(0);
  });
});

test.describe("stack · desktop table", () => {
  test.skip(({ isMobile }) => isMobile, "the table is the desktop layout");

  test("is a real table with column and row headers, grouped by layer", async ({ page }) => {
    await page.goto("/lab/");
    const table = page.locator("#stack table");
    await expect(table).toBeVisible();
    await expect(page.locator("#stack .stack__sheets")).toBeHidden();
    await expect(table.locator("caption")).toHaveCount(1);
    await expect(table.locator("thead th[scope='col']")).toHaveText(["Part no.", "Technology", "Where used"]);

    const groups = await table
      .locator("tbody")
      .evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.layer));
    expect(groups).toEqual(LAYERS);
    await expect(table.locator("th[scope='rowgroup']")).toHaveCount(5);
    await expect(table.locator("th[scope='rowgroup']").nth(1)).toContainText("P/N 02");

    const next = table.locator("tr", { has: page.locator("th[scope='row']", { hasText: "Next.js" }) });
    await expect(next.locator("td").first()).toHaveText("02.01");
    await expect(next.locator("a")).toHaveCount(2);
    await expect(next.locator("a").first()).toHaveAttribute("href", "/work/example-project-02/");
    // The empty layer says so instead of inventing parts.
    await expect(table.locator("tbody[data-layer='services'] [data-todo]")).toHaveCount(1);
  });

  test("hovering a row lights its plate and the projects that use it; leaving rests", async ({ page }) => {
    await page.goto("/lab/");
    await page.locator("#stack table").scrollIntoViewIfNeeded();
    const figure = page.locator("#stack .stack__figure");

    await page.locator("#stack tr[data-name='next/og']").hover();
    await expect.poll(() => litPlates(page)).toEqual(["api"]);
    await expect.poll(() => litProjects(page)).toEqual(["example-project-02", "example-project-03"]);
    await expect(figure.locator("[data-stack='readout-part']")).toHaveText("02.02");
    await expect(figure.locator("[data-stack='readout-name']")).toHaveText("next/og");
    await expect(
      page.locator("#stack .instrument-drawing__plate[data-layer='api'] .instrument-drawing__line--lit"),
    ).toHaveCSS("opacity", "1");

    // A group header lights the whole layer.
    await page.locator("#stack tr.bom__group-head[data-layer='interface']").hover();
    await expect.poll(() => litPlates(page)).toEqual(["interface"]);
    await expect.poll(() => litProjects(page)).toHaveLength(3);

    await page.mouse.move(5, 5);
    await expect.poll(() => litPlates(page)).toEqual([]);
    await expect(figure.locator("[data-stack='readout-part']")).toHaveText("05 layers");
  });

  test("keyboard focus into a row lights it too", async ({ page }) => {
    await page.goto("/lab/");
    await page.locator("#stack tr[data-name='Playwright'] a").first().focus();
    await expect.poll(() => litPlates(page)).toEqual(["infrastructure"]);
    await expect(page.locator("#stack [data-stack='readout-name']")).toHaveText("Playwright");
  });

  test("the drawing stays beside the table while it scrolls", async ({ page }) => {
    await page.goto("/lab/");
    const top = async () =>
      page.locator("#stack .stack__figure").evaluate((node) => node.getBoundingClientRect().top);
    await page.locator("#stack tbody[data-layer='api']").evaluate((node) => node.scrollIntoView());
    await page.waitForTimeout(300);
    const first = await top();
    // Mid-table: by the Data group the section's end is near and the figure rightly lets go.
    await page.locator("#stack tbody[data-layer='services']").evaluate((node) => node.scrollIntoView());
    await page.waitForTimeout(300);
    expect(Math.abs((await top()) - first)).toBeLessThan(2);
  });
});

test.describe("stack · mobile accordions", () => {
  test.skip(({ isMobile }) => !isMobile, "accordions are the phone layout");

  test("one accordion per layer, one open at a time; the drawing follows", async ({ page }) => {
    await page.goto("/lab/");
    await expect(page.locator("#stack table")).toBeHidden();
    const sheets = page.locator("#stack details");
    await expect(sheets).toHaveCount(5);

    await sheets.nth(3).locator("summary").click();
    await expect(sheets.nth(3)).toHaveAttribute("open", "");
    await expect.poll(() => litPlates(page)).toEqual(["data"]);
    await expect.poll(() => litProjects(page)).toEqual(["example-project-03"]);
    await expect(sheets.nth(3).locator("li a").first()).toBeVisible();

    await sheets.nth(1).locator("summary").click();
    await expect(sheets.nth(3)).not.toHaveAttribute("open", "");
    await expect.poll(() => litPlates(page)).toEqual(["api"]);

    await sheets.nth(1).locator("summary").click();
    await expect.poll(() => litPlates(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });
});

test.describe("stack · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("groups appear in place, unmoved", async ({ page }) => {
    await page.goto("/lab/");
    await page.locator("#stack .stack__label").scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const transforms = await page
      .locator("#stack [data-stack='group']")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
    for (const transform of transforms) expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    await expect(page.locator("#stack .stack")).toHaveCSS("opacity", "1");
  });
});
