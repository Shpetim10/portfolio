import { Awards } from "@/components/sections/awards/Awards";
import { Contact } from "@/components/sections/contact/Contact";
import { Education } from "@/components/sections/education/Education";
import { Experience } from "@/components/sections/experience/Experience";
import { FieldLog } from "@/components/sections/fieldlog/FieldLog";
import { Hero } from "@/components/sections/hero/Hero";
import { Manifesto } from "@/components/sections/manifesto/Manifesto";
import { Metrics } from "@/components/sections/metrics/Metrics";
import { Stack } from "@/components/sections/stack/Stack";
import { Testimonials } from "@/components/sections/testimonials/Testimonials";
import { Work } from "@/components/sections/work/Work";
import { getEducation, getProfile, isTodo } from "@/content";

/**
 * The owner as a schema.org Person. Facts come from /src/content only; a value
 * still TODO is left out. alumniOf lists completed schooling: a program still in
 * progress does not make anyone its alumnus. (T15 extends this record.)
 */
function personJsonLd() {
  const profile = getProfile();
  const known = (value: string) => (isTodo(value) ? undefined : value);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: known(profile.name),
    jobTitle: known(profile.role),
    sameAs: profile.socials.map((social) => social.href),
    alumniOf: getEducation()
      .filter((entry) => entry.status === "completed" && !isTodo(entry.institution))
      .map((entry) => {
        const [locality, country] = entry.location.split(",").map((part) => part.trim());
        return {
          "@type": "EducationalOrganization",
          name: entry.institution,
          address: { "@type": "PostalAddress", addressLocality: locality, addressCountry: country },
        };
      }),
  };
}

// Homepage sections, in reading order (/src/components/sections). The title block footer is in the layout.
export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Escaped so no content string can close the script element.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <Manifesto />
      <Metrics />
      <Work />
      <Stack />
      <Experience />
      <Education />
      <Awards />
      <FieldLog />
      <Testimonials />
      <Contact />
    </>
  );
}
