import Link from "next/link";
import { Hero } from "@/components/sections/hero/Hero";
import { Manifesto } from "@/components/sections/manifesto/Manifesto";
import { Metrics } from "@/components/sections/metrics/Metrics";
import { Work } from "@/components/sections/work/Work";

// Homepage sections land in /src/components/sections; below the work track is still the skeleton.
export default function HomePage() {
  return (
    <>
      <Hero />
      <Manifesto />
      <Metrics />
      <Work />
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
