import { expect, test, type Page } from "./fixtures";

/*
 * T02 header, menu and status line. The cursor itself is covered in motion.spec.ts.
 */

const menu = (page: Page) => page.locator("#site-menu");
const menuButton = (page: Page) => page.getByRole("button", { name: "Menu", exact: true });

async function openMenu(page: Page) {
  await menuButton(page).click();
  await expect(menu(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
}

test.describe("header", () => {
  test("monogram, status and MENU", async ({ page, isMobile }) => {
    await page.goto("/");
    const header = page.locator("header.site-header");
    await expect(header.getByRole("link", { name: /home/i })).toBeVisible();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
    // Status sits centre on desktop; on mobile it lives in the menu footer.
    await expect(header.locator(".status")).toBeVisible({ visible: !isMobile });
  });

  test("the local time ticks", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const clock = page.locator(".site-header [data-clock]");
    await expect(clock).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    const first = await clock.textContent();
    await expect(clock).not.toHaveText(first!, { timeout: 2500 });
  });

  test("reduced motion: the clock shows minutes only", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".site-header [data-clock]")).toHaveText(/^\d{2}:\d{2}$/);
  });

  test("hides on scroll down and returns on scroll up", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "4000px";
      document.getElementById("main")!.append(spacer);
    });
    const header = page.locator("header.site-header");
    const top = () => header.evaluate((node) => node.getBoundingClientRect().bottom);

    const scrollBy = (dy: number) => page.evaluate((y) => window.scrollBy(0, y), dy);
    for (let i = 0; i < 6; i++) await scrollBy(200);
    await expect(header).toHaveAttribute("data-hidden", "");
    await expect.poll(top).toBeLessThanOrEqual(0);

    await scrollBy(-150);
    await expect(header).not.toHaveAttribute("data-hidden");
    await expect.poll(top).toBeGreaterThan(0);
    await expect(header).toHaveAttribute("data-scrolled", "");
  });
});

test.describe("menu", () => {
  test("focus is trapped, Esc closes and returns focus", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/");
    await openMenu(page);
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
    expect(await page.locator("main#main").evaluate((node) => (node as HTMLElement).inert)).toBe(true);

    // Forwards and backwards past both ends: focus never leaves the dialog.
    for (const key of [...Array(14).fill("Tab"), ...Array(14).fill("Shift+Tab")]) {
      await page.keyboard.press(key);
      expect(await page.evaluate(() => !!document.activeElement?.closest("#site-menu"))).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
    await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
    expect(await page.locator("main#main").evaluate((node) => (node as HTMLElement).inert)).toBe(false);
  });

  test("CLOSE returns focus to MENU", async ({ page }) => {
    await page.goto("/");
    await openMenu(page);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(menu(page)).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });

  test("links reveal, carry part numbers, and navigate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await openMenu(page);
    const nav = menu(page).getByRole("navigation", { name: "Primary" });
    await expect(nav.getByRole("link")).toHaveCount(5);
    await expect(nav.getByRole("link").first()).toContainText("P/N 01");
    // REVEAL lands every label on its resting position.
    await expect
      .poll(() =>
        menu(page)
          .locator(".menu__label")
          .evaluateAll((nodes) =>
            nodes.every((n) => getComputedStyle(n).transform === "matrix(1, 0, 0, 1, 0, 0)"),
          ),
      )
      .toBe(true);

    await nav.getByRole("link", { name: /Stack/ }).click();
    await expect(menu(page)).toBeHidden();
    await expect(page).toHaveURL(/#stack$/);
    expect(await page.evaluate(() => document.documentElement.dataset.menu)).toBeUndefined();
  });

  test("hovering a link raises its Instrument part (desktop)", async ({ page, isMobile }) => {
    test.skip(isMobile, "the part outline is a desktop feature");
    await page.goto("/");
    await openMenu(page);
    const figure = menu(page).locator(".part-outline");
    await expect(figure).toBeVisible();
    await menu(page)
      .getByRole("link", { name: /Experience/ })
      .hover();
    await expect(figure).toHaveAttribute("data-active", "services");
    await expect(figure.locator('.part-outline__label[data-layer="services"]')).toHaveCSS("opacity", "1");
    await page.mouse.move(5, 500);
    await expect(figure).not.toHaveAttribute("data-active");
  });

  test("the part outline is hidden on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 740 });
    await page.goto("/");
    await openMenu(page);
    await expect(menu(page).locator(".part-outline")).toBeHidden();
  });

  test("reduced motion: the overlay fades, nothing moves", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await openMenu(page);
    await expect(menu(page)).toHaveCSS("opacity", "1");
    const transforms = await menu(page)
      .locator(".menu__panel, .menu__label")
      .evaluateAll((nodes) => nodes.map((n) => getComputedStyle(n).transform));
    for (const transform of transforms) expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });

  test("works at 320px wide", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");
    const overflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflow()).toBe(0);
    await expect(menuButton(page)).toBeVisible();

    await openMenu(page);
    await page.waitForTimeout(1700); // let the open sequence land
    const panel = menu(page).locator(".menu__panel");
    expect(await panel.evaluate((node) => node.scrollWidth - node.clientWidth)).toBe(0);
    for (const link of await menu(page).locator(".menu__link").all()) {
      const box = (await link.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }
    // Every label fits on its row without clipping.
    const clipped = await menu(page)
      .locator(".menu__label")
      .evaluateAll((nodes) => nodes.filter((n) => n.scrollWidth > n.clientWidth).length);
    expect(clipped).toBe(0);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(menu(page)).toBeHidden();
  });
});
