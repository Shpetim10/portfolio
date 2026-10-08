import { expect, test, type Page } from "./fixtures";

/*
 * T14 · Resume. The real page (mostly TODO markers today) and the /lab
 * specimen filled to the content schema's limits must both print on exactly
 * one page of A4 and of US Letter. Chromium only (page.pdf).
 */

/** Pages in a PDF Chromium printed: count its /Type /Page objects. */
const printedPages = async (page: Page, format: "A4" | "Letter") => {
  const pdf = await page.pdf({ format });
  return (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
};

test.describe("resume · screen", () => {
  test("one sheet of ink on paper, every fact from content", async ({ page }) => {
    await page.goto("/resume/");
    const sheet = page.locator(".resume__sheet");
    await expect(sheet).toHaveAttribute("data-surface", "paper");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(sheet.locator("h2")).toHaveText([/Experience/, /Selected work/, /Skills/, /Recognition/]);
    // Owner data still missing: marked placeholders, never invented.
    await expect(sheet.locator("h1 mark")).toHaveText("TODO: Your name");
    // No PDF in /public yet: a TODO stands in for the download.
    await expect(page.locator(".resume__bar").getByText(/TODO: Resume PDF/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
  });
});

test.describe("resume · print", () => {
  test.beforeEach(({ browserName, isMobile }) => {
    test.skip(
      browserName !== "chromium" || isMobile,
      "page.pdf is Chromium-only; printing is a desktop task",
    );
  });

  for (const route of ["/resume/", "/lab/resume/"]) {
    test(`${route} prints on one page of A4 and US Letter`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      expect(await printedPages(page, "A4")).toBe(1);
      expect(await printedPages(page, "Letter")).toBe(1);
    });
  }

  test("prints the sheet alone, ink on unprinted paper", async ({ page }) => {
    await page.goto("/lab/resume/");
    await page.emulateMedia({ media: "print" });
    for (const chrome of [".site-header", ".title-block", ".resume__bar"]) {
      await expect(page.locator(chrome).first()).toBeHidden();
    }
    await expect(page.locator(".resume__sheet")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(page.locator(".resume__name")).toHaveCSS("color", "rgb(11, 10, 8)");
    // The one-page edit: older roles brief, projects past the third left to the screen.
    await expect(page.locator('.resume__entry[data-print="brief"] .resume__points').first()).toBeHidden();
    await expect(page.locator('.resume__entry[data-print="omit"]').first()).toBeHidden();
  });
});
