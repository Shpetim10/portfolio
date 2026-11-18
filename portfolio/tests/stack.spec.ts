import { expect, test, type Page } from "./fixtures";

/*
 * T08 stack. The homepage files the owner's skills into the five layer groups;
 * the "used in" links run on /lab, where this site's own technologies are filed
 * by layer and "used in" the specimen projects carrying that layer (the five
 * featured projects with 1 · 3 · 5 · 1 · 3 layers; Services left empty).
 */

const LAYERS = ["interface", "api", "services", "data", "infrastructure"];

const lit = (page: Page, selector: string, attribute: string) =>
  page
    .locator(`#stack ${selector}[data-lit]`)
    .evaluateAll((nodes, key) => nodes.map((node) => node.getAttribute(key)), attribute);

const litPlates = (page: Page) => lit(page, ".instrument-drawing__plate", "data-layer");
const litProjects = (page: Page) => lit(page, ".stack__index-item", "data-slug");

test.describe("stack · homepage", () => {
  test("section [05] files every layer from the skills content", async ({ page, isMobile }) => {
    await page.goto("/");
    const section = page.locator("section#stack");
    await expect(section).toHaveAttribute("aria-labelledby", "stack-index");
    await expect(section.locator(".section-index")).toContainText("[05]");
    await expect(section.locator(".section-index")).toContainText("Stack");
    await expect(section.locator("h2")).toHaveText(/^Bill of materials · \d{2} parts$/);
    const groups = isMobile ? section.locator("details") : section.locator("tbody");
    await expect(groups).toHaveCount(5);
    // No bars, no raster logos: nothing in the section is an image or a meter.
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
    await expect(next.locator("a")).toHaveCount(3);
    await expect(next.locator("a").first()).toHaveAttribute("href", "/work/herisaga-authoring/");
    // The empty layer says so instead of inventing parts.
    await expect(table.locator("tbody[data-layer='services'] [data-todo]")).toHaveCount(1);
  });

  test("hovering a row lights its plate and the projects that use it; leaving rests", async ({ page }) => {
    await page.goto("/lab/");
    await page.locator("#stack table").scrollIntoViewIfNeeded();
    const figure = page.locator("#stack .stack__figure");

    await page.locator("#stack tr[data-name='next/og']").hover();
    await expect.poll(() => litPlates(page)).toEqual(["api"]);
    await expect.poll(() => litProjects(page)).toEqual(["herisaga-authoring", "ritema", "pyramidos"]);
    await expect(figure.locator("[data-stack='readout-part']")).toHaveText("02.02");
    await expect(figure.locator("[data-stack='readout-name']")).toHaveText("next/og");
    await expect(
      page.locator("#stack .instrument-drawing__plate[data-layer='api'] .instrument-drawing__line--lit"),
    ).toHaveCSS("opacity", "1");

    // A group header lights the whole layer.
    await page.locator("#stack tr.bom__group-head[data-layer='interface']").hover();
    await expect.poll(() => litPlates(page)).toEqual(["interface"]);
    await expect.poll(() => litProjects(page)).toHaveLength(5);

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
    await expect.poll(() => litProjects(page)).toEqual(["ritema"]);
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

/*
 * T08b · Assembly line. Five conveyor tracks over the bill of materials, built
 * from the same Skill[] — the table rows are the reference for every check.
 */
const assembly = "#stack .assembly";

/** The belt's current x (px) on track `i`. */
const beltX = (page: Page, i = 0) =>
  page
    .locator(`${assembly} [data-assembly='belt']`)
    .nth(i)
    .evaluate((belt) => new DOMMatrix(getComputedStyle(belt).transform).m41);

/** A part on track `line` that sits wholly inside the window, clear of the fades: its key and centre. */
const partInView = (page: Page, line: number) =>
  page
    .locator(`${assembly} [data-assembly='line']`)
    .nth(line)
    .evaluate((line) => {
      const track = line.querySelector<HTMLElement>("[data-assembly='track']")!.getBoundingClientRect();
      const fade = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--assembly-fade"));
      const item = [...line.querySelectorAll<HTMLElement>(".assembly__item")].find((item) => {
        const box = item.getBoundingClientRect();
        return box.left >= track.left + fade && box.right <= track.right - fade;
      })!;
      const box = item.getBoundingClientRect();
      return { key: item.dataset.skill!, x: box.left + box.width / 2, y: box.top + box.height / 2 };
    });

const enter = async (page: Page) => {
  await page.locator(assembly).scrollIntoViewIfNeeded();
  // Entrance: 1000ms + 4 × 80ms stagger, then the speed gate opens.
  await page.waitForTimeout(2000);
};

test.describe("stack · assembly line", () => {
  test("every skill rides its layer's track once per copy; counts match", async ({ page }) => {
    await page.goto("/");
    await enter(page); // the labels decode during the entrance
    const expected = await page
      .locator("#stack tr[data-skill]")
      .evaluateAll((rows) =>
        rows.map((row) => [(row as HTMLElement).dataset.layer, (row as HTMLElement).dataset.skill]),
      );
    const lines = await page.locator(`${assembly} [data-assembly='line']`).evaluateAll((lines) =>
      lines.map((line) => ({
        layer: (line as HTMLElement).dataset.layer,
        label: line.querySelector("[data-assembly='label']")!.textContent,
        copies: [...line.querySelectorAll(".assembly__copy")].map((copy) =>
          [...copy.querySelectorAll("[data-skill]")].map((item) => (item as HTMLElement).dataset.skill),
        ),
      })),
    );
    expect(lines.map((line) => line.layer)).toEqual(LAYERS);
    for (const line of lines) {
      const skills = expected.filter(([layer]) => layer === line.layer).map(([, skill]) => skill);
      expect(line.copies.length).toBeGreaterThanOrEqual(2);
      for (const copy of line.copies) expect(copy).toEqual(skills);
      expect(line.label).toContain(` · ${String(skills.length).padStart(2, "0")}`);
    }
  });

  test("the first copy is the list; clones are hidden and inert; parts aren't tab stops", async ({
    page,
  }) => {
    await page.goto("/");
    const first = page.locator(`${assembly} [data-assembly='copy']`);
    await expect(first).toHaveCount(5);
    await expect(first.first()).toHaveAttribute("aria-label", "Interface stack");
    const clones = page.locator(`${assembly} .assembly__copy:not([data-assembly])`);
    expect(await clones.count()).toBeGreaterThanOrEqual(5);
    for (const clone of await clones.all()) {
      await expect(clone).toHaveAttribute("aria-hidden", "true");
      await expect(clone).toHaveAttribute("inert", "");
    }
    const tabbable = await page
      .locator(`${assembly} .assembly__item`)
      .evaluateAll((items) => items.filter((item) => (item as HTMLElement).tabIndex >= 0).length);
    expect(tabbable).toBe(0);
  });

  test("monochrome marks: the only signal orange is the AI dots", async ({ page }) => {
    await page.goto("/");
    await enter(page);
    const report = await page.evaluate(() => {
      const signal = "rgb(255, 79, 0)";
      const root = document.querySelector("#stack .assembly")!;
      const orange = [...root.querySelectorAll("*")].filter((el) => {
        const style = getComputedStyle(el);
        return [style.color, style.backgroundColor, style.borderTopColor, style.fill].includes(signal);
      });
      const symbols = [...document.querySelectorAll(".assembly-sprite symbol")];
      return {
        orangeOutsideDots: orange.filter((el) => !el.classList.contains("assembly__dot")).length,
        dots: root.querySelectorAll(".assembly__mark .assembly__dot").length,
        colouredShapes: symbols.filter((symbol) => symbol.querySelector("[fill], [style], [stroke]")).length,
        symbols: symbols.length,
        iconColour: getComputedStyle(root.querySelector(".assembly__icon")!).color,
      };
    });
    expect(report.orangeOutsideDots).toBe(0);
    expect(report.dots).toBeGreaterThan(0);
    expect(report.symbols).toBeGreaterThan(0);
    expect(report.colouredShapes).toBe(0);
    expect(report.iconColour).toBe("rgb(143, 138, 128)"); // dust
  });

  test("loops seamlessly at every width: copies cover the window, one period apart", async ({ page }) => {
    for (const width of [320, 768, 1024, 1440, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      // Before the entrance too, while the tracks wait off to the side.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
      await enter(page);
      const tracks = await page.locator(`${assembly} [data-assembly='line']`).evaluateAll((lines) =>
        lines.map((line) => {
          const copies = [...line.querySelectorAll<HTMLElement>(".assembly__copy")];
          const [a, b] = copies.map((copy) => copy.getBoundingClientRect());
          const belt = line.querySelector<HTMLElement>("[data-assembly='belt']")!;
          return {
            period: a.width,
            spacing: b.left - a.left,
            covered: copies.length * a.width,
            view: line.querySelector<HTMLElement>("[data-assembly='track']")!.clientWidth,
            x: new DOMMatrix(getComputedStyle(belt).transform).m41,
          };
        }),
      );
      for (const track of tracks) {
        expect(Math.abs(track.spacing - track.period), `width ${width}`).toBeLessThan(0.01);
        expect(track.covered, `width ${width}`).toBeGreaterThanOrEqual(track.view + track.period);
        expect(track.x).toBeLessThanOrEqual(0);
        expect(track.x).toBeGreaterThan(-track.period);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    }
  });

  test("tracks move in alternating directions and stop off-screen", async ({ page }) => {
    await page.goto("/");
    await enter(page);
    const read = () => Promise.all([0, 1, 2, 3, 4].map((i) => beltX(page, i)));
    const before = await read();
    await page.waitForTimeout(600);
    const after = await read();
    const moved = after.map((x, i) => x - before[i]);
    // Left, right, left, right, left (a wrap would flip the sign; at ~36px/s none happens in 600ms).
    expect(moved.map(Math.sign)).toEqual([-1, 1, -1, 1, -1]);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    const parked = await beltX(page);
    await page.waitForTimeout(500);
    expect(await beltX(page)).toBe(parked);
  });

  test("the pause control stops every belt and the choice survives a reload", async ({ page }) => {
    await page.goto("/");
    await enter(page);
    const toggle = page.locator(`${assembly} .assembly__toggle`);
    await expect(toggle).toHaveText("Pause motion");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("Play motion");
    await page.waitForTimeout(500);
    const x = await beltX(page);
    await page.waitForTimeout(500);
    expect(await beltX(page)).toBe(x);

    await page.reload();
    await enter(page);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const still = await beltX(page);
    await page.waitForTimeout(500);
    expect(await beltX(page)).toBe(still);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.waitForTimeout(1000);
    expect(await beltX(page)).not.toBe(still);
  });

  test("a tapped part scrolls to its row and marks it, with its projects lit", async ({ page, isMobile }) => {
    await page.goto("/");
    await enter(page);
    await page.locator(`${assembly} .assembly__toggle`).click(); // a still belt, so the tap lands where aimed
    await page.waitForTimeout(500);
    const part = await partInView(page, 3); // Data
    if (isMobile) await page.touchscreen.tap(part.x, part.y);
    else await page.mouse.click(part.x, part.y);
    const row = page.locator(
      isMobile ? `.bom-sheet__part[data-skill='${part.key}']` : `tr[data-skill='${part.key}']`,
    );
    await expect(row).toHaveAttribute("data-flash", "", { timeout: 4000 });
    await expect(row).toBeInViewport();
    if (isMobile) await expect(page.locator("#stack details[data-layer='data']")).toHaveAttribute("open", "");
    const { name, projects } = await row.evaluate((row) => ({
      name: (row as HTMLElement).dataset.name!,
      projects: (row as HTMLElement).dataset.projects!.split(" ").filter(Boolean),
    }));
    await expect(page.locator("#stack [data-stack='readout-name']")).toHaveText(name);
    await expect.poll(() => litProjects(page)).toEqual(expect.arrayContaining(projects));
    await expect.poll(() => row.getAttribute("data-flash"), { timeout: 3000 }).toBeNull();
  });
});

test.describe("stack · assembly line · fine pointer", () => {
  test.skip(({ isMobile }) => isMobile, "hover and mouse drag are desktop input");

  test("pointing at a track stops it; the part lights and the rest dim", async ({ page }) => {
    await page.goto("/");
    await enter(page);
    const part = await partInView(page, 1);
    await page.mouse.move(part.x, part.y);
    await page.waitForTimeout(700);
    const x = await beltX(page, 1);
    await page.waitForTimeout(400);
    expect(Math.abs((await beltX(page, 1)) - x)).toBeLessThan(0.5);
    await expect(page.locator(`${assembly} .assembly__track`).nth(1)).toHaveAttribute("data-cursor", "view");
    // The part under the mouse is lit on every copy (clones included), the rest dimmed.
    const [lit, dimmed] = await page
      .locator(`${assembly} [data-assembly='line']`)
      .nth(1)
      .evaluate((line, key) => {
        const on = line.querySelector(`[data-skill='${key}'][data-on]`)!;
        const other = line.querySelector(".assembly__item:not([data-on])")!;
        return [getComputedStyle(on).color, getComputedStyle(other).opacity];
      }, part.key);
    expect(lit).toBe("rgb(237, 232, 223)"); // bone
    expect(dimmed).toBe("0.4");

    await page.mouse.move(5, 5);
    await page.waitForTimeout(800);
    const resumed = await beltX(page, 1);
    await page.waitForTimeout(400);
    expect(await beltX(page, 1)).not.toBe(resumed);
  });

  test("dragging moves the belt directly and doesn't count as a tap", async ({ page }) => {
    await page.goto("/");
    await enter(page);
    await page.locator(`${assembly} .assembly__toggle`).click();
    await page.waitForTimeout(500);
    const track = page.locator(`${assembly} .assembly__track`).first();
    const box = (await track.boundingBox())!;
    const before = await beltX(page);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + 400, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++)
      await page.mouse.move(box.x + 400 - step * 15, box.y + box.height / 2);
    await page.waitForTimeout(150); // a stale release: no fling
    await page.mouse.up();
    await page.waitForTimeout(100);
    const period = await page
      .locator(`${assembly} [data-assembly='copy']`)
      .first()
      .evaluate((copy) => copy.getBoundingClientRect().width);
    const moved = ((((await beltX(page)) - before) % period) + period) % period;
    expect(Math.abs(moved - (period - 150))).toBeLessThan(2);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
    await expect(page.locator("#stack [data-flash]")).toHaveCount(0);
  });
});

test.describe("stack · assembly line · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("static, sideways-scrolling rows of one copy; no pause control", async ({ page }) => {
    await page.goto("/");
    await page.locator(assembly).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(page.locator(`${assembly} .assembly__toggle`)).toHaveCount(0);
    const tracks = await page.locator(`${assembly} [data-assembly='line']`).evaluateAll((lines) =>
      lines.map((line) => {
        const track = line.querySelector<HTMLElement>("[data-assembly='track']")!;
        return {
          shown: [...line.querySelectorAll(".assembly__copy")].filter((copy) => copy.getClientRects().length)
            .length,
          overflow: getComputedStyle(track).overflowX,
          snap: getComputedStyle(track).scrollSnapType,
          scrolls: track.scrollWidth > track.clientWidth,
          transform: getComputedStyle(line.querySelector("[data-assembly='belt']")!).transform,
        };
      }),
    );
    for (const track of tracks) {
      expect(track.shown).toBe(1);
      expect(track.overflow).toBe("auto");
      expect(track.snap).toContain("x");
      expect(track.scrolls).toBe(true);
      expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(track.transform);
    }
  });
});
