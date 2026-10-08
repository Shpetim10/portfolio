import { expect, test, type Page } from "./fixtures";

/*
 * T13 contact + title block. The owner's email and the form endpoint are still
 * TODO, so the homepage shows them as marked placeholders (form disabled); the
 * copy, validation and send states run on /lab against a reserved example.com
 * fixture, with the form service stubbed by page.route — nothing leaves the test.
 */

const ENDPOINT = "https://forms.example.com/lab-specimen";
const section = (page: Page) => page.locator("section#contact");
const form = (page: Page) => section(page).locator("form");
const field = (page: Page, name: string) => form(page).locator(`[name="${name}"]`);
const submit = (page: Page) => section(page).locator('[data-contact="submit"]');

async function openLab(page: Page) {
  await page.goto("/lab/");
  await page.evaluate(() => document.fonts.ready);
  await form(page).scrollIntoViewIfNeeded();
}

async function fill(page: Page) {
  await field(page, "name").fill("Specimen Sender");
  await field(page, "email").fill("sender@example.com");
  await field(page, "message").fill("A layout fixture message.");
}

test.describe("contact · homepage", () => {
  test("the line, the menu anchor, and TODO markers for what the owner hasn't supplied", async ({ page }) => {
    await page.goto("/");
    await expect(section(page).locator(".section-index")).toContainText("Contact");
    await expect(section(page).locator("h2").first()).toHaveText("Let’s build something precise.");
    await expect(page.locator('a[href="/#contact"]').first()).toBeAttached();

    // No email yet: the address is a marked placeholder, the button can't mail anyone.
    await expect(
      section(page).locator("[data-todo] mark", { hasText: "email@domain" }).first(),
    ).toBeVisible();
    await expect(section(page).locator('[data-contact="primary"]')).toHaveAttribute("aria-disabled", "true");
    await expect(section(page).locator('[data-contact="copy"]')).toHaveCount(0);
    // No endpoint yet: the form can't post anywhere, and says why.
    await expect(submit(page)).toBeDisabled();
    await expect(section(page).getByText("TODO: Form endpoint")).toBeVisible();
    await expect(section(page).getByText(/TODO: Resume PDF/)).toBeVisible();
  });
});

test.describe("contact · title block", () => {
  test("is the footer on every page: drawn by, project, rev, scale, sheet, local time", async ({ page }) => {
    for (const route of ["/", "/resume/"]) {
      await page.goto(route);
      const block = page.getByRole("contentinfo");
      await expect(block).toHaveAccessibleName("Title block");
      await expect(block.locator("dt")).toHaveText([
        "Drawn by",
        "Project",
        "Rev",
        "Scale",
        "Sheet",
        "Local time",
      ]);
      await expect(block.locator('[data-field="project"] dd')).toHaveText("Portfolio");
      await expect(block.locator('[data-field="rev"] time')).toHaveAttribute(
        "datetime",
        /^\d{4}-\d{2}-\d{2}$/,
      );
      await expect(block.locator('[data-field="rev"] dd')).toHaveText(/^\d{4}\.\d{2}\.\d{2}$/);
      await expect(block.locator('[data-field="scale"] dd')).toHaveText("1:1");
      await expect(block.locator('[data-field="sheet"] dd')).toHaveText("1 of 1");
      await expect(block.locator("[data-clock]")).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    }
  });
});

test.describe("contact · email", () => {
  test("copies the address and confirms in mono", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openLab(page);
    const copy = section(page).locator('[data-contact="copy"]');
    await expect(section(page).locator(".contact__address")).toHaveAttribute(
      "href",
      "mailto:specimen@example.com",
    );
    await copy.click();
    await expect(copy).toHaveText("Copied ✓");
    await expect(copy).toHaveCSS("text-transform", "uppercase");
    await expect(section(page).getByRole("status").filter({ hasText: "copied" })).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("specimen@example.com");
    await expect(copy).toHaveText("Copy", { timeout: 5000 });
  });
});

