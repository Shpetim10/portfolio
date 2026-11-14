import { SectionIndicator } from "@/components/chrome/SectionIndicator";
import { Awards } from "@/components/sections/awards/Awards";
import { Contact } from "@/components/sections/contact/Contact";
import { Education } from "@/components/sections/education/Education";
import { Experience } from "@/components/sections/experience/Experience";
import { FieldLog } from "@/components/sections/fieldlog/FieldLog";
import { Hero } from "@/components/sections/hero/Hero";
import { Manifesto } from "@/components/sections/manifesto/Manifesto";
import { Metrics } from "@/components/sections/metrics/Metrics";
import { ProportionBridge } from "@/components/sections/proportion/ProportionBridge";
import { Stack } from "@/components/sections/stack/Stack";
import { Testimonials } from "@/components/sections/testimonials/Testimonials";
import { Work } from "@/components/sections/work/Work";
import { getSeo } from "@/content";
import { homeGraph } from "@/seo/schema";
import { JsonLd } from "@/seo/JsonLd";
import { pageMetadata } from "@/seo/site";

const seo = getSeo();

// ISR: regenerate at most hourly so the field log's GitHub calendar stays fresh
// (src/content/github.ts caches its fetch for the same window).
export const revalidate = 3600;

export const metadata = pageMetadata({
  path: "/",
  title: seo.title,
  absoluteTitle: true,
  description: seo.description,
  type: "profile",
});

// Homepage sections, in reading order (/src/components/sections). The title block footer is in the layout.
// The page is the owner's ProfilePage (src/seo/schema.ts).
export default function HomePage() {
  return (
    <>
      <JsonLd data={homeGraph()} />
      <Hero />
      <Manifesto />
      <Metrics />
      <Work />
      <Stack />
      <Experience />
      <ProportionBridge />
      <Education />
      <Awards />
      <FieldLog />
      <Testimonials />
      <Contact />
      <SectionIndicator />
    </>
  );
}
