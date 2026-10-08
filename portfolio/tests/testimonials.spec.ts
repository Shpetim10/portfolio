import { expect, test, type Page } from "./fixtures";

/*
 * T12 peer review. No testimonials are supplied yet, so the homepage must leave
 * the section out entirely; stepping, autoplay and the pauses run on /lab, where
 * three layout fixtures (not testimonials, and labelled so) fill the section.
 * Autoplay is driven with Playwright's fake clock, not real 8-second waits.
 */

const section = (page: Page) => page.locator("section#peer-review");
const visibleQuote = (page: Page) => section(page).locator(".peer__slide[data-active] blockquote");
const count = (page: Page) => section(page).locator(".peer__count");
const AUTOPLAY = 8000;

/** Fake clock, installed before load so the autoplay timer is the faked one; then the lab, scrolled to the section. */
async function openLab(page: Page) {
  await page.clock.install();
  await page.goto("/lab/");
  await page.evaluate(() => document.fonts.ready);
  await section(page).scrollIntoViewIfNeeded();
  await expect(count(page)).toContainText("01 / 03");
}

test.describe("peer review · homepage", () => {
  test("is left out entirely while there are no testimonials", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("section#field-log")).toBeVisible();
    await expect(section(page)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Peer review" })).toHaveCount(0);
  });
});

test.describe("peer review · quotes", () => {
  test("one quote at a time at heading size, with its attribution in mono", async ({ page }) => {
    await openLab(page);
    await expect(section(page).locator("h2")).toHaveText("Peer review");
    await expect(section(page).locator(".section-index")).toContainText("Testimonials");
    await expect(section(page).getByRole("group", { name: "Peer review" })).toHaveAttribute(
      "aria-roledescription",
      "carousel",
    );

    // Three slides in the DOM, one in sight.
    await expect(section(page).locator(".peer__slide")).toHaveCount(3);
    await expect(section(page).locator(".peer__slide:visible")).toHaveCount(1);
    await expect(visibleQuote(page)).toContainText("Specimen quotation, set at heading size");
    await expect(section(page).locator(".peer__slide[aria-hidden='true']")).toHaveCount(2);

    const quote = await visibleQuote(page).evaluate((node) => {
      const style = getComputedStyle(node);
      return { size: style.fontSize, weight: style.fontWeight };
    });
    const heading = await page.evaluate(() => {
      const probe = Object.assign(document.createElement("p"), { className: "text-heading" });
      document.body.append(probe);
      const size = getComputedStyle(probe).fontSize;
      probe.remove();
      return size;
    });
    expect(quote.size).toBe(heading);
    expect(quote.weight).toBe("500");

    const attribution = section(page).locator(".peer__slide[data-active] figcaption");
    await expect(attribution).toHaveText(
      "Specimen A (opens in a new tab) · Lab fixture · Design system · Not a person",
    );
    const mono = await page.evaluate(() => {
      const probe = Object.assign(document.createElement("p"), { className: "font-mono" });
      document.body.append(probe);
      const family = getComputedStyle(probe).fontFamily;
      probe.remove();
      return family;
    });
    await expect(attribution).toHaveCSS("font-family", mono);
    await expect(attribution).toHaveCSS("text-transform", "uppercase");
    await expect(attribution.getByRole("link")).toHaveAttribute("rel", /noreferrer/);
    await expect(attribution.getByRole("link")).toHaveAttribute("target", "_blank");
  });

  test("prev and next step through the quotes and wrap", async ({ page }) => {
    await openLab(page);
    const next = section(page).getByRole("button", { name: "Next testimonial" });
    const prev = section(page).getByRole("button", { name: "Previous testimonial" });

    await next.click();
    await expect(count(page)).toContainText("02 / 03");
    await expect(visibleQuote(page)).toContainText("short");
    await next.click();
    await next.click();
    await expect(count(page)).toContainText("01 / 03");
    await prev.click();
    await expect(count(page)).toContainText("03 / 03");
    await expect(visibleQuote(page)).toContainText("medium length");
    await expect(section(page).locator(".peer__slide:visible")).toHaveCount(1);
  });

  test("the stage never changes height as quotes of different length step through", async ({ page }) => {
    await openLab(page);
    const heights: number[] = [];
    for (let step = 0; step < 3; step++) {
      heights.push(
        await section(page)
          .locator(".peer__slides")
          .evaluate((n) => n.getBoundingClientRect().height),
      );
      await section(page).getByRole("button", { name: "Next testimonial" }).click();
    }
    for (const height of heights) expect(height).toBeCloseTo(heights[0], 1);
  });
});