test.describe("contact · form", () => {
  test("validates on submit: errors under their fields, announced, first one focused", async ({ page }) => {
    await openLab(page);
    let posted = false;
    await page.route(ENDPOINT, (route) => {
      posted = true;
      return route.fulfill({ json: { ok: true } });
    });

    await submit(page).click();
    await expect(section(page).locator(".contact__error")).toHaveCount(3);
    await expect(field(page, "name")).toBeFocused();
    await expect(field(page, "name")).toHaveAttribute("aria-invalid", "true");
    const describedBy = await field(page, "email").getAttribute("aria-describedby");
    await expect(page.locator(`#${describedBy}`)).toHaveText(/Enter your email address/);
    await expect(section(page).locator(".contact__status")).toContainText("3 fields need attention.");

    // Flagged fields re-check as you type.
    await field(page, "email").fill("not-an-address");
    await expect(page.locator(`#${describedBy}`)).toHaveText(/like name@domain\.com/);
    await fill(page);
    await expect(section(page).locator(".contact__error")).toHaveCount(0);
    expect(posted).toBe(false);
  });

  test("sends as JSON-accepting FormData and shows success in place", async ({ page }) => {
    await openLab(page);
    let request: { accept?: string; body: string } | undefined;
    await page.route(ENDPOINT, (route) => {
      request = { accept: route.request().headers()["accept"], body: route.request().postData() ?? "" };
      return route.fulfill({ json: { ok: true, next: "/thanks" } });
    });
    await fill(page);
    await submit(page).click();

    const done = section(page).locator('[data-contact="sent"]');
    await expect(done).toContainText("Message sent ✓");
    await expect(done).toBeFocused();
    expect(request?.accept).toBe("application/json");
    expect(request?.body).toContain("sender@example.com");
    expect(request?.body).toContain('name="_gotcha"');

    await done.getByRole("button", { name: "Write another" }).click();
    await expect(field(page, "name")).toBeFocused();
    await expect(field(page, "name")).toHaveValue("");
  });

  test("shows the service's field errors and a failure with the mailto way out", async ({ page }) => {
    await openLab(page);
    await page.route(ENDPOINT, (route) =>
      route.fulfill({
        status: 422,
        json: { errors: [{ field: "email", code: "TYPE_EMAIL", message: "should be an email" }] },
      }),
    );
    await fill(page);
    await submit(page).click();
    await expect(section(page).locator(".contact__status")).toContainText("Not sent ✕");
    await expect(field(page, "email")).toBeFocused();
    await expect(field(page, "email")).toHaveAttribute("aria-invalid", "true");

    await page.unroute(ENDPOINT);
    await page.route(ENDPOINT, (route) => route.abort());
    await submit(page).click();
    const failure = section(page).locator('[data-contact="failure"]');
    await expect(failure).toContainText("check the connection");
    await expect(failure.getByRole("link", { name: "specimen@example.com" })).toHaveAttribute(
      "href",
      "mailto:specimen@example.com",
    );
  });

  test("a filled honeypot looks sent and posts nothing", async ({ page }) => {
    await openLab(page);
    let posted = false;
    await page.route(ENDPOINT, (route) => {
      posted = true;
      return route.fulfill({ json: { ok: true } });
    });
    const trap = field(page, "_gotcha");
    await expect(trap).toHaveAttribute("tabindex", "-1");
    await expect(trap).toHaveAttribute("autocomplete", "off");
    await expect(section(page).locator(".contact__trap")).toHaveAttribute("aria-hidden", "true");

    await fill(page);
    await trap.evaluate((input: HTMLInputElement) => (input.value = "bot"));
    await submit(page).click();
    await expect(section(page).locator('[data-contact="sent"]')).toBeVisible();
    expect(posted).toBe(false);
  });
});

test.describe("contact · without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the form posts natively, and the mailto fallback is there", async ({ page }) => {
    await page.goto("/lab/");
    await expect(form(page)).toHaveAttribute("action", ENDPOINT);
    await expect(form(page)).toHaveAttribute("method", /post/i);
    await expect(form(page)).not.toHaveAttribute("novalidate", /.*/);
    for (const name of ["name", "email", "message"])
      await expect(field(page, name)).toHaveAttribute("required", "");
    await expect(field(page, "email")).toHaveAttribute("type", "email");
    await expect(section(page).locator('[data-contact="fallback"] a')).toHaveAttribute(
      "href",
      "mailto:specimen@example.com",
    );
    await expect(section(page).locator('[data-contact="primary"]')).toHaveAttribute(
      "href",
      "mailto:specimen@example.com",
    );
    await expect(section(page).locator('[data-contact="copy"]')).toBeHidden();
  });
});

test.describe("contact · the Instrument", () => {
  const station = (page: Page) => section(page).locator(".contact__station");
  const scrollFigureTo = (page: Page, fraction: number) =>
    page.evaluate((at) => {
      const figure = document.querySelector('#contact [data-contact="figure"]')!;
      const box = figure.getBoundingClientRect();
      window.scrollTo(0, box.top + window.scrollY + box.height / 2 - window.innerHeight * at);
    }, fraction);
  const socketScale = (page: Page) =>
    section(page)
      .locator('[data-contact="socket"]')
      .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);

  test("reassembles on scroll, and its LED lands in the primary button", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/lab/");
    await expect(station(page)).toHaveAttribute("data-mode", "live");
    const plateY = () =>
      section(page)
        .locator('.instrument-drawing__plate[data-layer="infrastructure"]')
        .getAttribute("transform");

    await scrollFigureTo(page, 1.1); // just below the fold: still exploded
    await page.waitForTimeout(400);
    const exploded = await plateY();
    expect(await socketScale(page)).toBe(0);

    await scrollFigureTo(page, 0.3); // centre well above 50%: assembled, LED handed over
    await expect(station(page)).toHaveAttribute("data-lit", "");
    expect(await plateY()).not.toBe(exploded);
    expect(await socketScale(page)).toBe(1);
    await expect(section(page).locator(".instrument-drawing__led")).toHaveCSS("opacity", "0");

    await scrollFigureTo(page, 1.1); // back up: the light returns, the parts separate
    await expect(station(page)).not.toHaveAttribute("data-lit", /.*/);
    await expect.poll(() => socketScale(page)).toBe(0);
    await expect.poll(plateY).toBe(exploded);
  });

  test("reduced motion: assembled, the LED already in the button, nothing moves", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/lab/");
    await scrollFigureTo(page, 0.5);
    await expect(station(page)).not.toHaveAttribute("data-mode", /.*/);
    expect(await socketScale(page)).toBe(1);
    await expect(section(page).locator(".instrument-drawing__led")).toHaveCSS("opacity", "0");
    await expect(section(page).locator(".contact__socket-led")).toHaveCSS("animation-name", "none");
  });
});
