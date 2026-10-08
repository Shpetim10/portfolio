/**
 * T11 · Build-time GitHub contribution snapshot.
 *
 * Reads GITHUB_USER and GITHUB_TOKEN from the environment (build machine only),
 * asks the GraphQL API for the last year of contributions and writes
 * src/content/generated/github.json. Only counts and dates are written — the
 * token is never stored, logged or imported by the app, so it cannot ship.
 *
 * This script never fails the build: with no credentials, or if the API errors,
 * it keeps the last committed snapshot and exits 0.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/content/generated/github.json");
const QUERY = `query($login: String!) {
  user(login: $login) {
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
  const login = process.env.GITHUB_USER?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!login || !token) return keep("GITHUB_USER / GITHUB_TOKEN not set");

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return keep(`API answered ${response.status}`);

  const body = await response.json();
  const calendar = body?.data?.user?.contributionsCollection?.contributionCalendar;
  if (body.errors || !calendar) return keep("API returned no calendar");

  const days = calendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => ({ date: day.date, count: day.contributionCount }))
    .slice(-364);
  if (days.length === 0) return keep("calendar was empty");

  const snapshot = { login, fetchedAt: new Date().toISOString(), total: calendar.totalContributions, days };
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
