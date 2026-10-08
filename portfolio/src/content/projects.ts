import { todo } from "./todo";
import type { Media, Project } from "./types";

const placeholderMedia = (slug: string): Media => ({
  src: `/assets/work/${slug}/cover.jpg`, // TODO(content): asset not yet supplied
  alt: todo("Cover alt text"),
  width: 0, // TODO(content)
  height: 0, // TODO(content)
  kind: "image",
});

const placeholderProject = (n: number): Project => {
  const slug = `example-project-${String(n).padStart(2, "0")}`;
  return {
    slug,
    partNumber: `P/N ${String(n).padStart(2, "0")}`,
    title: todo(`Project ${n} title`),
    year: 0, // TODO(content)
    role: todo("Your role"),
    duration: todo("Duration"),
    summary: todo("1–2 sentence summary"),
    layers: [],
    stack: [],
    outcomes: [], // TODO(content): 2–4 hard, verifiable results
    cover: placeholderMedia(slug),
    gallery: [],
    links: [],
    featured: true,
    order: n,
  };
};

// TODO(content): replace the example entries with 3–5 real projects (slugs become URLs).
export const projects: Project[] = [placeholderProject(1), placeholderProject(2), placeholderProject(3)];
