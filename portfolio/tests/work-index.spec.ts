import { expect, test, type Page } from "./fixtures";

/*
 * Work index, /work/: every project in one register. The index probe
 * (src/components/work-index/IndexStage.tsx) reports the entry in view and how
 * many entry timelines have played.
 */

type Read = { active: number; entered: number };
type ProbeWindow = Window & { __INDEX_PROBE__?: { read?: () => Read } };

const enableProbe = (page: Page) =>
  page.addInitScript(() => {
    (window as ProbeWindow).__INDEX_PROBE__ = {};
  });
const read = (page: Page) => page.evaluate(() => (window as ProbeWindow).__INDEX_PROBE__!.read!());

test.describe("work index · content", () => {
  test("lists every project once, each with one link to its case study", async ({ page }) => {
    await page.goto("/work/");
    await expect(page.locator("h1")).toHaveText("All work");
    const entries = page.locator(".index-entry");
    const count = await entries.count();
    expect(count).toBeGreaterThan(5); // more than the homepage track shows
    for (let i = 0; i < count; i++) {
      const entry = entries.nth(i);
      await expect(entry.locator("a:not([tabindex='-1'])")).toHaveCount(1);
      await expect(entry.locator(".index-entry__cover-link")).toHaveAttribute("aria-hidden", "true");
      const id = await entry.getAttribute("id");
      await expect(entry.locator(".index-entry__link")).toHaveAttribute("href", `/work/${id}/`);
    }
  });

  test("the homepage, menu and case studies link to it", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#work .work__all a")).toHaveAttribute("href", "/work/");
    await expect(page.locator(".menu__page", { hasText: "All work" })).toHaveAttribute("href", "/work/");
    const slug = await page.locator("#work .work-panel__link").first().getAttribute("href");
    await page.goto(slug!);
    await expect(page.getByRole("link", { name: "← All work" })).toHaveAttribute("href", "/work/");
  });
});

