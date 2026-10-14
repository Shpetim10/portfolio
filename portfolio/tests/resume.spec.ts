import { expect, test } from "./fixtures";

/*
 * T14 · Resume. The page shows the owner's real PDF (public/resume.pdf) as
 * written: an embedded viewer from md, an open-it card below, and open /
 * download links throughout. Nothing is rebuilt from content.
 */

test.describe("resume", () => {
  test("shows the real PDF, not a generated sheet", async ({ page, isMobile }) => {
    await page.goto("/resume/");
    await expect(page.locator(".resume__sheet")).toHaveCount(0);

    const viewer = page.locator("object.resume__viewer");
    await expect(viewer).toHaveAttribute("type", "application/pdf");
    await expect(viewer).toHaveAttribute("data", /^\/resume\.pdf#/);
    if (isMobile) {
      await expect(viewer).toBeHidden();
      await expect(page.locator(".resume__card").getByRole("link", { name: /Open the PDF/ })).toBeVisible();
    } else {
      await expect(viewer).toBeVisible();
      await expect(page.locator(".resume__card")).toBeHidden();
    }
  });

  test("opens and downloads the same file", async ({ page }) => {
    await page.goto("/resume/");
    const bar = page.locator(".resume__bar");
    await expect(bar.getByRole("link", { name: /Open in new tab/ })).toHaveAttribute("href", "/resume.pdf");
    await expect(bar.getByRole("link", { name: /Download PDF/ })).toHaveAttribute("href", "/resume.pdf");
    await expect(bar.getByRole("link", { name: /Download PDF/ })).toHaveAttribute("download", "");
  });

  test("the file itself is served as a PDF", async ({ request }) => {
    const response = await request.get("/resume.pdf");
    expect(response.ok()).toBe(true);
    expect((await response.body()).subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
