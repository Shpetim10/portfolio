import Link from "next/link";
import { Content } from "@/components/ui/Content";
import { getFeaturedProjects, getProfile } from "@/content";

// Skeleton only: homepage sections (hero, Instrument, work, …) land in /src/components/sections.
export default function HomePage() {
  const profile = getProfile();
  const projects = getFeaturedProjects();

  return (
    <div className="layout-grid gap-y-16 section-pad">
      <header className="col-span-full">
        <p className="font-mono text-label text-dust uppercase">[00] Index</p>
        <h1 className="font-display text-display-xl font-black uppercase">
          <Content value={profile.name} />
        </h1>
        <Content as="p" value={profile.role} className="font-text text-heading" />
      </header>

      <section aria-labelledby="work-heading" className="col-span-full">
        <h2 id="work-heading" className="font-mono text-label text-dust uppercase">
          [01] Work
        </h2>
        <ul className="mt-6 border-t border-hairline">
          {projects.map((project) => (
            <li key={project.slug} className="border-b border-hairline">
              <Link href={`/work/${project.slug}/`} className="flex items-baseline gap-6 py-6">
                <span className="font-mono text-micro text-dust uppercase">{project.partNumber}</span>
                <Content value={project.title} className="text-heading" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav aria-label="Secondary" className="col-span-full">
        <Link href="/resume/" className="font-mono text-label uppercase underline underline-offset-4">
          Resume
        </Link>
      </nav>
    </div>
  );
}