test.describe("work index · motion", () => {
  test("entries play as they enter and the register follows the scroll", async ({ page, isMobile }) => {
    await enableProbe(page);
    await page.goto("/work/");
    await expect(page.locator(".work-index")).toHaveAttribute("data-mode", "live");
    await page.waitForFunction(() => !!(window as ProbeWindow).__INDEX_PROBE__?.read);

    const entries = page.locator(".index-entry");
    const last = (await entries.count()) - 1;
    await entries.nth(last).evaluate((node) => node.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(2000);

    expect((await read(page)).active).toBe(last);
    // An entry far above the one in view still played (end: "max").
    expect((await read(page)).entered).toBe(last + 1);
    const lastEntry = entries.nth(last);
    await expect(lastEntry.locator(".index-entry__title-text")).toHaveCSS("opacity", "1");
    await expect(lastEntry.locator(".index-entry__shutter")).toHaveCSS("transform", /matrix\(1, 0, 0, 0,/);
    // The title is unsplit once it has risen.
    await expect(lastEntry.locator(".reveal__line")).toHaveCount(0);

    if (!isMobile) {
      const current = page.locator(".work-index__register-link[aria-current='location']");
      await expect(current).toHaveCount(1);
      await expect(current).toHaveAttribute("href", `#${await lastEntry.getAttribute("id")}`);
    } else {
      await expect(page.locator(".work-index__register")).toBeHidden();
    }
  });

  test("reduced motion: everything in place, nothing hidden", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/work/");
    await page.waitForTimeout(500);
    await expect(page.locator(".work-index")).not.toHaveAttribute("data-mode", "live");
    const first = page.locator(".index-entry").first();
    await expect(first.locator(".index-entry__title-text")).toHaveCSS("opacity", "1");
    await expect(first.locator(".index-entry__shutter")).toHaveCSS("transform", /matrix\(1, 0, 0, 0,/);
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/work/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test("a fragment link lands with the register on that project", async ({ page, isMobile }) => {
  test.skip(isMobile, "the register is desktop only");
  await page.goto("/work/");
  const id = await page.locator(".index-entry").nth(4).getAttribute("id");
  await page.goto(`/work/#${id}`);
  await page.waitForTimeout(1500);
  await expect(page.locator(".work-index__register-link[aria-current='location']")).toHaveAttribute(
    "href",
    `#${id}`,
  );
  await expect(page.locator(`#${id} .index-entry__arrow`)).toHaveCSS("opacity", "1");
});

test.describe("home work track · fit and the way to all work", () => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    test(`panels and the foot fit a ${size.width}×${size.height} track`, async ({ page, isMobile }) => {
      test.skip(isMobile, "the track is desktop only");
      await page.setViewportSize(size);
      await page.goto("/");
      for (const progress of [0, 0.5, 1]) {
        await page.evaluate((p) => {
          const track = document.querySelector<HTMLElement>("#work .work")!;
          const top = track.getBoundingClientRect().top + window.scrollY;
          window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * p);
        }, progress);
        await page.waitForTimeout(600);
        const fits = await page.evaluate(() => {
          const stage = document.querySelector<HTMLElement>("#work .work__stage")!.getBoundingClientRect();
          const covers = [...document.querySelectorAll("#work .work-panel__cover")].map(
            (node) => node.getBoundingClientRect().top,
          );
          const foot = document.querySelector("#work .work__foot")!.getBoundingClientRect();
          return { coverTop: Math.min(...covers) - stage.top, footBottom: stage.bottom - foot.bottom };
        });
        expect(fits.coverTop).toBeGreaterThanOrEqual(0);
        expect(fits.footBottom).toBeGreaterThanOrEqual(0);
      }
    });
  }

  test("every panel and the foot fit the viewport; the button stays in view across the track", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/");
    const button = page.getByRole("link", { name: /View all \d+ projects/ });
    await expect(button).toHaveAttribute("href", "/work/");
    if (isMobile) {
      // Static stack: a full-width target under the cards.
      const [box, section] = await Promise.all([
        button.boundingBox(),
        page.locator("#work .work__stage").boundingBox(),
      ]);
      expect(box!.width).toBeGreaterThan(section!.width - 2);
      return;
    }

    for (const progress of [0, 0.5, 1]) {
      await page.evaluate((p) => {
        const track = document.querySelector<HTMLElement>("#work .work")!;
        const top = track.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + (track.offsetHeight - window.innerHeight) * p);
      }, progress);
      await page.waitForTimeout(700);

      const box = await button.boundingBox();
      const height = page.viewportSize()!.height;
      expect(box!.y).toBeGreaterThan(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);

      const fits = await page.evaluate(() => {
        const stage = document.querySelector<HTMLElement>("#work .work__stage")!.getBoundingClientRect();
        const covers = [...document.querySelectorAll("#work .work-panel__cover")].map(
          (node) => node.getBoundingClientRect().top,
        );
        const foot = document.querySelector("#work .work__foot")!.getBoundingClientRect();
        return { coverTop: Math.min(...covers) - stage.top, footBottom: stage.bottom - foot.bottom };
      });
      expect(fits.coverTop).toBeGreaterThanOrEqual(0);
      expect(fits.footBottom).toBeGreaterThanOrEqual(0);
    }

    // The fixed section indicator steps aside for the track's own readout while pinned.
    await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>("#work .work")!;
      window.scrollTo(0, track.getBoundingClientRect().top + window.scrollY + 200);
    });
    await page.waitForTimeout(700);
    await expect(page.locator(".section-indicator")).toHaveCSS("opacity", "0");
  });
});

test.describe("pre-paint failsafe · the app's JavaScript never runs", () => {
  test("the work index falls back to the complete static page", async ({ page }) => {
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (route) => route.abort());
    await page.goto("/work/");
    // The inline script still ran: live, entries hidden for their entrance.
    await expect(page.locator(".work-index")).toHaveAttribute("data-mode", "live");
    // …until the failsafe gives up on the motion code.
    await expect(page.locator(".work-index")).not.toHaveAttribute("data-mode", "live", { timeout: 5000 });
    const entries = page.locator(".index-entry");
    for (let i = 0; i < (await entries.count()); i++) {
      await expect(entries.nth(i).locator(".index-entry__title-text")).toHaveCSS("opacity", "1");
      await expect(entries.nth(i).locator(".index-entry__shutter")).toHaveCSS(
        "transform",
        /matrix\(1, 0, 0, 0,/,
      );
    }
  });

  test("the homepage track falls back to the stacked cards", async ({ page }) => {
    await page.route(/\/_next\/static\/chunks\/.*\.js/, (route) => route.abort());
    await page.goto("/");
    await expect(page.locator("#work .work")).not.toHaveAttribute("data-mode", "live", { timeout: 5000 });
    await expect(page.locator("#work .work-panel__link").last()).toBeVisible();
  });
});
