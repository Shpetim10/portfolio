import { expect, test } from "./fixtures";

/*
 * T14 · Resume, withheld for now (src/content/resume.ts): the /resume page is
 * not built, the PDF is not served, and nothing on the site links to either.
 * When the resume is published again, restore the viewer tests from git history.
 */

test.describe("resume · withheld", () => {
  test("neither the page nor the PDF is served", async ({ request }) => {
    for (const path of ["/resume/", "/resume.pdf"]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test("no link leads to it: menu, contact, 404", async ({ page }) => {
    const toResume = 'a[href^="/resume"]';
    await page.goto("/");
    await expect(page.locator(toResume)).toHaveCount(0);
    await expect(page.locator("#contact").getByRole("heading", { name: "Resume" })).toHaveCount(0);
    await page.goto("/work/");
    await expect(page.locator(toResume)).toHaveCount(0);
    await page.goto("/this-part-does-not-exist/");
    await expect(page.locator(toResume)).toHaveCount(0);
  });
});
