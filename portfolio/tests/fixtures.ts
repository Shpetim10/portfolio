import { test as base } from "@playwright/test";

/*
 * Shared test: every page starts as a repeat visit, so the first-visit preloader
 * (T01) never covers the page under test. tests/preloader.spec.ts opts back in
 * by importing straight from @playwright/test.
 */
export const test = base.extend<{ calibrated: void }>({
  calibrated: [
    async ({ page }, use) => {
      await page.addInitScript(() => sessionStorage.setItem("ev:calibrated", "1"));
      await use();
    },
    { auto: true },
  ],
});

export { expect, type Page } from "@playwright/test";
