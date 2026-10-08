import { Awards } from "@/components/sections/awards/Awards";
import { Contact } from "@/components/sections/contact/Contact";
import { Experience } from "@/components/sections/experience/Experience";
import { FieldLog } from "@/components/sections/fieldlog/FieldLog";
import { Hero } from "@/components/sections/hero/Hero";
import { Manifesto } from "@/components/sections/manifesto/Manifesto";
import { Metrics } from "@/components/sections/metrics/Metrics";
import { Stack } from "@/components/sections/stack/Stack";
import { Testimonials } from "@/components/sections/testimonials/Testimonials";
import { Work } from "@/components/sections/work/Work";

// Homepage sections, in reading order (/src/components/sections). The title block footer is in the layout.
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
      <Testimonials />
      <Contact />
    </>
  );
}
