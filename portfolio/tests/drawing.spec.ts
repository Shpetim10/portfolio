import { expect, test, type Page } from "./fixtures";

/*
 * T09c glyph line drawing, on its tuning bench (/lab/drawing). Covers the
 * server-rendered final state, the pre → canvas swap without shift, the
 * drawing sequence and its reversibility, the layout anchors, and the
 * reduced-motion fallback.
 */

const ROUTE = "/lab/drawing/";

const live = (page: Page) => page.locator(".drawing[data-live]");
const setProgress = (page: Page, value: number) => page.getByLabel("Drawing progress").fill(String(value));

/** Alpha summed over every pixel of the glyph canvas. */
const ink = (page: Page) =>
  page.locator(".drawing__canvas").evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0;
    for (let i = 3; i < pixels.length; i += 4) sum += pixels[i];
    return sum;
  });

const dashOffsets = (page: Page) =>
  page
    .locator(".drawing__geometry path")
    .evaluateAll((paths) => paths.map((path) => Number(path.getAttribute("stroke-dashoffset"))));

test.describe("glyph line drawing", () => {
  test("server-renders the drawn geometry and the complete final grid, decorative", async ({ request }) => {
    const html = await (await request.get(ROUTE)).text();
    expect(html).toMatch(/<svg aria-hidden="true" class="drawing__geometry"/);
    // Solid lines in the static state: no dash pattern until the client has measured the box.
    expect(html).not.toMatch(/stroke-dasharray/);
    const pre = html.match(/<pre aria-hidden="true" class="drawing__pre">([\s\S]*?)<\/pre>/);
    expect(pre).not.toBeNull();
    const glyphs = pre![1]
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z#0-9]+;/g, "x")
      .replace(/\s/g, "");
    expect(glyphs.length).toBeGreaterThan(300);
    // The only signal in the component: the navel point.
    expect(html).toMatch(/class="drawing__navel"/);
  });

  test("the canvas takes over the pre's exact box", async ({ page }) => {
    await page.goto(ROUTE);
    await live(page).waitFor();
    const [pre, canvas, svg] = await Promise.all(
      [".drawing__pre", ".drawing__canvas", ".drawing__geometry"].map((selector) =>
        page.locator(selector).evaluate((el) => el.getBoundingClientRect().toJSON()),
      ),
    );
    expect(canvas).toEqual(pre);
    expect(svg).toEqual(pre);
    await expect(page.locator(".drawing__canvas")).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".drawing__pre")).toHaveCSS("visibility", "hidden");
  });

  test("draws square, circle, figure and navel in sequence, and scrubs back clean", async ({ page }) => {
    await page.goto(ROUTE);
    await live(page).waitFor();
    await page.getByTestId("drawing-stage").scrollIntoViewIfNeeded();

    await setProgress(page, 0);
    await page.waitForTimeout(400);
    expect(await dashOffsets(page)).toEqual([1, 1, 1]);
    expect(await ink(page)).toBe(0);
    await expect(page.locator(".drawing__navel")).toHaveCSS("opacity", "0");

    // Square done, circle halfway, no figure yet.
    await setProgress(page, 0.4);
    await page.waitForTimeout(400);
    const [square, right, left] = await dashOffsets(page);
    expect(square).toBe(0);
    expect(right).toBeCloseTo(0.5, 5);
    expect(left).toBeCloseTo(0.5, 5);
    expect(await ink(page)).toBe(0);

    await setProgress(page, 1);
    await page.waitForTimeout(600);
    expect(await dashOffsets(page)).toEqual([0, 0, 0]);
    expect(await ink(page)).toBeGreaterThan(0);
    await expect(page.locator(".drawing__navel")).toHaveCSS("opacity", "1");

    for (const value of [0.6, 1, 0.5, 0.9, 0]) {
      await setProgress(page, value);
      await page.waitForTimeout(80);
    }
    // A fade is 180 ms; then the readout window (0.5 s).
    await page.waitForTimeout(800);
    expect(await ink(page)).toBe(0);
    await expect(page.getByTestId("active")).toHaveText("0");
  });

  test("reports anchors on Leonardo's construction, in container pixels", async ({ page }) => {
    await page.goto(ROUTE);
    await live(page).waitFor();
    await page.getByLabel("Layout anchors").check();
    const anchors = page.getByTestId("anchors").locator("span");
    await expect(anchors).toHaveCount(5);
    const box = (await page.locator(".drawing").boundingBox())!;
    for (const anchor of await anchors.all()) {
      const point = (await anchor.boundingBox())!;
      expect(point.x).toBeGreaterThanOrEqual(box.x - point.width);
      expect(point.x).toBeLessThanOrEqual(box.x + box.width);
      expect(point.y).toBeGreaterThanOrEqual(box.y - point.height);
      expect(point.y).toBeLessThanOrEqual(box.y + box.height);
    }
  });

  test("reduced motion keeps the static final state: no canvas, no compass", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForTimeout(500);
    await expect(page.locator(".drawing__canvas")).toHaveCount(0);
    await expect(page.locator(".drawing__orbit")).toHaveCount(0);
    await expect(page.locator(".drawing__pre")).toBeVisible();
    await expect(page.locator(".drawing[data-live]")).toHaveCount(0);
    expect(await dashOffsets(page)).toEqual([0, 0, 0]);
  });
});
