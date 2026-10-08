import { expect, test, type Page } from "./fixtures";

/*
 * T07 case study (/work/[slug]). The owner's projects are placeholders, so the
 * routes are checked for structure, reading order and generated output; the
 * system diagram, figure notes and counting outcomes run on /lab, which feeds
 * the same components design-system facts (this site's own architecture).
 */

const SLUGS = ["example-project-01", "example-project-02", "example-project-03"];
const CHAPTERS = ["Problem", "Constraints", "Architecture", "Key decisions", "Results", "Reflection"];

/** Scrolls the shown diagram drawing so the scrubbed draw is at `progress` (0 → 1) and lets it settle. */
async function scrubDiagram(page: Page, progress: number) {
  await page.evaluate((p) => {
    const drawing = [...document.querySelectorAll(".diagram__drawing")].find(
      (d) => d.getClientRects().length,
    )!;
    const box = drawing.getBoundingClientRect();
    const top = box.top + window.scrollY;
    // ScrollTrigger: drawing top at 80% → bottom at 50% of the viewport.
    const start = top - window.innerHeight * 0.8;
    const end = top + box.height - window.innerHeight * 0.5;
    window.scrollTo(0, start + (end - start) * p);
  }, progress);
  await page.waitForTimeout(800);
}

/** Scale (matrix a) of every segment in the shown drawing; 1 when untransformed. */
const segmentScales = (page: Page) =>
  page.evaluate(() => {
    const drawing = [...document.querySelectorAll(".diagram__drawing")].find(
      (d) => d.getClientRects().length,
    )!;
    return [...drawing.querySelectorAll<SVGLineElement>("[data-diagram='segment']")].map(
      (line) => line.transform.baseVal.consolidate()?.matrix.a ?? 1,
    );
  });

test.describe("case study · static output", () => {
  for (const slug of SLUGS) {
    test(`${slug} is prerendered with its story and an OG card`, async ({ page, request }) => {
      const response = await page.goto(`/work/${slug}/`);
      expect(response?.status()).toBe(200);
      // Rendered server-side: the HTML itself carries the whole story.
      const html = await response!.text();
      for (const chapter of CHAPTERS) expect(html).toContain(`>${chapter}</h2>`);

      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator(".chapter h2")).toHaveText(CHAPTERS);

      const og = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(og).toMatch(new RegExp(`/work/${slug}/og\\.png$`));
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /.+/);
      const card = await request.get(new URL(og!).pathname);
      expect(card.status()).toBe(200);
      expect(card.headers()["content-type"]).toBe("image/png");
      const png = await card.body();
      // PNG IHDR: width and height, big-endian, at bytes 16 and 20.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
    });
  }

  test("missing facts are marked TODO, never filled in", async ({ page }) => {
    await page.goto("/work/example-project-01/");
    await expect(page.locator(".case-header [data-todo]")).not.toHaveCount(0);
    await expect(page.locator(".case-header .case-header__cell")).toHaveCount(5);
    await expect(page.locator(".outcomes [data-todo]")).toHaveCount(1);
    await expect(page.locator(".story-todo")).toHaveCount(6);
    await expect(page.locator(".diagram[data-todo]")).toHaveCount(1);
  });
});

test.describe("case study · reading order", () => {
  test("headings and landmarks read in order", async ({ page }) => {
    await page.goto("/work/example-project-02/");
    const article = page.locator("article.case-study");
    await expect(article).toHaveAttribute("aria-labelledby", "case-title");
    const headings = await article
      .locator("h1, h2")
      .evaluateAll((nodes) => nodes.map((node) => `${node.tagName}:${node.textContent!.trim()}`));
    expect(headings[0]).toMatch(/^H1:/);
    expect(headings.slice(1, 8)).toEqual(["H2:Outcomes", ...CHAPTERS.map((title) => `H2:${title}`)]);
    expect(headings[8]).toMatch(/^H2:Next project:/);
    for (const chapter of CHAPTERS) {
      await expect(page.getByRole("region", { name: chapter, exact: true })).toHaveCount(1);
    }
    await expect(page.getByRole("navigation", { name: /Next project/ })).toHaveCount(1);
  });

  test("DOM order is visual order", async ({ page }) => {
    await page.goto("/work/example-project-01/");
    // Each block's top edge, in DOM order, must never move up the page.
    const tops = await page
      .locator(
        [
          ".case-header__index",
          ".case-header__cover",
          ".case-header__title",
          ".case-header__summary",
          ".case-header__block",
          ".outcomes",
          ".chapter",
          ".next-project__meta",
          ".next-project__block",
        ].join(", "),
      )
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top + window.scrollY));
    expect(tops.length).toBeGreaterThan(12);
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThanOrEqual(tops[i - 1]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });

  test("keyboard order follows the page: no positive tabindex, one stop for the next project", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/work/example-project-01/");
    await expect(page.locator("article [tabindex]:not([tabindex='-1'], [tabindex='0'])")).toHaveCount(0);
    const next = page.locator(".next-project");
    // The panel is one stop (the title link); "All work" follows it.
    await expect(next.locator(".next-project__body a:not([tabindex='-1'])")).toHaveCount(1);
    await expect(next.locator(".next-project__cover-link")).toHaveAttribute("aria-hidden", "true");
    await next.locator(".next-project__link").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "← All work" })).toBeFocused();
  });
});

