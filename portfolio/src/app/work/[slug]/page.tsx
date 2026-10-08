import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseHeader } from "@/components/case-study/CaseHeader";
import { NextProject } from "@/components/case-study/NextProject";
import { Outcomes } from "@/components/case-study/Outcomes";
import { storyComponents } from "@/components/case-study/story";
import { getNextProject, getProject, getProjectSlugs, getProjects, isTodo } from "@/content";
import { loadStory } from "@/content/stories";
import { OG_ALT, OG_SIZE } from "./og.png/route";

/*
 * T07 · Case study, /work/<slug>/: one static page per project (Project + its MDX story).
 *   header (cover · title · title block) → outcomes (CALIBRATE)
 *   → story: Problem · Constraints · Architecture (system diagram) · Key decisions · Results · Reflection
 *   → next project.
 * Reading order is DOM order is visual order; one h1, an h2 per block. Its
 * Open Graph card is generated beside it (og.png/route.tsx).
 */

// Only slugs from /src/content are exported; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return {};
  const title = isTodo(project.title) ? project.partNumber : project.title;
  const description = isTodo(project.summary) ? undefined : project.summary;
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images: [{ url: `/work/${project.slug}/og.png`, alt: OG_ALT, type: "image/png", ...OG_SIZE }],
    },
  };
}

export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  const Story = await loadStory(slug);
  const next = getNextProject(slug);
  const projects = getProjects();

  return (
    <article className="case-study" aria-labelledby="case-title">
      <CaseHeader project={project} />
      <Outcomes outcomes={project.outcomes} />
      <div className="story">
        <Story components={storyComponents(project)} />
      </div>
      {next && <NextProject project={next} position={projects.indexOf(next) + 1} total={projects.length} />}
    </article>
  );
}
