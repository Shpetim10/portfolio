import type { Seo } from "./types";

// T15 · How the site introduces itself to search engines and link previews.
// Every claim below is already on the page: profile.ts (role, location),
// education.ts (Epoka, 4.0 GPA, rank #1) and awards.ts (the Prime Minister's
// Gold Medal). `freelance` is the owner's own statement (Nov 2026).
export const seo: Seo = {
  siteUrl: "https://shpetimshabanaj.com",
  title: "Shpëtim Shabanaj — Software Engineer, 4.0 GPA, Epoka Rank #1",
  description:
    "Shpëtim Shabanaj is a software engineer in Tirana, Albania: ranked first at Epoka University with a perfect 4.0 GPA and awarded the Prime Minister's Gold Medal for excellence.",
  // Most people type the name without the ë.
  alternateNames: ["Shpetim Shabanaj", "Shabanaj Shpëtim", "Shabanaj Shpetim"],
  keywords: [
    "Shpëtim Shabanaj",
    "Shpetim Shabanaj",
    "software engineer",
    "software engineer Albania",
    "software engineer Tirana",
    "freelance software engineer",
    "full-stack developer",
    "Java developer",
    "Epoka University",
    "Epoka University awards",
    "first-ranked Software Engineering graduate",
    "4.0 GPA",
    "Prime Minister's Gold Medal",
    "academic excellence",
  ],
  freelance: "Open to freelance software engineering projects.",
  // education.ts (Epoka grade and rank) and awards.ts (pm-gold-medal).
  cardFacts: [
    ["GPA", "4.0 / 4.0"],
    ["Epoka University", "Rank #1"],
    ["Prime Minister", "Gold Medal"],
  ],
};
