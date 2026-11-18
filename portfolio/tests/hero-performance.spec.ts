import { startBrotliOrigin } from "./brotli-origin";
import { expect, test } from "./fixtures";
// Trace recording captures screenshots and DOM snapshots during navigation.
test.use({ trace: "off" });

test("interactive within 2.5s on a mid-range phone", async ({ page, context, baseURL }) => {
  if (!baseURL) throw new Error("The production build's base URL is required");
  // Mid-range mobile: 4× CPU slowdown on Lighthouse's slow 4G.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  const origin = await startBrotliOrigin(baseURL);
  try {
    const response = await page.goto(origin.url, { waitUntil: "commit" });
    expect(response?.headers()["content-encoding"]).toBe("br");
    const at = await page.waitForFunction(
      () => performance.getEntriesByName("hero:interactive")[0]?.startTime,
      undefined,
      { timeout: 10_000 },
    );
    const interactiveMs = Number(await at.jsonValue());
    await test.info().attach("hero interactive time", {
      body: `${interactiveMs.toFixed(0)} ms`,
      contentType: "text/plain",
    });
    expect(interactiveMs).toBeLessThan(2500);
  } finally {
    origin.close();
  }
});
