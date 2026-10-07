import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Content } from "@/components/ui/Content";
import { getProject, getProjectSlugs, isTodo } from "@/content";

// Only slugs from /src/content are exported; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const project = getProject((await params).slug);
  if (!project) return {};
  return {
    title: isTodo(project.title) ? project.partNumber : project.title,
    description: isTodo(project.summary) ? undefined : project.summary,
  };
}

// Skeleton only: the case-study layout and MDX story land in a later task.
export default async function WorkPage({ params }: PageProps<"/work/[slug]">) {
  const project = getProject((await params).slug);
  if (!project) notFound();

  return (
    <article className="layout-grid gap-y-12 section-pad">
      <header className="col-span-full">
        <p className="font-mono text-label text-dust uppercase">{project.partNumber}</p>
        <h1 className="font-display text-display-l font-black uppercase">
          <Content value={project.title} />
        </h1>
      </header>
      <Content as="p" value={project.summary} className="col-span-full max-w-measure text-body-l" />
      <dl className="col-span-full grid grid-cols-2 gap-6 md:grid-cols-4">
        <div>
          <dt className="font-mono text-micro text-dust uppercase">Role</dt>
          <Content as="dd" value={project.role} />
        </div>
        <div>
          <dt className="font-mono text-micro text-dust uppercase">Duration</dt>
          <Content as="dd" value={project.duration} />
        </div>
      </dl>
      <Link href="/" className="col-span-full font-mono text-label uppercase underline underline-offset-4">
        ← Index
      </Link>
    </article>
  );
}
