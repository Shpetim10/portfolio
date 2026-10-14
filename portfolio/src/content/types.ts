// Content schema — mirrors /docs/content-schema.md. Do not diverge without updating the doc.

export type Link = { label: string; href: string };
export type Media = {
  src: string; // /assets/... path from Section 12 naming
  alt: string; // required, written by the owner
  width: number;
  height: number;
  kind: "image" | "video";
  poster?: string; // for video
};

export type Profile = {
  name: string;
  role: string; // e.g. "Software Engineer"
  positioning: string; // one line, max 12 words
  manifesto: string; // 60–90 words, read on scroll
  location: string;
  timezone: string; // IANA, for the live clock
  availability: { open: boolean; note: string };
  email: string;
  socials: Link[];
  resumeUrl: string; // static PDF in /public
  portrait: Media;
};

export type Metric = {
  value: number;
  suffix?: string; // 4.2 + "YRS", 99.99 + "%"
  label: string; // "Years building production systems"
  source?: string; // where the number comes from (not shown)
};

export type Layer = "interface" | "api" | "services" | "data" | "infrastructure";

export type Project = {
  slug: string;
  partNumber: string; // "P/N 01"
  title: string;
  client?: string;
  year: number;
  role: string;
  team?: string;
  duration: string;
  summary: string; // 1–2 sentences
  layers: Layer[]; // which Instrument layers it touches
  stack: string[];
  outcomes: { value: string; label: string }[]; // 2–4 hard results
  cover: Media;
  gallery: Media[];
  links: Link[];
  featured: boolean;
  order: number;
  // long-form story lives in /src/content/work/<slug>.mdx:
  // Problem · Constraints · Architecture · Key decisions · Results · Reflection
};

export type Skill = { name: string; layer: Layer; projects: string[] /* slugs */ };

export type Experience = {
  company: string;
  title: string;
  start: string; // "2023-04"
  end: string | "present";
  location?: string;
  highlights: string[]; // 2–3, achievement-first
  stack?: string[];
};

export type AwardCategory =
  | "competition"
  | "hackathon"
  | "certification"
  | "workplace"
  | "publication"
  | "talk"
  | "open-source"
  | "ranking"
  | "scholarship";

export type Grade = {
  value: number;
  scaleMin: number;
  scaleMax: number;
  label: string; // "GPA", "Average"
};

export type Education = {
  id: string; // kebab-case
  institution: string;
  location: string; // "City, Country"
  credential: string; // degree or program name
  field?: string;
  start: string; // "YYYY-MM"
  end: string | "present";
  status: "completed" | "in-progress";
  grade?: Grade;
  distinctions: { label: string; awardId?: string }[]; // awardId links to an award card
  coursework?: string[]; // owner fills; rendered only if present
  relatedProjects?: string[]; // project slugs
  featured: boolean; // exactly ONE featured entry
  confirm?: ("start" | "end")[]; // dates the owner still has to confirm; dev builds mark them TODO
};

export type Award = {
  id: string; // kebab-case; the card's anchor is #award-<id>
  title: string;
  issuer: string;
  year: number;
  category: AwardCategory;
  placement?: string; // "1st of 240 teams"
  why: string; // one line: what you did to earn it
  proof?: Link; // credential / article / certificate
  featured: boolean; // exactly ONE featured award
  media?: Media;
};

export type Writing = {
  title: string;
  venue: string;
  date: string;
  href: string;
  kind: "article" | "talk" | "paper";
};

export type Testimonial = {
  quote: string;
  name: string;
  title: string;
  company: string;
  relation: string;
  href?: string;
};
