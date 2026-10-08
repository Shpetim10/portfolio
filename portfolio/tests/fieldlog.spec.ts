import { expect, test } from "./fixtures";

/*
 * T11 field log. Neither the GitHub snapshot nor writing entries are supplied
 * yet, so the homepage shows two marked placeholders; the populated matrix is
 * covered by the build check (scripts/fetch-github.mjs never fails the build).
 */

test("section [08] shows marked placeholders and ships no token", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section#field-log");
  await expect(section).toHaveAttribute("aria-labelledby", "field-log-index");
  await expect(section.locator(".section-index")).toContainText("[08]");
  await expect(section.getByRole("heading", { name: "Field log" })).toBeVisible();
  await expect(section.locator("[data-todo]")).toHaveCount(2);

  const html = await page.content();
  expect(html).not.toMatch(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/);
});
