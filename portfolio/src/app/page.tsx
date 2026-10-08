import Link from "next/link";
import { Hero } from "@/components/sections/hero/Hero";
import { Manifesto } from "@/components/sections/manifesto/Manifesto";
import { Metrics } from "@/components/sections/metrics/Metrics";
import { Content } from "@/components/ui/Content";
import { getFeaturedProjects } from "@/content";

// Homepage sections land in /src/components/sections; below the hero is still the skeleton.
export default function HomePage() {
  const projects = getFeaturedProjects();

  return (
    <>
      <Hero />
      <Manifesto />
      <Metrics />
      <div className="layout-grid gap-y-16 section-pad">
        <section aria-labelledby="work-heading" className="col-span-full">
          <h2 id="work-heading" className="font-mono text-label text-dust uppercase">
            [04] Work
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
    </>
  );
}