test.describe("case study · next project", () => {
  test("points forward and wraps after the last project", async ({ page }) => {
    for (const [from, to] of [
      ["example-project-01", "example-project-02"],
      ["example-project-03", "example-project-01"],
    ]) {
      await page.goto(`/work/${from}/`);
      await expect(page.locator(".next-project__link")).toHaveAttribute("href", `/work/${to}/`);
      // The preview is the next project's own cover: the element its header morphs from.
      await expect(page.locator(".next-project .project-cover")).toHaveCount(1);
    }
  });

  test("opening it lands on the next case study", async ({ page }) => {
    await page.goto("/work/example-project-01/");
    await page.locator(".next-project__link").click();
    await expect(page).toHaveURL(/\/work\/example-project-02\/$/);
    await expect(page.locator(".case-header__index")).toContainText("P/N 02");
  });

  test("the cover note shows without hover on touch", async ({ page, isMobile }) => {
    test.skip(!isMobile, "touch only");
    await page.goto("/work/example-project-01/");
    await expect(page.locator(".next-project__note")).toHaveCSS("opacity", "1");
  });
});

test.describe("system diagram · text alternative", () => {
  test("the drawing is hidden from assistive tech; its netlist lists every part and connection", async ({
    page,
  }) => {
    await page.goto("/lab/");
    const figure = page.locator("#system-diagram figure.diagram");
    await expect(figure.locator(".diagram__drawing")).toHaveCount(2);
    for (const drawing of await figure.locator(".diagram__drawing").all()) {
      await expect(drawing).toHaveAttribute("aria-hidden", "true");
    }
    await expect(figure.locator("figcaption")).toContainText("This site");
    await expect(figure.getByRole("list", { name: "Parts" }).getByRole("listitem")).toHaveCount(9);
    const connections = figure.getByRole("list", { name: "Connections" }).getByRole("listitem");
    await expect(connections).toHaveCount(8);
    await expect(connections.first()).toHaveText("Typed content to Next.js build, TS");
  });
});

test.describe("system diagram · draws on scroll", () => {
  test("wide on desktop, tall on phones; scrubbed by scroll both ways", async ({ page, isMobile }) => {
    await page.goto("/lab/");
    const shown = page.locator("#system-diagram .diagram__drawing:visible");
    await expect(shown).toHaveCount(1);
    await expect(shown).toHaveAttribute("data-orientation", isMobile ? "tall" : "wide");

    await scrubDiagram(page, 0);
    expect((await segmentScales(page)).every((scale) => scale < 0.01)).toBe(true);

    await scrubDiagram(page, 0.5);
    const half = await segmentScales(page);
    expect(half.some((scale) => scale > 0.99)).toBe(true);
    expect(half.some((scale) => scale < 0.01)).toBe(true);

    await scrubDiagram(page, 1.05);
    expect((await segmentScales(page)).every((scale) => scale > 0.999)).toBe(true);
    await expect(shown.locator("[data-diagram='label']").last()).toHaveCSS("opacity", "1");

    await scrubDiagram(page, 0);
    expect((await segmentScales(page)).every((scale) => scale < 0.01)).toBe(true);
  });

  test("reduced motion: the drawing is complete, and only fades in", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab/");
    await scrubDiagram(page, 0);
    expect((await segmentScales(page)).every((scale) => scale === 1)).toBe(true);
    await expect(page.locator("#system-diagram .diagram__stage")).toHaveCSS("opacity", "1");
  });
});

test.describe("figures · notes", () => {
  test("leaders on desktop, numbered markers + visible key on phones; the key is always readable", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/lab/");
    const figure = page.locator("#figure .shot");
    const key = figure.getByRole("list", { name: "Notes" }).getByRole("listitem");
    await expect(key).toHaveCount(3);
    await expect(key.first()).toContainText("Crossing point");
    if (isMobile) {
      await expect(figure.locator(".figure-notes__marker").first()).toBeVisible();
      await expect(figure.locator(".figure-notes")).toBeHidden();
      await expect(key.first()).toBeVisible();
    } else {
      await figure.scrollIntoViewIfNeeded();
      await expect(figure.locator(".figure-notes__leader")).toHaveCount(3);
      await expect(figure.locator(".figure-notes__leader").first()).toBeVisible();
      await expect(figure.locator(".figure-notes__marker").first()).toBeHidden();
    }
    // Every leader stays inside the viewport (labels head away from the near edges).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
  });
});

test.describe("outcomes · calibrate", () => {
  test("screen readers get each value as written; only exact figures count", async ({ page }) => {
    await page.goto("/lab/");
    const outcomes = page.locator("#outcomes .outcome");
    await expect(outcomes).toHaveCount(4);
    await expect(outcomes.locator(".sr-only")).toHaveText(["<2.5s", "200KB", "0.05"]);
    // "AA" can't count: it's printed as written, readable as-is.
    await expect(outcomes.nth(3).locator(".outcome__figure--static")).toHaveText("AA");

    await outcomes.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    await expect(outcomes.locator("[data-anim='calibrate'] data")).toHaveText(["2.5", "200", "0.05"]);
  });

  test("reduced motion shows final values at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab/");
    const figures = page.locator("#outcomes [data-anim='calibrate'] data");
    await figures.first().scrollIntoViewIfNeeded();
    await expect(figures).toHaveText(["2.5", "200", "0.05"]);
  });
});
