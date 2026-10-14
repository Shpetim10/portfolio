import { expect, test, type Page } from "./fixtures";

/*
 * T09b education — the training record between Experience and Awards.
 * Content: src/content/education.ts (Holberton in progress, Epoka featured,
 * high school), newest first.
 */

const section = (page: Page) => page.locator("section#education");
const rows = (page: Page) => section(page).locator("[data-edu='row']");

/** Scrolls one row's centre into view and lets Lenis and the scroll event settle. */
const bringIntoView = async (page: Page, selector: string) => {
  await page
    .locator(selector)
    .first()
    .evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(600);
};

/** Fill length as a share of the scale, measured from the rendered boxes. */
const fillShare = (page: Page, row: number) =>
  rows(page)
    .nth(row)
    .evaluate((el) => {
      const track = el.querySelector(".gauge__track")!.getBoundingClientRect();
      const fill = el.querySelector(".gauge__fill")!.getBoundingClientRect();
      return fill.width / track.width;
    });

test.describe("education · homepage", () => {
  test("section [07] sits between Experience and Awards; later sections renumbered", async ({ page }) => {
    await page.goto("/");
    const ids = await page
      .locator("main > section, main > * > section")
      .evaluateAll((all) => all.map((el) => el.id));
    expect(ids.indexOf("education")).toBe(ids.indexOf("experience") + 1);
    expect(ids.indexOf("awards")).toBe(ids.indexOf("education") + 1);

    await expect(section(page).locator(".section-index")).toContainText("[07]");
    await expect(section(page).locator(".section-index")).toContainText("Training record");
    await expect(page.getByRole("region", { name: "Education", exact: true })).toHaveCount(1);
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText("Education");
    await expect(page.locator("#awards .section-index")).toContainText("[08]");
    await expect(page.locator("#field-log .section-index")).toContainText("[09]");
    await expect(page.locator("#contact .section-index")).toContainText("[11]");
  });

  test("newest first, exactly one featured row, grades stated in words", async ({ page }) => {
    await page.goto("/");
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).locator("h3")).toHaveText([
      "Machine Learning Specialization",
      "B.Sc. Software Engineering",
      "High School Diploma",
    ]);
    await expect(section(page).locator("[data-featured]")).toHaveCount(1);
    await expect(rows(page).nth(1)).toHaveAttribute("data-featured", "true");
    await expect(rows(page).first().locator(".schooling__dates")).toHaveText(/^2026\.09 —to Present$/);
    await expect(rows(page).nth(1).locator(".schooling__dates")).toHaveText(/^2023\.10 —to 2026\.06$/);

    // The gauge is decorative; the row says the grade, and the HTML carries the final values.
    await expect(rows(page).locator(".gauge")).toHaveCount(2);
    for (const gauge of await rows(page).locator(".gauge").all()) {
      await expect(gauge).toHaveAttribute("aria-hidden", "true");
    }
    await expect(rows(page).nth(1).locator(".sr-only").last()).toHaveText("GPA 4.00 out of 4.00");
    await expect(rows(page).nth(2).locator(".sr-only").last()).toHaveText("Average 9.94 out of 10");
    const html = await (await page.request.get("/")).text();
    expect(html).toContain(">4.00</span>");
    expect(html).toContain(">9.94</span>");

    // In progress: no gauge, an LED and the status instead.
    await expect(rows(page).first().locator(".gauge")).toHaveCount(0);
    await expect(rows(page).first().locator(".schooling__status")).toHaveText("In progress");
    await expect(
      rows(page).first().getByRole("list", { name: "Coursework" }).getByRole("listitem"),
    ).toHaveCount(4);
  });

  test("the fill measures value / scale exactly", async ({ page }) => {
    await page.goto("/");
    await bringIntoView(page, "#education [data-edu='row']:last-child");
    await page.waitForTimeout(1500);
    expect(await fillShare(page, 1)).toBeCloseTo(1, 3);
    expect(await fillShare(page, 2)).toBeCloseTo(0.994, 3);
    // Calibrated: the figures end on their values.
    await expect(rows(page).nth(1).locator(".gauge__value")).toHaveText("4.00");
    await expect(rows(page).nth(2).locator(".gauge__count")).toHaveText("9.94");
    // Scale ticks at whole steps.
    await expect(rows(page).nth(1).locator(".gauge__tick")).toHaveText(["0", "1", "2", "3", "4"]);
    await expect(rows(page).nth(2).locator(".gauge__tick")).toHaveText(["0", "2", "4", "6", "8", "10"]);
  });

  test("related projects link to their case studies", async ({ page }) => {
    await page.goto("/");
    const links = rows(page).nth(1).locator(".schooling__project-list a");
    await expect(links).toHaveCount(4);
    const hrefs = await links.evaluateAll((all) => all.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual([
      "/work/ritema/",
      "/work/garbage-classifier/",
      "/work/worktrezz/",
      "/work/library-management-system/",
    ]);
    for (const href of hrefs) expect((await page.request.get(href!)).status()).toBe(200);
  });

  test("distinctions link to their award cards", async ({ page }) => {
    await page.goto("/");
    const linked = section(page).locator("a.tag--link");
    await expect(linked).toHaveCount(2);
    await expect(
      section(page).getByRole("link", { name: /^Rank #1 in program\s*, View award$/ }),
    ).toHaveAttribute("href", "#award-first-ranked-graduate");
    await expect(
      section(page).getByRole("link", { name: /^Prime Minister's Gold Medal\s*, View award$/ }),
    ).toHaveAttribute("href", "#award-pm-gold-medal");
    // A distinction without an award is a plain tag.
    await expect(section(page).locator("li.tag", { hasText: "High Honors" })).toHaveCount(1);

    const link = section(page).getByRole("link", { name: /Prime Minister's Gold Medal/ });
    await bringIntoView(page, "#education a[href='#award-pm-gold-medal']");
    await link.click();
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/#award-pm-gold-medal$/);
    const top = await page.locator("#award-pm-gold-medal").evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(200);
  });

  test("a deep link to an award card works from page load", async ({ page }) => {
    for (const id of ["award-pm-gold-medal", "award-first-ranked-graduate"]) {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(1500);
      const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(200);
    }
  });

  test("a deep link to a filtered-out card shows every group again", async ({ page, isMobile }) => {
    test.skip(isMobile, "the filter behaves the same; one viewport is enough");
    await page.goto("/");
    await bringIntoView(page, "#awards .record__filters");
    await page.getByRole("button", { name: /^Hackathon/ }).click();
    await expect(page.locator("#award-pm-gold-medal")).toBeHidden();
    await bringIntoView(page, "#education a[href='#award-pm-gold-medal']");
    await section(page)
      .getByRole("link", { name: /Prime Minister's Gold Medal/ })
      .click();
    await expect(page.locator("#award-pm-gold-medal")).toBeVisible();
    await expect(page.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("links are keyboard-reachable with a visible focus ring", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard navigation is a desktop concern");
    await page.goto("/");
    const link = section(page).locator("a").first();
    await link.focus();
    await expect(link).toBeFocused();
    const outline = await link.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
  });

  test("Person JSON-LD lists completed schooling only", async ({ page }) => {
    await page.goto("/");
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(data["@type"]).toBe("Person");
    expect(data.alumniOf).toEqual([
      {
        "@type": "EducationalOrganization",
        name: "Epoka University",
        address: { "@type": "PostalAddress", addressLocality: "Tirana", addressCountry: "Albania" },
      },
      {
        "@type": "EducationalOrganization",
        name: "Gjimnazi Babë Dudë Karbunara",
        address: { "@type": "PostalAddress", addressLocality: "Berat", addressCountry: "Albania" },
      },
    ]);
  });

  test("the menu files Education between Experience and Awards", async ({ page }) => {
    await page.goto("/");
    const labels = await page.locator("#site-menu .menu__label").allTextContents();
    expect(labels).toEqual(["Work", "Stack", "Experience", "Education", "Awards", "Contact"]);
  });
});

test.describe("education · mobile", () => {
  test("320px: no horizontal scroll; tag links are 44px targets", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout");
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await bringIntoView(page, "#education [data-featured]");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    const heights = await section(page)
      .locator("a.tag--link, .schooling__project")
      .evaluateAll((all) => all.map((a) => a.getBoundingClientRect().height));
    expect(heights.length).toBe(6);
    for (const height of heights) expect(height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("education · reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("gauges render filled with final values; the LED holds still", async ({ page }) => {
    await page.goto("/");
    await bringIntoView(page, "#education [data-featured]");
    await page.waitForTimeout(400);
    const featured = rows(page).nth(1);
    await expect(featured.locator(".gauge__value")).toHaveText("4.00");
    expect(await featured.locator(".gauge__fill").evaluate((el) => getComputedStyle(el).transform)).toBe(
      "none",
    );
    expect(
      await rows(page)
        .first()
        .locator(".schooling__led")
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe("none");
  });
});
