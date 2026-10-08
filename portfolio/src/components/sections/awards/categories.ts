import type { Award, AwardCategory } from "@/content/types";

/*
 * How the qualification record files each award category: its name, and the
 * three-letter code its stamp carries. The order is the record's: groups and
 * filter tabs follow it (content-schema.md lists the categories the same way).
 */
export const CATEGORIES: Record<AwardCategory, { label: string; code: string }> = {
  competition: { label: "Competition", code: "CMP" },
  hackathon: { label: "Hackathon", code: "HCK" },
  certification: { label: "Certification", code: "CRT" },
  workplace: { label: "Workplace", code: "WRK" },
  publication: { label: "Publication", code: "PUB" },
  talk: { label: "Talk", code: "TLK" },
  "open-source": { label: "Open source", code: "OSS" },
  ranking: { label: "Ranking", code: "RNK" },
  scholarship: { label: "Scholarship", code: "SCH" },
};

const ORDER = Object.keys(CATEGORIES) as AwardCategory[];

/** An award with its entry number in the record ("02"). */
export type Entry = Award & { entry: string };

export type Group = { category: AwardCategory; entries: Entry[] };

export const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The record: the featured award is entry 01; the rest are grouped by category
 * (record order), newest first within a group, and numbered on from 02 in the
 * order they are shown. Undated (TODO) awards sort last in their group.
 */
export function fileAwards(awards: Award[]): { featured?: Entry; groups: Group[]; total: number } {
  const featured = awards.find((award) => award.featured);
  const rest = awards.filter((award) => award !== featured);
  let next = featured ? 2 : 1;
  const groups = ORDER.flatMap((category) => {
    const entries = rest
      .filter((award) => award.category === category)
      .sort((a, b) => b.year - a.year)
      .map((award) => ({ ...award, entry: pad(next++) }));
    return entries.length > 0 ? [{ category, entries }] : [];
  });
  return { featured: featured && { ...featured, entry: pad(1) }, groups, total: awards.length };
}
