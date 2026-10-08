/**
 * Typed content loaders — the only way components read facts about the owner.
 * Loaders run at build time (static export) and validate the data, so a
 * broken content edit fails `next build` instead of shipping.
 */
import { awards } from "./awards";
import { experience } from "./experience";
import { metrics, profile } from "./profile";
import { projects } from "./projects";
import { skills } from "./skills";
import { testimonials } from "./testimonials";
import type { Award, Experience, Metric, Profile, Project, Skill, Testimonial, Writing } from "./types";
import { writing } from "./writing";

export type * from "./types";
import { isTodo } from "./todo";
export { isTodo } from "./todo";

export class ContentError extends Error {
  constructor(message: string) {
    super(`[content] ${message}`);
  }
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** "2023-04" → { year: 2023, month: 4 }. Undefined for anything else ("present", TODO, typos). */
export function parseMonth(value: string): { year: number; month: number } | undefined {
  const match = MONTH.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) } : undefined;
}

function toMonths(value: string) {
  const month = parseMonth(value);
  return month ? month.year * 12 + month.month - 1 : NaN;
}

function validate(): void {
  const slugs = new Set<string>();
  for (const project of projects) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      throw new ContentError(`Project slug "${project.slug}" must be kebab-case.`);
    }
    if (slugs.has(project.slug)) throw new ContentError(`Duplicate project slug "${project.slug}".`);
    slugs.add(project.slug);
    // T07 calibrates them as one strip in the case-study header. Empty = still TODO.
    if (project.outcomes.length > 0 && (project.outcomes.length < 2 || project.outcomes.length > 4)) {
      throw new ContentError(
        `Project "${project.slug}" needs 2–4 outcomes (found ${project.outcomes.length}).`,
      );
    }
    for (const media of [project.cover, ...project.gallery]) {
      if (!media.alt.trim())
        throw new ContentError(`Media "${media.src}" in "${project.slug}" is missing alt text.`);
    }
  }

  // T06 lays the featured projects out as one track of 3–5 panels.
  const featured = projects.filter((project) => project.featured).length;
  if (featured < 3 || featured > 5) {
    throw new ContentError(`Feature 3–5 projects (found ${featured}).`);
  }

  // T08 files each skill as one part in its layer's group of the bill of materials.
  const parts = new Set<string>();
  for (const skill of skills) {
    if (!skill.name.trim()) throw new ContentError(`A "${skill.layer}" skill has no name.`);
    const part = `${skill.layer}/${skill.name.toLowerCase()}`;
    if (parts.has(part)) throw new ContentError(`Skill "${skill.name}" is listed twice in "${skill.layer}".`);
    parts.add(part);
    if (new Set(skill.projects).size !== skill.projects.length) {
      throw new ContentError(`Skill "${skill.name}" lists a project twice.`);
    }
    for (const slug of skill.projects) {
      if (!slugs.has(slug))
        throw new ContentError(`Skill "${skill.name}" references unknown project "${slug}".`);
    }
  }

  // T09 renders each role's dates as a revision's date range.
  for (const role of experience) {
    const name = isTodo(role.company) ? "A role" : `Role "${role.company}"`;
    if (!role.company.trim() || !role.title.trim())
      throw new ContentError(`${name} needs a company and a title.`);
    if (!isTodo(role.start) && !parseMonth(role.start)) {
      throw new ContentError(`${name} starts "${role.start}": write it as YYYY-MM.`);
    }
    if (!isTodo(role.end) && role.end !== "present" && !parseMonth(role.end)) {
      throw new ContentError(`${name} ends "${role.end}": write it as YYYY-MM or "present".`);
    }
    if (role.end !== "present" && toMonths(role.end) < toMonths(role.start)) {
      throw new ContentError(`${name} ends before it starts.`);
    }
    if (!role.highlights.some(isTodo) && (role.highlights.length < 2 || role.highlights.length > 3)) {
      throw new ContentError(`${name} needs 2–3 highlights (found ${role.highlights.length}).`);
    }
  }

  // T05 lays metrics out as one row of 4–5; the first is the lead (it carries the signal dot).
  if (metrics.length > 0 && (metrics.length < 4 || metrics.length > 5)) {
    throw new ContentError(`Supply 4–5 metrics (found ${metrics.length}).`);
  }
  for (const metric of metrics) {
    if (!Number.isFinite(metric.value))
      throw new ContentError(`Metric "${metric.label}" has no numeric value.`);
    if (!metric.label.trim()) throw new ContentError(`Metric ${metric.value} is missing its label.`);
  }

  // T10 files the awards as one featured certificate and a record grouped by category.
  checkAwards(awards);

  // T12 shows testimonials one at a time; an empty list hides the section.
  checkTestimonials(testimonials);
}

/**
 * Only real testimonials: every field written out (a TODO placeholder is not a
 * quote anyone gave), and a source link, if any, is absolute.
 */
