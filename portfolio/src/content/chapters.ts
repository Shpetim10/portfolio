/*
 * The fixed chapter order of every case study (content-schema.md · Project).
 * A story in /src/content/work/<slug>.mdx is exactly these six <Chapter>s, in
 * this order; src/content/stories.ts fails the build otherwise.
 */
export const CHAPTERS = [
  { id: "problem", title: "Problem" },
  { id: "constraints", title: "Constraints" },
  { id: "architecture", title: "Architecture" },
  { id: "decisions", title: "Key decisions" },
  { id: "results", title: "Results" },
  { id: "reflection", title: "Reflection" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
