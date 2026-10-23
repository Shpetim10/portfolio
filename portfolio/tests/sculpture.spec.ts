import { expect, test, type Page } from "./fixtures";

/*
 * T04b symbol sculpture, on its tuning bench (/lab/sculpture). Covers the
 * server-rendered final grid, the pre → canvas swap without shift, the
 * reduced-motion fallback, and that scrubbing back leaves nothing behind.
 */

const ROUTE = "/lab/sculpture/";

const live = (page: Page) => page.locator(".sculpture[data-live]");
const setProgress = (page: Page, value: number) => page.getByLabel("Assembly progress").fill(String(value));

/** Alpha summed over every pixel of both canvases. */
const ink = (page: Page) =>
  page.locator(".sculpture__canvas").evaluateAll((canvases) =>
    (canvases as HTMLCanvasElement[]).map((canvas) => {
      const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 3; i < pixels.length; i += 4) sum += pixels[i];
      return sum;
    }),
  );

test.describe("symbol sculpture", () => {
  test("server-renders the complete final grid, decorative", async ({ request }) => {
    const html = await (await request.get(ROUTE)).text();
    const pre = html.match(/<pre aria-hidden="true" class="sculpture__pre">([\s\S]*?)<\/pre>/);
    expect(pre).not.toBeNull();
    // Hundreds of glyphs, not an empty shell: the no-JS state must look complete.
    const glyphs = pre![1]
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z#0-9]+;/g, "x")
      .replace(/\s/g, "");
    expect(glyphs.length).toBeGreaterThan(500);
  });

  test("the canvas takes over the pre's exact box", async ({ page }) => {
    await page.goto(ROUTE);
    await live(page).waitFor();
    const [pre, canvas] = await Promise.all(
      [".sculpture__pre", ".sculpture__canvas"].map((selector) =>
        page
          .locator(selector)
          .first()
          .evaluate((el) => el.getBoundingClientRect().toJSON()),
      ),
    );
    expect(canvas).toEqual(pre);
    await expect(page.locator(".sculpture__canvas").first()).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".sculpture__pre")).toHaveCSS("visibility", "hidden");
  });

  test("scrubbing back to 0 leaves no glyph or particle behind", async ({ page }) => {
    await page.goto(ROUTE);
    await live(page).waitFor();
    await page.getByTestId("sculpture-stage").scrollIntoViewIfNeeded();
    for (const value of [0.4, 1, 0.1, 0.8, 0.3, 1, 0]) {
      await setProgress(page, value);
      await page.waitForTimeout(80);
    }
    // Longest motion is a 1.2 s wind release; then the readout window (0.5 s).
    await page.waitForTimeout(1800);
    expect(await ink(page)).toEqual([0, 0]);
    await expect(page.getByTestId("flights")).toHaveText("0");
    await expect(page.getByTestId("releases")).toHaveText("0");
  });

  test("reduced motion keeps the static pre and draws no canvas", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(ROUTE);
    await page.waitForTimeout(500);
    await expect(page.locator(".sculpture__canvas")).toHaveCount(0);
    await expect(page.locator(".sculpture__pre")).toBeVisible();
    await expect(page.locator(".sculpture[data-live]")).toHaveCount(0);
  });
});
