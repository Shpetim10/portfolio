import { expect, test } from "@playwright/test";

// Viewport sweeps set their own sizes, so they run once (desktop project).
test.describe("/lab primitives", () => {
  test.skip(({ isMobile }) => isMobile, "viewport sweep runs on the desktop project");

  for (const width of [375, 768, 1440]) {
    test(`renders every specimen without horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/lab/");
      await page.evaluate(() => document.fonts.ready);
      for (const id of ["button", "link", "tag", "counter", "annotation", "section-shell"]) {
        await expect(page.locator(`section#${id}`)).toBeVisible();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBe(0);
      await testInfo.attach(`lab-${width}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: "image/png",
      });
    });
  }

  for (const width of [375, 2560]) {
    test(`annotations keep their geometry at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/lab/");
      await page.evaluate(() => document.fonts.ready);

      const leaders = await page.locator(".leader").evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          const leg = node.querySelector(".leader__leg")!.getBoundingClientRect();
          const run = node.querySelector(".leader__run")!.getBoundingClientRect();
          const dot = node.querySelector(".leader__dot")!.getBoundingClientRect();
          const direction = node.getAttribute("data-direction")!;
          const target = {
            x: direction.endsWith("left") ? box.right : box.left,
            y: direction.startsWith("up") ? box.bottom : box.top,
          };
          const elbowY = direction.startsWith("up") ? leg.top : leg.bottom;
          return {
            legRatio: leg.width / leg.height,
            runHeight: run.height,
            runToElbow: Math.abs(run.top + run.height / 2 - elbowY),
            dotOffset: Math.hypot(dot.left + dot.width / 2 - target.x, dot.top + dot.height / 2 - target.y),
          };
        }),
      );
      expect(leaders.length).toBeGreaterThan(0);
      for (const leader of leaders) {
        expect(leader.legRatio).toBeCloseTo(1, 1); // 45° leg
        expect(leader.runHeight).toBe(1); // 1px line at every size
        expect(leader.runToElbow).toBeLessThanOrEqual(1); // elbow joins the run
        expect(leader.dotOffset).toBeLessThanOrEqual(0.5); // dot centred on the target
      }

      const lineHeights = await page
        .locator(".dimension:visible .dimension__rule, .section-index__rule")
        .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
      expect(new Set(lineHeights)).toEqual(new Set([1]));

      const mark = await page.locator("svg.registration-mark").first().boundingBox();
      expect(mark?.width).toBe(12);
      expect(mark?.height).toBe(12);
    });
  }
});

test.describe("primitive focus", () => {
  test.skip(({ isMobile }) => isMobile, "keyboard navigation is a desktop concern");

  test("keyboard focus shows the signal outline on buttons and links", async ({ page }) => {
    await page.goto("/lab/");
    for (const selector of [
      "#button .button:not([tabindex='-1']):not(:disabled)",
      "#link .link:not([tabindex='-1'])",
    ]) {
      const target = page.locator(selector).first();
      // Focus the element before the target, then Tab into it so :focus-visible applies.
      await target.evaluate((node) => {
        const all = [...document.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")].filter(
          (el) => el.tabIndex >= 0,
        );
        all[all.indexOf(node as HTMLElement) - 1].focus();
      });
      await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
      const outline = await target.evaluate((node) => {
        const style = getComputedStyle(node);
        return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
      });
      expect(outline).toEqual({ style: "solid", width: "2px", color: "rgb(255, 79, 0)" });
    }
  });

  test("link underline fades instead of drawing under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab/");
    const preview = page.locator("#link .link[data-preview='hover']");
    const rest = page.locator("#link .link:not([data-preview])").first();
    const after = (locator: typeof preview) =>
      locator.evaluate((node) => {
        const style = getComputedStyle(node, "::after");
        return { transform: style.transform, opacity: style.opacity };
      });
    expect(await after(preview)).toEqual({ transform: "none", opacity: "1" });
    expect(await after(rest)).toEqual({ transform: "none", opacity: "0" });
  });
});
