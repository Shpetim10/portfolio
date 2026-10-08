import { expect, test, type Page } from "./fixtures";

/*
 * T06 selected work. The work probe (src/components/sections/work/WorkStage.tsx)
 * reports the centred panel, the track's progress and its travel. The owner's
 * projects are placeholders with no layers, so strip lighting runs on /lab,
 * where the same projects carry specimen layer sets (1 · 3 · 5 layers).
 */

type Read = { active: number; progress: number; travel: number };
type ProbeWindow = Window & { __WORK_PROBE__?: { read?: () => Read } };

const enableProbe = (page: Page) =>
  page.addInitScript(() => {
    (window as ProbeWindow).__WORK_PROBE__ = {};
  });

const read = (page: Page) => page.evaluate(() => (window as ProbeWindow).__WORK_PROBE__!.read!());

/** Jumps to a point in the pinned track (0 → 1) of the section `#id` and lets it settle. */
async function scrollTrack(page: Page, progress: number, id = "work") {
  await page.evaluate(
    ([p, id]) => {
      const track = document.querySelector<HTMLElement>(`#${id} .work`)!;
      const top = track.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * p);
    },
    [progress, id] as const,
  );
  await page.waitForTimeout(600);
}

/** Horizontal distance from a panel's centre to the viewport's centre. */
const offCentre = (page: Page, index: number, id = "work") =>
  page
    .locator(`#${id} .work-panel`)
    .nth(index)
    .evaluate((panel) => {
      const box = panel.getBoundingClientRect();
      return Math.abs(box.left + box.width / 2 - window.innerWidth / 2);
    });

const coverScale = (page: Page, index: number) =>
  page
    .locator("#work [data-cover='media']")
    .nth(index)
    .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);

const litLayers = (page: Page, scope: string) =>
  page
    .locator(`${scope} .layer-strip__part[data-lit]`)
    .evaluateAll((parts) => parts.map((part) => (part as HTMLElement).dataset.layer));

test.describe("work · content", () => {
  test("section [04] lists every featured project as one link, missing facts marked", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section#work");
    await expect(section).toHaveAttribute("aria-labelledby", "work-index");
    await expect(section.locator(".section-index")).toContainText("[04]");

    const panels = section.locator(".work-panel");
    await expect(panels).toHaveCount(3);
    await expect(section.locator("h3")).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const panel = panels.nth(i);
      await expect(panel.locator("article")).toHaveAttribute("aria-labelledby", /^work-example-project-0\d$/);
      // One tab stop: the title link. The cover repeats it for the pointer only.
      await expect(panel.locator("a:not([tabindex='-1'])")).toHaveCount(1);
      await expect(panel.locator(".work-panel__cover-link")).toHaveAttribute("aria-hidden", "true");
      await expect(panel.locator(".work-panel__link")).toHaveAttribute(
        "href",
        /^\/work\/example-project-0\d\/$/,
      );
      // Placeholders: title, year, role, outcome, layers and the cover are all marked TODO.
      await expect(panel.locator("[data-todo]")).not.toHaveCount(0);
      await expect(panel.locator(".project-cover")).toHaveAttribute("data-todo", "");
    }
  });
});

