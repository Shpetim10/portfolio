import { expect, test } from "./fixtures";

/*
 * T11 field log. The GitHub snapshot is supplied (scripts/fetch-github.mjs, which
 * never fails the build); writing entries are not, so the empty writing log
 * stays hidden.
 */

test("section [09] hides missing writing and ships no token", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("section#field-log");
  await expect(section).toHaveAttribute("aria-labelledby", "field-log-index");
  await expect(section.locator(".section-index")).toContainText("[09]");
  await expect(section.getByRole("heading", { name: "Field log" })).toBeVisible();
  await expect(section.locator("[data-todo]")).toHaveCount(0);
  await expect(section.locator('[data-fieldlog="log"]')).toHaveCount(0);

  const html = await page.content();
  expect(html).not.toMatch(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/);
});
