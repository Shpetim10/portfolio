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
export { isTodo } from "./todo";

class ContentError extends Error {
  constructor(message: string) {
    super(`[content] ${message}`);
  }
}

function validate(): void {
  const slugs = new Set<string>();
  for (const project of projects) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) {
      throw new ContentError(`Project slug "${project.slug}" must be kebab-case.`);
    }
    if (slugs.has(project.slug)) throw new ContentError(`Duplicate project slug "${project.slug}".`);
    slugs.add(project.slug);
    for (const media of [project.cover, ...project.gallery]) {
      if (!media.alt.trim())
        throw new ContentError(`Media "${media.src}" in "${project.slug}" is missing alt text.`);
    }
  }

  for (const skill of skills) {
    for (const slug of skill.projects) {
      if (!slugs.has(slug))
        throw new ContentError(`Skill "${skill.name}" references unknown project "${slug}".`);
    }
  }

  const featuredAwards = awards.filter((award) => award.featured).length;
  if (awards.length > 0 && featuredAwards !== 1) {
    throw new ContentError(`Exactly one award must be featured (found ${featuredAwards}).`);
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

export const getSkills = (): Skill[] => skills;
export const getExperience = (): Experience[] => experience;

export const getAwards = (): Award[] => [...awards].sort((a, b) => b.year - a.year);
export const getFeaturedAward = (): Award | undefined => awards.find((award) => award.featured);

export const getWriting = (): Writing[] => [...writing].sort((a, b) => b.date.localeCompare(a.date));
export const getTestimonials = (): Testimonial[] => testimonials;
