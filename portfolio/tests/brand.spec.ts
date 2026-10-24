import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test as firstVisit, type Page } from "@playwright/test";
import { getProfile } from "../src/content";
import { expect, test } from "./fixtures";

/*
 * BRAND-01 · Sh² logo system.
 *  - the brand files: size budget, no font dependency, the wordmark spelling;
 *  - the mark in place: favicon links, header, menu, footer title block, resume;
 *  - the header's first-load draw, and its absence on repeat visits and under
 *    reduced motion (`firstVisit` is @playwright/test itself, so the preloader runs);
 *  - /lab/logo: every option at every size on both surfaces and in both tones,
 *    drawn at its stated height, the square signal for "color", ink for "mono".
 */

const BRAND = join(process.cwd(), "assets-src/brand");
const brandSvgs = (dir = BRAND): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return brandSvgs(path);
    return name.endsWith(".svg") ? [path] : [];
  });

test.describe("Sh² brand files", () => {
  test.skip(({ isMobile }) => isMobile, "file checks run once");

  test("mark.svg is under 2KB on a 32 × 24 grid; mark-square.svg is 32 × 32", () => {
    const mark = readFileSync(join(BRAND, "mark.svg"), "utf8");
    expect(Buffer.byteLength(mark)).toBeLessThan(2048);
    expect(mark).toContain('viewBox="0 0 32 24"');
    expect(readFileSync(join(BRAND, "mark-square.svg"), "utf8")).toContain('viewBox="0 0 32 32"');
  });

  test("no brand SVG depends on a font or uses strokes", () => {
    const files = brandSvgs();
    expect(files.length).toBeGreaterThanOrEqual(7); // 4 final files + 3 options
    for (const file of files) {
      const svg = readFileSync(file, "utf8");
      expect(svg, file).not.toMatch(/<text|<style|@font-face|font-family|<image|stroke=/);
    }
  });

  test("the wordmark spells the owner's name, uppercase", () => {
    const wordmark = readFileSync(join(BRAND, "wordmark.svg"), "utf8");
    expect(wordmark).toContain(`<title>${getProfile().name.toUpperCase()}</title>`);
  });
});

test.describe("Sh² in place", () => {
  test("favicon, icon and apple-touch-icon come from the mark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('head link[rel="icon"][href^="/favicon.ico"]')).toHaveCount(1);
    await expect(page.locator('head link[rel="icon"][href^="/icon.svg"]')).toHaveCount(1);
    await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveCount(1);
  });

  test("header and menu: the mark links home, decorative inside a named link", async ({ page }) => {
    await page.goto("/");
    const home = page.locator("header.site-header").getByRole("link", { name: /— home$/ });
    await expect(home.locator('svg.logo[data-logo="mark"]')).toHaveAttribute("aria-hidden", "true");
    await expect(home).toHaveText(new RegExp(`^${getProfile().name} — home$`));
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await expect(page.locator('#site-menu .home-mark svg.logo[data-logo="mark"]')).toBeVisible();
  });

  test("footer title block and resume carry the mark", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('.title-block [data-field="drawn-by"] svg.logo[data-logo="mark"]')).toHaveCount(
      1,
    );
    await page.goto("/resume/");
    await expect(page.locator('.resume__bar svg.logo[data-logo="lockup"]')).toBeVisible();
  });

  test("the color tone lights the square in signal; mono takes the ink", async ({ page }) => {
    await page.goto("/lab/logo/");
    const fills = await page.locator("#kept figure").evaluateAll((figures) =>
      figures.map((figure) => {
        const square = figure.querySelector(".logo__exponent");
        return {
          tone: figure.closest("[data-mark-tone]")!.getAttribute("data-mark-tone"),
          fill: square ? getComputedStyle(square).fill : null,
          ink: getComputedStyle(figure.querySelector("svg")!).color,
        };
      }),
    );
    for (const { tone, fill, ink } of fills.filter(({ fill }) => fill)) {
      expect(fill).toBe(tone === "color" ? "rgb(255, 79, 0)" : ink);
    }
  });
});