test.describe("peer review · autoplay", () => {
  test.skip(({ isMobile }) => isMobile, "hover and keyboard focus are desktop concerns");

  test("advances every 8 seconds", async ({ page }) => {
    await openLab(page);
    await page.clock.runFor(AUTOPLAY - 500);
    await expect(count(page)).toContainText("01 / 03");
    await page.clock.runFor(600);
    await expect(count(page)).toContainText("02 / 03");
    await page.clock.runFor(AUTOPLAY);
    await expect(count(page)).toContainText("03 / 03");
  });

  test("pauses while the pointer is over the section, then waits a full interval", async ({ page }) => {
    await openLab(page);
    await visibleQuote(page).hover();
    await page.clock.runFor(AUTOPLAY * 3);
    await expect(count(page)).toContainText("01 / 03");

    await page.mouse.move(0, 0);
    await page.clock.runFor(AUTOPLAY - 500);
    await expect(count(page)).toContainText("01 / 03");
    await page.clock.runFor(600);
    await expect(count(page)).toContainText("02 / 03");
  });

  test("pauses while keyboard focus is inside the section", async ({ page }) => {
    await openLab(page);
    await section(page).getByRole("button", { name: "Next testimonial" }).focus();
    await page.keyboard.press("Shift+Tab"); // Previous (focus-visible now that a key moved it)
    await page.clock.runFor(AUTOPLAY * 3);
    await expect(count(page)).toContainText("01 / 03");

    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await page.clock.runFor(AUTOPLAY + 100);
    await expect(count(page)).toContainText("02 / 03");
  });

  test("a pause/play control stops and restarts it", async ({ page }) => {
    await openLab(page);
    const toggle = section(page).getByRole("button", { name: /automatic rotation/ });
    await expect(toggle).toHaveText("Pause");
    await toggle.click();
    await page.mouse.move(0, 0);
    await expect(toggle).toHaveText("Play");
    await expect(toggle).toHaveAccessibleName("Resume automatic rotation");
    await page.clock.runFor(AUTOPLAY * 3);
    await expect(count(page)).toContainText("01 / 03");

    await toggle.click();
    await page.mouse.move(0, 0);
    await page.clock.runFor(AUTOPLAY + 100);
    await expect(count(page)).toContainText("02 / 03");
  });

  test("the live region is announced only while autoplay is off", async ({ page }) => {
    await openLab(page);
    const slides = section(page).locator(".peer__slides");
    await page.mouse.move(0, 0);
    await expect(slides).toHaveAttribute("aria-live", "off");
    await visibleQuote(page).hover();
    await expect(slides).toHaveAttribute("aria-live", "polite");
  });
});

test.describe("peer review · mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "the phone layout");

  test("controls are 48px and wrap inside the column; the page doesn't scroll sideways", async ({ page }) => {
    await page.goto("/lab/");
    await section(page).scrollIntoViewIfNeeded();
    const buttons = section(page).locator(".peer__controls .button");
    await expect(buttons).toHaveCount(3);
    for (const button of await buttons.all()) {
      expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(47.9); // 48px, less sub-pixel rounding
    }
    const edges = await section(page).evaluate((node) => {
      const controls = node.querySelector(".peer__controls")!.getBoundingClientRect();
      return { right: controls.right, viewport: window.innerWidth };
    });
    expect(edges.right).toBeLessThanOrEqual(edges.viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
  });

  test("a tap on Next does not leave autoplay stuck on hover", async ({ page }) => {
    await page.clock.install();
    await page.goto("/lab/");
    await section(page).scrollIntoViewIfNeeded();
    await section(page).getByRole("button", { name: "Next testimonial" }).tap();
    await expect(count(page)).toContainText("02 / 03");
    await page.clock.runFor(AUTOPLAY + 100);
    await expect(count(page)).toContainText("03 / 03");
  });
});

test.describe("peer review · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no autoplay, no pause control; quotes still step, by fade alone", async ({ page }) => {
    await openLab(page);
    await expect(section(page).getByRole("button", { name: /automatic rotation/ })).toHaveCount(0);
    await page.clock.runFor(AUTOPLAY * 3);
    await expect(count(page)).toContainText("01 / 03");

    await section(page).getByRole("button", { name: "Next testimonial" }).click();
    await expect(count(page)).toContainText("02 / 03");
    for (const slide of await section(page).locator(".peer__slide").all()) {
      await expect(slide).toHaveCSS("transform", "none");
      await expect(slide).toHaveCSS("transition-property", /opacity/);
      await expect(slide).toHaveCSS("transition-duration", /0\.2s/);
    }
    await expect(section(page).locator(".peer__stage")).toHaveCSS("opacity", "1");
  });
});

test.describe("peer review · no JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("every quote is listed in turn and the controls are left out", async ({ page }) => {
    await page.goto("/lab/");
    await expect(section(page).locator(".peer__slide:visible")).toHaveCount(3);
    await expect(section(page).locator("blockquote:visible")).toHaveCount(3);
    await expect(section(page).locator(".peer__controls")).toBeHidden();
  });
});
