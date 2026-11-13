import { expect, test } from "./fixtures";

/*
 * T15 · SEO, metadata, social. Every page is indexable with its own canonical
 * on the production origin, a share card that serves as a PNG and valid
 * schema.org JSON-LD; robots.txt, the sitemap, the manifest and llms.txt are
 * exported beside them. Meta tags don't depend on the viewport: desktop only.
 */

const ORIGIN = "https://shpetimshabanaj.com";
const CASE = "/work/ritema/";

const PAGES: { path: string; og: string; types: string[] }[] = [
  { path: "/", og: "/og.png", types: ["WebSite", "ProfilePage"] },
  { path: "/work/", og: "/work/og.png", types: ["CollectionPage", "BreadcrumbList"] },
  { path: CASE, og: `${CASE}og.png`, types: ["CreativeWork", "BreadcrumbList"] },
];

test.describe("seo", () => {
  test.skip(({ isMobile }) => isMobile, "head tags are the same on every viewport");

  for (const { path, og, types } of PAGES) {
    test(`${path} is indexable, canonical, shareable and described`, async ({ page, request }) => {
      await page.goto(path);
      const head = page.locator("head");
      await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", `${ORIGIN}${path}`);
      await expect(head.locator('meta[property="og:url"]')).toHaveAttribute("content", `${ORIGIN}${path}`);
      await expect(head.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
      await expect(head.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
      await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );
      await expect(head.locator('meta[name="theme-color"]')).toHaveAttribute("content", /^#[0-9a-f]{6}$/i);

      const image = await head.locator('meta[property="og:image"]').getAttribute("content");
      expect(image).toBe(`${ORIGIN}${og}`);
      const card = await request.get(og);
      expect(card.status()).toBe(200);
      expect(card.headers()["content-type"]).toContain("image/png");

      const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
      expect(graph["@context"]).toBe("https://schema.org");
      expect(graph["@graph"].map((node: { "@type": string }) => node["@type"])).toEqual(types);
    });
  }

  test("the homepage names the owner in every spelling people search", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/^Shpëtim Shabanaj — Software Engineer/);
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    const person = graph["@graph"][1].mainEntity;
    expect(person["@id"]).toBe(`${ORIGIN}/#person`);
    expect(person.alternateName).toContain("Shpetim Shabanaj");
    expect(person.sameAs).toContain("https://github.com/Shpetim10");
    expect(person.award.join(" ")).toMatch(/First-Ranked Software Engineering Graduate, Epoka University/);
    await expect(page.locator('#contact a[rel~="me"]')).toHaveCount(person.sameAs.length);
  });

  test("lab pages are indexable with their own canonical", async ({ page }) => {
    await page.goto("/lab/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${ORIGIN}/lab/`);
  });

  test("the 404 stays out of the index", async ({ page }) => {
    await page.goto("/work/does-not-exist/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("robots.txt, sitemap, manifest and llms.txt are exported", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Allow: /");
    expect(robots).not.toMatch(/Disallow: \/\s*$/m);
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/", "/work/", CASE]) expect(sitemap).toContain(`<loc>${ORIGIN}${path}</loc>`);
    expect(sitemap).toContain("<image:loc>");

    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.name).toBe("Shpëtim Shabanaj");

    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    expect(await llms.text()).toMatch(/^# Shpëtim Shabanaj\n/);
  });
});
