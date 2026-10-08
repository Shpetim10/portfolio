import snapshot from "./generated/github.json";

/** One day of the contribution calendar (a snapshot written at build by scripts/fetch-github.mjs). */
export type ContributionDay = { date: string; count: number };
export type ContributionSnapshot = {
  login: string;
  fetchedAt: string;
  total: number;
  days: ContributionDay[];
};

/** The last snapshot; `days` is empty until the first successful fetch. */
export const getContributions = (): ContributionSnapshot => snapshot;