export function checkTestimonials(list: Testimonial[]): void {
  for (const item of list) {
    const name = item.name.trim() && !isTodo(item.name) ? `Testimonial from "${item.name}"` : "A testimonial";
    for (const field of ["quote", "name", "title", "company", "relation"] as const) {
      if (!item[field].trim() || isTodo(item[field])) {
        throw new ContentError(
          `${name} needs its ${field}: testimonials must be real, so leave the list empty instead of using a placeholder.`,
        );
      }
    }
    if (item.href !== undefined && !/^https?:\/\//.test(item.href)) {
      throw new ContentError(`${name} needs an absolute http(s) link.`);
    }
  }
}

/** Exactly one featured award; every award titled, issued, dated and justified; proofs are absolute links. */
export function checkAwards(list: Award[]): void {
  const featuredAwards = list.filter((award) => award.featured).length;
  if (list.length > 0 && featuredAwards !== 1) {
    throw new ContentError(`Exactly one award must be featured (found ${featuredAwards}).`);
  }
  const latest = new Date().getFullYear() + 1;
  for (const award of list) {
    const name = isTodo(award.title) ? "An award" : `Award "${award.title}"`;
    if (!award.title.trim() || !award.issuer.trim() || !award.why.trim()) {
      throw new ContentError(`${name} needs a title, an issuer and a why line.`);
    }
    // 0 is the numeric TODO placeholder (see ./todo.ts).
    if (award.year !== 0 && (!Number.isInteger(award.year) || award.year < 1950 || award.year > latest)) {
      throw new ContentError(`${name} has year ${award.year}: write it as YYYY.`);
    }
    if (award.proof && (!award.proof.label.trim() || !/^https?:\/\//.test(award.proof.href))) {
      throw new ContentError(`${name} needs a proof label and an absolute http(s) link.`);
    }
    if (award.media && !award.media.alt.trim()) {
      throw new ContentError(`Media "${award.media.src}" of ${name.toLowerCase()} is missing alt text.`);
    }
  }
}

validate();

const byOrder = (a: Project, b: Project) => a.order - b.order;

export const getProfile = (): Profile => profile;
export const getMetrics = (): Metric[] => metrics;

export const getProjects = (): Project[] => [...projects].sort(byOrder);
export const getFeaturedProjects = (): Project[] => getProjects().filter((project) => project.featured);
export const getProject = (slug: string): Project | undefined =>
  projects.find((project) => project.slug === slug);
export const getProjectSlugs = (): string[] => getProjects().map((project) => project.slug);
/** The project after `slug` in reading order, wrapping to the first: a case study's way forward. */
export const getNextProject = (slug: string): Project | undefined => {
  const ordered = getProjects();
  const at = ordered.findIndex((project) => project.slug === slug);
  return at < 0 || ordered.length < 2 ? undefined : ordered[(at + 1) % ordered.length];
};

export const getSkills = (): Skill[] => skills;
export const getExperience = (): Experience[] => newestFirst(experience);

// Unknown (TODO) dates sort as newest: a placeholder role is the one still being written.
const recency = (value: string) =>
  value === "present" || Number.isNaN(toMonths(value)) ? Infinity : toMonths(value);
const descending = (a: number, b: number) => (a === b ? 0 : a > b ? -1 : 1);

/** Roles newest first: by end ("present" first), then by start; ties keep the content's (newest-first) order. */
export const newestFirst = (roles: Experience[]): Experience[] =>
  [...roles].sort(
    (a, b) => descending(recency(a.end), recency(b.end)) || descending(recency(a.start), recency(b.start)),
  );

/**
 * Years spent in the roles listed in experience, one decimal, rounded down.
 * Overlapping roles count once and gaps between roles don't count; "present"
 * means the build date. Undefined while any date is missing or malformed, so
 * the figure is derived from the owner's data, never guessed.
 */
export const getYearsOfExperience = (now = new Date()): number | undefined => {
  if (experience.length === 0) return undefined;
  const current = now.getFullYear() * 12 + now.getMonth();
  const spans = experience
    .map((role) => [toMonths(role.start), role.end === "present" ? current : toMonths(role.end)] as const)
    .sort((a, b) => a[0] - b[0]);
  if (spans.some(([start, end]) => Number.isNaN(start) || Number.isNaN(end) || end < start)) return undefined;

  let months = 0;
  let reach = -Infinity;
  for (const [start, end] of spans) {
    const from = Math.max(start, reach);
    if (end > from) months += end - from;
    reach = Math.max(reach, end);
  }
  return Math.floor((months / 12) * 10) / 10;
};

export const getAwards = (): Award[] => [...awards].sort((a, b) => b.year - a.year);
export const getFeaturedAward = (): Award | undefined => awards.find((award) => award.featured);

export const getWriting = (): Writing[] => [...writing].sort((a, b) => b.date.localeCompare(a.date));
export const getTestimonials = (): Testimonial[] => testimonials;
