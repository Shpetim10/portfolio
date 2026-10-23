import { expect, test, type Page } from "./fixtures";

/*
 * Fixed section indicator (bottom-left): names the homepage part crossing the
 * viewport's middle — "[NN] TITLE" for a section, "PROPORTION" alone for the
 * T09d bridge — and hides over the hero.
 */

const indicator = (page: Page) => page.locator(".section-indicator");

/** Centres a part on the viewport's middle line and lets Lenis, the observer and the decode settle. */
const centre = async (page: Page, selector: string) => {
  await page.locator(selector).evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForTimeout(900);
};

const reads = async (page: Page, number: string | null, title: string) => {
  await expect(indicator(page)).toHaveAttribute("data-shown", "");
  await expect(indicator(page).locator(".section-indicator__title")).toHaveText(title);
  if (number) await expect(indicator(page).locator(".section-indicator__number")).toHaveText(number);
  else await expect(indicator(page).locator(".section-indicator__number")).toHaveCount(0);
};

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test.describe(`section indicator · ${reducedMotion}`, () => {
    test.use({ reducedMotion });

    test("follows the sections, shows PROPORTION over the bridge, hides over the hero", async ({ page }) => {
      await page.goto("/");
      await expect(indicator(page)).toHaveAttribute("aria-hidden", "true");
      await expect(indicator(page)).not.toHaveAttribute("data-shown", /.*/);
      await expect(indicator(page)).toHaveCSS("position", "fixed");

      await centre(page, "#experience");
      await reads(page, "[06]", "Experience");
      await centre(page, "aside.proportion");
      await reads(page, null, "Proportion");
      await centre(page, "#education");
      await reads(page, "[07]", "Education");
      await centre(page, "#awards");
      await reads(page, "[08]", "Awards & Achievements");

      // The footer is shorter than half a screen: Contact holds the middle to the very end.
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
      );
      await page.waitForTimeout(900);
      await reads(page, "[11]", "Contact");
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(900);
      await expect(indicator(page)).not.toHaveAttribute("data-shown", /.*/);
    });
  });
}

test("only the indicator knows the bridge: indexes and menu order are unchanged", async ({ page }) => {
  await page.goto("/");
  const indexed = await page
    .locator("[data-indicator-title]")
    .evaluateAll((all) =>
      all.map((el) => [(el as HTMLElement).dataset.indicatorIndex ?? "", el.id || "bridge"]),
    );
  // Numbers only rise (a section without content renders nothing); the bridge has none and sits between 06 and 07.
  const numbers = indexed
    .map(([index]) => index)
    .filter(Boolean)
    .map(Number);
  expect(numbers).toEqual([...numbers].sort((x, y) => x - y));
  const bridge = indexed.findIndex(([, id]) => id === "bridge");
  expect(indexed[bridge][0]).toBe("");
  expect(indexed[bridge - 1]).toEqual(["06", "experience"]);
  expect(indexed[bridge + 1]).toEqual(["07", "education"]);

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("dialog").getByRole("link")).toContainText([
    "Work",
    "Stack",
    "Experience",
    "Education",
    "Awards",
    "Contact",
  ]);
});
