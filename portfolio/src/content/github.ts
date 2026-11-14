import "server-only";
import fallback from "./generated/github.json";

/** One day of the contribution calendar. */
export type ContributionDay = { date: string; count: number };
export type ContributionSnapshot = {
  login: string;
  fetchedAt: string;
  total: number;
  days: ContributionDay[];
};

/** Seconds the live calendar is cached before the next visit regenerates it (ISR). */
export const CONTRIBUTIONS_REVALIDATE = 3600;

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

type CalendarResponse = {
  errors?: unknown;
  data?: {
    viewer?: {
      login: string;
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: { contributionDays: { date: string; contributionCount: number }[] }[];
        };
      };
    };
  };
};

/**
 * The last year of GitHub contributions for the owner of CONTRIBUTIONS_TOKEN.
 *
 * Runs on the server only (the `server-only` import fails the build if a client
 * component pulls this in), so the token never reaches the browser. The response
 * is cached for an hour; Vercel regenerates the page in the background on the
 * first visit after that. With no token, or if GitHub fails, it returns the
 * committed snapshot in ./generated/github.json, so a render never breaks.
 */
export async function getContributions(): Promise<ContributionSnapshot> {
  const token = process.env.CONTRIBUTIONS_TOKEN?.trim();
  if (!token) return fallback;

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
      // GraphQL is POST-only, and POST requests are only cached when they opt in.
      cache: "force-cache",
      next: { revalidate: CONTRIBUTIONS_REVALIDATE },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return fallback;

    const body = (await response.json()) as CalendarResponse;
    const viewer = body.data?.viewer;
    const calendar = viewer?.contributionsCollection.contributionCalendar;
    if (body.errors || !viewer || !calendar) return fallback;

    const days = calendar.weeks
      .flatMap((week) => week.contributionDays)
      .map((day) => ({ date: day.date, count: day.contributionCount }))
      .slice(-364);
    if (days.length === 0) return fallback;

    return {
      login: viewer.login,
      fetchedAt: new Date().toISOString(),
      total: calendar.totalContributions,
      days,
    };
  } catch {
    return fallback;
  }
}
