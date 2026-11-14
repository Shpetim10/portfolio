/**
 * Build-time refresh of the fallback GitHub contribution snapshot.
 *
 * The homepage fetches live contributions on the server and caches them for an
 * hour (src/content/github.ts, ISR). This script only keeps the fallback it uses
 * when GitHub is unreachable fresh: it reads CONTRIBUTIONS_TOKEN from the
 * environment (build machine only), asks the GraphQL API for the token owner's
 * last year of contributions and writes src/content/generated/github.json. Only
 * counts and dates are written; the token is never stored or logged.
 *
 * This script never fails the build: with no token, or if the API errors, it
 * keeps the last committed snapshot and exits 0.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/content/generated/github.json");
const QUERY = `query {
  viewer {
    login
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const keep = (reason) => {
  console.warn(`[github] ${reason} — keeping the last snapshot.`);
};

async function main() {
  const token = process.env.CONTRIBUTIONS_TOKEN?.trim();
  if (!token) return keep("CONTRIBUTIONS_TOKEN not set");

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return keep(`API answered ${response.status}`);

  const body = await response.json();
  const viewer = body?.data?.viewer;
  const calendar = viewer?.contributionsCollection?.contributionCalendar;
  if (body.errors || !calendar) return keep("API returned no calendar");

  const days = calendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => ({ date: day.date, count: day.contributionCount }))
    .slice(-364);
  if (days.length === 0) return keep("calendar was empty");

  const snapshot = {
    login: viewer.login,
    fetchedAt: new Date().toISOString(),
    total: calendar.totalContributions,
    days,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`[github] snapshot written: ${days.length} days, ${snapshot.total} contributions.`);
}

// Make sure a snapshot file always exists for the app to import, then try to refresh it.
await readFile(OUT).catch(async () => {
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify({ login: "", fetchedAt: "", total: 0, days: [] }, null, 2)}\n`);
});
await main().catch((error) => keep(`fetch failed (${error?.message ?? error})`));