test.describe("work · desktop track", () => {
  test.skip(({ isMobile }) => isMobile, "the track is desktop only");

  test("pins, travels 1:1 with scroll and centres each panel in turn", async ({ page }) => {
    await enableProbe(page);
    await page.goto("/");
    const work = page.locator("#work .work");
    await expect(work).toHaveAttribute("data-mode", "live");

    const { travel } = await read(page);
    expect(travel).toBeGreaterThan(0);
    const height = await work.evaluate((node) => (node as HTMLElement).offsetHeight);
    expect(height).toBe(900 + travel); // viewport + travel: scroll maps 1:1 to the rail

    for (const [progress, index] of [
      [0, 0],
      [0.5, 1],
      [1, 2],
    ] as const) {
      await scrollTrack(page, progress);
      expect((await read(page)).active).toBe(index);
      expect(await offCentre(page, index)).toBeLessThan(2);
      const stageTop = await page
        .locator("#work .work__stage")
        .evaluate((node) => node.getBoundingClientRect().top);
      expect(Math.abs(stageTop)).toBeLessThan(1); // pinned (sub-pixel scroll rounding aside)
    }
    // The readout names the centred project.
    await expect(page.locator("#work [data-work='readout-part']")).toHaveText("P/N 03");
    await expect(page.locator("#work [data-work='readout-index']")).toHaveText("03");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });

  test("covers settle from 1.08 to 1 as their panel reaches the centre", async ({ page }) => {
    await page.goto("/");
    await scrollTrack(page, 0);
    expect(await coverScale(page, 0)).toBeCloseTo(1, 3);
    expect(await coverScale(page, 1)).toBeGreaterThan(1.02);
    await scrollTrack(page, 0.5);
    expect(await coverScale(page, 1)).toBeCloseTo(1, 3);
  });

  test("the layer strip lights the centred project's layers", async ({ page }) => {
    await page.goto("/lab/");
    await scrollTrack(page, 0);
    expect(await litLayers(page, "#work .work__strip")).toEqual(["interface"]);
    await scrollTrack(page, 0.5);
    expect(await litLayers(page, "#work .work__strip")).toEqual(["interface", "api", "services"]);
    await scrollTrack(page, 1);
    expect(await litLayers(page, "#work .work__strip")).toHaveLength(5);
    // The lit stroke is the coolant diagram line, fully drawn.
    await page.waitForTimeout(400);
    const lit = page
      .locator("#work .work__strip .layer-strip__part[data-lit] .layer-strip__line--lit")
      .first();
    await expect(lit).toHaveCSS("opacity", "1");
    await expect(lit).toHaveCSS("stroke", "rgb(157, 180, 192)");
  });

  test("keyboard reaches every project without the horizontal scroll", async ({ page }) => {
    await enableProbe(page);
    await page.goto("/");
    await page.locator("#work .work-panel__link").first().focus();
    for (let i = 0; i < 3; i++) {
      if (i > 0) await page.keyboard.press("Tab");
      await expect(page.locator("#work .work-panel__link").nth(i)).toBeFocused();
      await page.waitForTimeout(300);
      expect((await read(page)).active).toBe(i);
      expect(await offCentre(page, i)).toBeLessThan(2);
    }
    // The stage clips; it never becomes a sideways scroller behind the transform.
    expect(await page.locator("#work .work__stage").evaluate((node) => node.scrollLeft)).toBe(0);
    await expect(page.locator("#work .work__stage")).toHaveCSS("overflow-x", "clip");
  });

  test("never traps the wheel: sideways swipes pass, vertical scroll runs through and past", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollTrack(page, 0);
    await page.mouse.move(720, 400);
    const before = await page.evaluate(() => window.scrollY);

    await page.mouse.wheel(600, 0); // a sideways trackpad swipe isn't consumed by the track
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    const end = await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>("#work .work")!;
      return track.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    });
    for (let y = before; y <= end + 600; y += 500) {
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(end);
  });

  test("hover raises the notes on the cover; the cursor says VIEW", async ({ page }) => {
    await page.goto("/");
    await scrollTrack(page, 0);
    const notes = page.locator("#work .work-panel__notes").first();
    await expect(notes).toHaveCSS("opacity", "0");
    await page.mouse.move(700, 300);
    await page.locator("#work .work-panel__cover").first().hover();
    await expect(notes).toHaveCSS("opacity", "1");
    await expect(page.locator(".cursor [data-part='label']")).toHaveText("view");
    await expect(notes).toContainText(/stack/i);

    // Keyboard focus raises them too.
    await page.mouse.move(5, 5);
    await page.locator("#work .work-panel__link").first().focus();
    await expect(notes).toHaveCSS("opacity", "1");
  });
});

