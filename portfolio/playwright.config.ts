import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the production build (`next build` then `next start`).
const PORT = 3100;
const HERO_PERFORMANCE = "**/hero-performance.spec.ts";
const mobile = { ...devices["Pixel 7"] };

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: HERO_PERFORMANCE,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", testIgnore: HERO_PERFORMANCE, use: mobile },
    {
      name: "mobile-performance",
      testMatch: HERO_PERFORMANCE,
      use: mobile,
      // Run after the UI suites so other browsers don't compete for CPU during the measurement.
      dependencies: ["desktop", "mobile"],
      workers: 1,
    },
  ],
  webServer: {
    command: "pnpm serve",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
