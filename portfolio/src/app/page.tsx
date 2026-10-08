import Link from "next/link";
import { Awards } from "@/components/sections/awards/Awards";
import { Experience } from "@/components/sections/experience/Experience";
import { FieldLog } from "@/components/sections/fieldlog/FieldLog";
import { Hero } from "@/components/sections/hero/Hero";
import { Manifesto } from "@/components/sections/manifesto/Manifesto";
import { Metrics } from "@/components/sections/metrics/Metrics";
import { Stack } from "@/components/sections/stack/Stack";
import { Work } from "@/components/sections/work/Work";

// Homepage sections land in /src/components/sections; below the field log is still the skeleton.
export default function HomePage() {
  return (
    <>
      <Hero />
      <Manifesto />
      <Metrics />
      <Work />
      <Stack />
      <Experience />
      <Awards />
      <FieldLog />
      <div className="layout-grid gap-y-16 section-pad">
        <nav aria-label="Secondary" className="col-span-full">
          <Link href="/resume/" className="font-mono text-label uppercase underline underline-offset-4">
            Resume
          </Link>
        </nav>
      </div>
    </>
  );
}