test.describe("work · opening a project", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop; the same links on mobile");

  test("the cover morphs into the case-study header (view transition)", async ({ page }) => {
    await page.addInitScript(() => {
      const seen: string[] = ((window as unknown as { __seen: string[] }).__seen = []);
      const poll = () => {
        for (const animation of document.getAnimations()) {
          const pseudo = (animation.effect as KeyframeEffect | null)?.pseudoElement;
          if (pseudo && !seen.includes(pseudo)) seen.push(pseudo);
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });
    await page.goto("/");
    await scrollTrack(page, 0);
    await page.locator("#work .work-panel__link").first().click();
    await page.waitForURL("**/work/example-project-01/");
    await expect(page.locator("h1")).toBeVisible();
    await page.waitForTimeout(1200);
    const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
    expect(seen).toContain("::view-transition-group(cover-example-project-01)");
    await expect(page.locator(".page-wipe")).not.toHaveAttribute("data-state", /.+/);
  });

  test("without View Transitions it falls back to the page wipe", async ({ page }) => {
    await page.addInitScript(() => {
      delete (Document.prototype as Partial<Document>).startViewTransition;
    });
    await page.goto("/");
    await scrollTrack(page, 0.5);
    await page.locator("#work .work-panel__link").nth(1).click();
    const plate = page.locator(".page-wipe");
    await expect(plate).toHaveAttribute("data-state", "covering");
    await expect(plate).toHaveText("P/N 02");
    await expect(plate).toHaveAttribute("data-surface", "paper");
    await page.waitForURL("**/work/example-project-02/");
    // Retracts off the new page, then rests collapsed and inert.
    await expect(plate).not.toHaveAttribute("data-state", /.+/, { timeout: 2000 });
    await expect(plate).toHaveCSS("pointer-events", "none");
    expect(await plate.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).d)).toBe(0);
  });

  test("modified clicks are left to the browser", async ({ page, context }) => {
    await page.addInitScript(() => {
      delete (Document.prototype as Partial<Document>).startViewTransition;
    });
    await page.goto("/");
    await scrollTrack(page, 0);
    const popup = context.waitForEvent("page");
    await page
      .locator("#work .work-panel__link")
      .first()
      .click({ modifiers: ["ControlOrMeta"] });
    await (await popup).close();
    await expect(page.locator(".page-wipe")).not.toHaveAttribute("data-state", /.+/);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});

test.describe("work · mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile layout");

  test("stacked full-width cards, no pin, strip inline, notes always shown", async ({ page }) => {
    await page.goto("/lab/");
    const panels = page.locator("#work .work-panel");
    const boxes = await panels.evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().toJSON()),
    );
    const width = await page.evaluate(() => window.innerWidth);
    for (const [i, box] of boxes.entries()) {
      expect(box.width).toBeGreaterThan(width - 48); // full width inside the 20px margins
      if (i > 0) expect(box.top).toBeGreaterThan(boxes[i - 1].bottom);
    }
    await expect(page.locator("#work .work__stage")).toHaveCSS("position", "static");
    await expect(page.locator("#work .work__assembly")).toBeHidden();
    await expect(page.locator("#work .work-panel__strip").first()).toBeVisible();
    expect(await litLayers(page, "#work .work-panel:nth-child(2) .work-panel__strip")).toEqual([
      "interface",
      "api",
      "services",
    ]);
    await expect(page.locator("#work .work-panel__notes").first()).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });
});

test.describe("work · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no track, no scale: stacked panels whose covers fade in", async ({ page }) => {
    await page.goto("/");
    const work = page.locator("#work .work");
    await expect(work).not.toHaveAttribute("data-mode", /.+/);
    await expect(page.locator("#work .work__stage")).toHaveCSS("position", "static");
    await page.locator("#work .work-panel").nth(1).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const cover = page.locator("#work [data-cover='media']").nth(1);
    await expect(cover).toHaveCSS("opacity", "1");
    expect(await cover.evaluate((node) => getComputedStyle(node).transform)).toBe("none");
  });
});

test.describe("work · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every project is a plain link in reading order", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#work .work-panel__link")).toHaveCount(3);
    await expect(page.locator("#work .work__stage")).toHaveCSS("position", "static");
    await expect(page.locator("#work .project-cover").first()).toBeVisible();
  });
});
