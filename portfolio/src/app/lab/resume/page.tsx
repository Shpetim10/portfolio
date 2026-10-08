import type { Metadata } from "next";
import { ResumeSheet, type ResumeContent } from "@/components/resume/ResumeSheet";
import type { Layer } from "@/content";

export const metadata: Metadata = {
  title: "Lab — Resume fit",
  robots: { index: false, follow: false },
};

/*
 * T14 print-fit specimen: the resume sheet filled to the content schema's
 * upper bounds (5 roles × 3 highlights, 5 featured projects × 4 outcomes,
 * 20 skills, 5 awards, 3 pieces of writing), at the lengths the schema allows.
 * None of it is about the owner — every string says it is a specimen, every
 * link is example.com. tests/resume.spec.ts prints it to A4 and US Letter and
 * expects one page.
 */

const line = (n: number) =>
  `Specimen highlight ${n}: an achievement-first line at full length, written to fill the column the way a real highlight will.`;

const fixture: ResumeContent = {
  profile: {
    name: "Specimen Name",
    role: "Specimen Role, Longest Expected",
    positioning: "A specimen positioning line that runs to the twelve-word limit.",
    location: "Specimen City, Country",
    email: "specimen@example.com",
    socials: [
      { label: "Specimen profile", href: "https://example.com/specimen-profile" },
      { label: "Specimen code", href: "https://example.com/specimen-code" },
    ],
  },
  experience: [1, 2, 3, 4, 5].map((n) => ({
    company: `Specimen Company ${n}`,
    title: `Specimen Title ${n}`,
    start: `${2024 - n * 2}-0${n}`,
    end: n === 1 ? "present" : `${2026 - n * 2}-0${n}`,
    location: "Specimen City",
    highlights: [line(1), line(2), line(3)],
    stack: ["Specimen", "Stack", "Six", "Items", "Long", "Names"],
  })),
  projects: [1, 2, 3, 4, 5].map((n) => ({
    slug: `specimen-${n}`,
    partNumber: `P/N 0${n}`,
    title: `Specimen Project ${n}`,
    year: 2020 + n,
    role: "Specimen role",
    duration: "Specimen",
    summary:
      "A specimen summary of two sentences, at the length the schema allows. It says what was built and why.",
    layers: [],
    stack: [],
    outcomes: [1, 2, 3, 4].map((k) => ({ value: `${k}0×`, label: "specimen outcome" })),
    cover: { src: "", alt: "Specimen", width: 0, height: 0, kind: "image" as const },
    gallery: [],
    links: [],
    featured: true,
    order: n,
  })),
  skills: (["interface", "api", "services", "data", "infrastructure"] as Layer[]).flatMap((layer) =>
    [1, 2, 3, 4].map((k) => ({ name: `Specimen ${layer} ${k}`, layer, projects: [] })),
  ),
  awards: [1, 2, 3, 4, 5].map((n) => ({
    title: `Specimen Award ${n}, full title`,
    issuer: "Specimen Issuer",
    year: 2025 - n,
    category: "competition" as const,
    placement: "1st of 240 specimens",
    why: "Specimen reason.",
    featured: n === 1,
  })),
  writing: [1, 2, 3].map((n) => ({
    title: `Specimen article ${n}, a long title`,
    venue: "Specimen Venue",
    date: `202${n}-01-01`,
    href: `https://example.com/specimen-writing-${n}`,
    kind: "article" as const,
  })),
};

export default function ResumeFitSpecimen() {
  return <ResumeSheet {...fixture} pdf={{ href: "/resume.pdf", published: false }} />;
}