/** Logs every dash change on the header mark's draw mask from navigation on. */
const recordDashes = (page: Page) =>
  page.addInitScript(() => {
    const log: (string | null)[] = [];
    (window as unknown as { __dashes: typeof log }).__dashes = log;
    new MutationObserver((records) => {
      for (const record of records) {
        const node = record.target as Element;
        if (node.closest(".site-header")) log.push(node.getAttribute("stroke-dasharray"));
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["stroke-dasharray"] });
  });
const dashes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __dashes: (string | null)[] }).__dashes);
const preloaderDone = (page: Page) =>
  page.waitForFunction(() => document.documentElement.dataset.preloader === "done", null, {
    timeout: 10_000,
  });

firstVisit.describe("Sh² header draw", () => {
  firstVisit("draws on after the preloader, in under 1s, and ends as the plain mark", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await recordDashes(page);
    await page.goto("/");
    await preloaderDone(page);
    const total = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const ms = (name: string) => parseFloat(style.getPropertyValue(name));
      return 2 * ms("--logo-draw") + ms("--logo-breath");
    });
    expect(total).toBeLessThan(1000);
    await expect.poll(() => dashes(page)).toContain("1 1"); // hidden, ready to draw
    const lines = page.locator(".site-header [data-draw]");
    await expect(lines).toHaveCount(4);
    // Finished: every dash removed, the square at full strength.
    await expect
      .poll(() => lines.evaluateAll((nodes) => nodes.every((n) => !n.hasAttribute("stroke-dasharray"))))
      .toBe(true);
    await expect(page.locator('.site-header [data-part="exponent"]')).toHaveCSS("opacity", "1");
  });

  firstVisit("stays static under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await recordDashes(page);
    await page.goto("/");
    await preloaderDone(page);
    await page.waitForTimeout(1500);
    expect(await dashes(page)).toEqual([]);
  });
});

test("Sh² header draw: a repeat visit shows the static mark", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await recordDashes(page);
  await page.goto("/");
  await preloaderDone(page);
  await page.waitForTimeout(1500);
  expect(await dashes(page)).toEqual([]);
});

const ROUTE = "/lab/logo/";
const VARIANTS = ["a", "b", "c"];

test.describe("Sh² option bench", () => {
  test.skip(({ isMobile }) => isMobile, "viewport sweep runs on the desktop project");

  for (const width of [375, 768, 1440]) {
    test(`renders every variant without horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTE);
      await page.evaluate(() => document.fonts.ready);
      for (const id of VARIANTS) {
        const variant = page.locator(`#variant-${id}`);
        await expect(variant).toBeVisible();
        // 2 surfaces × (2 tones × 4 sizes + 2 tones at 512).
        await expect(variant.locator(".logo-lab__specimen")).toHaveCount(20);
      }
      await expect(page.locator(".logo-lab__tab")).toHaveCount(6);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBe(0);
      await testInfo.attach(`lab-logo-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  }

  test("draws each specimen at its stated height, and the tone sets the square", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTE);
    const specimens = await page.locator("#variant-a .logo-lab__specimen").evaluateAll((figures) =>
      figures.map((figure) => {
        const mark = figure.querySelector("svg")!;
        const square = mark.querySelector("[data-exponent]")!;
        return {
          size: Number(figure.getAttribute("data-size")),
          height: mark.getBoundingClientRect().height,
          tone: figure.closest("[data-mark-tone]")!.getAttribute("data-mark-tone"),
          square: getComputedStyle(square).fill,
          ink: getComputedStyle(mark).color,
        };
      }),
    );
    for (const { size, height, tone, square, ink } of specimens) {
      expect(height).toBeCloseTo(size, 0);
      if (tone === "color") expect(square).toBe("rgb(255, 79, 0)");
      else expect(square).toBe(ink);
    }
  });
});
