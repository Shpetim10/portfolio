import { expect, test, type Page } from "./fixtures";

/*
 * T09 experience. The owner's roles aren't supplied yet, so the homepage shows
 * one marked placeholder revision; the populated history runs on /lab, where
 * this repository's own build history is filed as three revisions.
 */

/** The rendered layout's list: the table on desktop, the cards on phones. */
const list = (page: Page, isMobile: boolean) =>
  page.locator(isMobile ? "#experience ol.rev-cards" : "#experience table.revs");

/** Spine segments and node centres of the rendered list, in page pixels. */
const rail = (page: Page, isMobile: boolean) =>
  list(page, isMobile).evaluate((root) =>
    [...root.querySelectorAll<HTMLElement>("[data-rev='row']")].map((row) => {
      const spine = row.querySelector("[data-rev='spine']")!.getBoundingClientRect();
      const node = row.querySelector("[data-rev='node']")!.getBoundingClientRect();
      return { top: spine.top, bottom: spine.bottom, height: spine.height, node: node.top + node.height / 2 };
    }),
  );

/** Scrolls past the list so the scrubbed spine is fully drawn and every row has annotated. */
const drawAll = async (page: Page, isMobile: boolean) => {
  await list(page, isMobile).evaluate((root) => {
    window.scrollTo(0, root.getBoundingClientRect().bottom + window.scrollY);
  });
  await page.waitForTimeout(1500);
};

/** What each REV marker says to assistive tech (the visible marker scrambles until it annotates). */
const markers = (page: Page, isMobile: boolean) =>
  list(page, isMobile).locator("[data-rev='marker'] .sr-only");

test.describe("experience · homepage", () => {
  test("section [06] shows one placeholder revision, present handled", async ({ page, isMobile }) => {
    await page.goto("/");
    const section = page.locator("section#experience");
    await expect(section).toHaveAttribute("aria-labelledby", "experience-index");
    await expect(section.locator(".section-index")).toContainText("[06]");
    await expect(section.locator(".section-index")).toContainText("Experience");
    await expect(section.locator(".section-index")).toContainText("REV.A");
    await expect(section.locator("h2")).toHaveText("Revision history · 01 revision");

    const rows = list(page, isMobile).locator("[data-rev='row']");
    await expect(rows).toHaveCount(1);
    const row = rows.first();
    await expect(row).toHaveAttribute("data-current", "true");
    await expect(markers(page, isMobile)).toHaveText(["Revision A"]);
    await expect(row.locator(".rev__when--present")).toHaveText("Present");
    // Company, title, start and the highlight are all unsupplied: each is a marked placeholder.
    await expect(row.locator("[data-todo]")).toHaveCount(4);
    // A lone revision has no spine to run past it.
    await drawAll(page, isMobile);
    await expect(row.locator("[data-rev='spine']")).toBeHidden();
    await expect(row.locator("[data-rev='node']")).toBeVisible();
  });
});

test.describe("experience · revision history", () => {
  test("newest first, lettered oldest-first, dates rendered from content", async ({ page, isMobile }) => {
    await page.goto("/lab/");
    const rows = list(page, isMobile).locator("[data-rev='row']");
    await expect(rows).toHaveCount(3);
    await expect(markers(page, isMobile)).toHaveText(["Revision C", "Revision B", "Revision A"]);
    await expect(page.locator("#experience .section-index")).toContainText("REV.C");

    const current = rows.first();
    await expect(current).toHaveAttribute("data-current", "true");
    await expect(current.locator("time")).toHaveAttribute("datetime", "2026-10");
    await expect(current.locator(".rev__dates")).toHaveText(/^Oct 2026 —to Present$/);
    // A range inside one month reads as one date.
    await expect(rows.nth(1).locator(".rev__dates")).toHaveText("Oct 2026");
    await expect(rows.nth(1)).not.toHaveAttribute("data-current");
    await expect(rows.locator(".rev__title")).toContainText(["T01–T09", "P0", "Scaffold"]);
    await expect(rows.first().locator(".rev__change")).toHaveCount(3);
  });

  test("the spine runs node to node with no orphaned ends", async ({ page, isMobile }) => {
    await page.goto("/lab/");
    await drawAll(page, isMobile);
    const segments = await rail(page, isMobile);
    expect(segments).toHaveLength(3);
    expect(segments[0].top).toBeCloseTo(segments[0].node, 0);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].top).toBeCloseTo(segments[i - 1].bottom, 0);
    }
    expect(segments.at(-1)!.bottom).toBeCloseTo(segments.at(-1)!.node, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });

  test("the spine draws with the scroll; each row annotates as the pen reaches it", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/lab/");
    const root = list(page, isMobile);
    const lastRow = root.locator("[data-rev='row']").last();
    // List top just below the pen line: nothing drawn yet, no row annotated.
    await root.evaluate((node) =>
      window.scrollTo(0, node.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.8),
    );
    await page.waitForTimeout(500);
    await expect(lastRow.locator("[data-rev='marker']")).toHaveCSS("opacity", "0");
    const undrawn = await root
      .locator("[data-rev='spine']")
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
    expect(Math.max(...undrawn)).toBeLessThan(1);

    await drawAll(page, isMobile);
    await expect(lastRow.locator("[data-rev='marker']")).toHaveCSS("opacity", "1");
    await expect(root.locator("[data-rev='decode']")).toHaveText(["REV C", "REV B", "REV A"]);
    const scales = await root
      .locator("[data-rev='spine']")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
    for (const transform of scales) expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });
});

test.describe("experience · desktop table", () => {
  test.skip(({ isMobile }) => isMobile, "the table is the desktop layout");

  test("is a real table with column and row headers", async ({ page }) => {
    await page.goto("/lab/");
    const table = page.locator("#experience table");
    await expect(table).toBeVisible();
    await expect(page.locator("#experience .rev-cards")).toBeHidden();
    await expect(table.locator("caption")).toHaveCount(1);
    await expect(table.locator("thead th[scope='col']")).toHaveText([
      "Rev",
      "Date",
      "Company",
      "Title",
      "Changes",
    ]);
    await expect(table.locator("th[scope='row']")).toHaveCount(3);
  });
});

test.describe("experience · mobile cards", () => {
  test.skip(({ isMobile }) => !isMobile, "cards are the phone layout");

  test("rows become stacked cards with the same REV marker", async ({ page }) => {
    await page.goto("/lab/");
    await expect(page.locator("#experience table")).toBeHidden();
    const cards = page.locator("#experience .rev-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.first().locator("h3")).toHaveText("This repository");
    await expect(cards.first().locator(".rev__marker")).toHaveCSS("font-family", /Martian Mono|Mono/);
  });
});

test.describe("experience · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the history appears in place, fully drawn", async ({ page, isMobile }) => {
    await page.goto("/lab/");
    await list(page, isMobile).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(list(page, isMobile)).toHaveCSS("opacity", "1");
    const transforms = await list(page, isMobile)
      .locator("[data-rev='spine'], [data-rev='node'], [data-rev='cell']")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).transform));
    for (const transform of transforms) expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
    await expect(list(page, isMobile).locator("[data-rev='decode']").first()).toHaveText("REV C");
  });
});
