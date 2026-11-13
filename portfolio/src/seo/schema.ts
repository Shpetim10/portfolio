import {
  getAwards,
  getEducation,
  getExperience,
  getProfile,
  getProjects,
  getSeo,
  getSkills,
  isTodo,
  type Grade,
  type Media,
  type Project,
} from "@/content";
import { isPublished } from "@/content/files";
import { absolute, SITE_NAME, SITE_URL } from "./site";

/*
 * T15 · schema.org records, built from /src/content only. A value still TODO
 * is left out; nothing is inferred. Nodes link by @id so search engines join
 * the homepage's ProfilePage, every case study and the owner into one entity:
 *   WebSite (#website) ── publisher ──▶ Person (#person) ◀── creator ── CreativeWork (/work/<slug>/#work)
 *   ProfilePage (/) ── mainEntity ──▶ Person
 * Validated against Google's ProfilePage and BreadcrumbList rich results.
 */

type Node = Record<string, unknown>;

export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const known = (value: string | undefined) => (value && !isTodo(value) ? value : undefined);

/** "GPA 4.0/4.0", "Average 9.94/10": a 4-point scale keeps one decimal, as written on the diploma. */
export const formatGrade = ({ label, value, scaleMax }: Grade): string => {
  const fmt = (n: number) => (scaleMax <= 4 ? n.toFixed(1) : String(n));
  return `${label} ${fmt(value)}/${fmt(scaleMax)}`;
};

/** "Tirana, Albania" → PostalAddress. */
const address = (location: string): Node => {
  const [locality, country] = location.split(",").map((part) => part.trim());
  return { "@type": "PostalAddress", addressLocality: locality, addressCountry: country };
};

/** A content image as an ImageObject, or undefined until its file is in /public. */
const imageObject = (media: Media): Node | undefined =>
  media.kind === "image" && isPublished(media.src)
    ? {
        "@type": "ImageObject",
        url: absolute(media.src),
        caption: media.alt,
        ...(media.width > 0 && { width: media.width, height: media.height }),
      }
    : undefined;

/** The owner, as complete as the content allows. */
export function person(): Node {
  const profile = getProfile();
  const seo = getSeo();
  const name = known(profile.name);
  const [givenName, ...family] = name?.split(" ") ?? [];
  const current = getExperience().find((role) => role.end === "present");
  const education = getEducation();
  const awards = getAwards();
  const skills = [...new Set(getSkills().map((skill) => skill.name))];

  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name,
    alternateName: seo.alternateNames,
    givenName,
    familyName: family.join(" ") || undefined,
    url: absolute("/"),
    image: imageObject(profile.portrait),
    description: [known(profile.positioning), seo.freelance].filter(Boolean).join(" ") || undefined,
    jobTitle: known(profile.role),
    worksFor: current && { "@type": "Organization", name: current.company },
    hasOccupation: known(profile.role) && {
      "@type": "Occupation",
      name: profile.role,
      occupationLocation: { "@type": "City", name: profile.location.split(",")[0].trim() },
      skills: skills.join(", "),
    },
    knowsAbout: skills,
    address: address(profile.location),
    email: known(profile.email) && `mailto:${profile.email}`,
    sameAs: profile.socials.map((social) => social.href),
    // Completed schooling only: a program still in progress does not make anyone its alumnus.
    alumniOf: education
      .filter((entry) => entry.status === "completed" && !isTodo(entry.institution))
      .map((entry) => ({
        "@type": "EducationalOrganization",
        name: entry.institution,
        address: address(entry.location),
      })),
    // Honours earned (rankings, scholarships, hackathon placings); certificates are credentials, below.
    award: awards
      .filter((award) => ["ranking", "scholarship", "hackathon"].includes(award.category))
      .map((award) => `${award.title}, ${award.issuer} (${award.year})`),
    hasCredential: [
      ...education
        .filter((entry) => entry.status === "completed")
        .map((entry) => ({
          "@type": "EducationalOccupationalCredential",
          name: `${entry.credential}, ${entry.institution}`,
          credentialCategory: entry.credential.startsWith("B.") ? "degree" : "diploma",
          recognizedBy: { "@type": "EducationalOrganization", name: entry.institution },
          description: [
            entry.grade && formatGrade(entry.grade),
            ...entry.distinctions.map((distinction) => distinction.label),
          ]
            .filter(Boolean)
            .join(" · "),
        })),
      ...awards
        .filter((award) => award.category === "certification")
        .map((award) => ({
          "@type": "EducationalOccupationalCredential",
          name: award.title,
          credentialCategory: "certificate",
          recognizedBy: { "@type": "Organization", name: award.issuer },
          url: award.proof?.href,
        })),
    ],
  };
}

/** A reference to the owner for pages that don't carry the full record. */
const personRef = (): Node => ({ "@type": "Person", "@id": PERSON_ID, name: SITE_NAME, url: absolute("/") });

function website(): Node {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absolute("/"),
    name: SITE_NAME,
    alternateName: getSeo().alternateNames,
    inLanguage: "en",
    publisher: { "@id": PERSON_ID },
  };
}

/** Homepage: the site, and the page as the owner's profile (Google's ProfilePage rich result). */
export function homeGraph(): Node {
  return {
    "@context": "https://schema.org",
    "@graph": [
      website(),
      {
        "@type": "ProfilePage",
        "@id": `${absolute("/")}#profile`,
        url: absolute("/"),
        name: getSeo().title,
        isPartOf: { "@id": WEBSITE_ID },
        inLanguage: "en",
        mainEntity: person(),
      },
    ],
  };
}

const breadcrumbs = (trail: [name: string, path: string][]): Node => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map(([name, path], i) => ({
    "@type": "ListItem",
    position: i + 1,
    name,
    item: absolute(path),
  })),
});

const projectName = (project: Project) => (isTodo(project.title) ? project.partNumber : project.title);

/** /work/: the register as a collection of case studies. */
export function workIndexGraph(): Node {
  const projects = getProjects();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${absolute("/work/")}#page`,
        url: absolute("/work/"),
        name: `All work · ${SITE_NAME}`,
        isPartOf: { "@id": WEBSITE_ID },
        author: personRef(),
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: projects.length,
          itemListElement: projects.map((project, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: absolute(`/work/${project.slug}/`),
            name: projectName(project),
          })),
        },
      },
      breadcrumbs([
        [SITE_NAME, "/"],
        ["Work", "/work/"],
      ]),
    ],
  };
}

/** /work/<slug>/: the project as a CreativeWork by the owner. */
export function caseStudyGraph(project: Project): Node {
  const url = absolute(`/work/${project.slug}/`);
  const images = [project.cover, ...project.gallery]
    .map(imageObject)
    .filter((image): image is Node => image !== undefined);
  const name = projectName(project);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${url}#work`,
        url,
        name,
        headline: name,
        description: known(project.summary),
        dateCreated: project.year > 0 ? String(project.year) : undefined,
        creator: personRef(),
        author: personRef(),
        keywords: project.stack.join(", "),
        image: images.length > 0 ? images : undefined,
        sameAs: [project.site?.href, ...project.links.map((link) => link.href)].filter(Boolean),
        isPartOf: { "@id": WEBSITE_ID },
        inLanguage: "en",
      },
      breadcrumbs([
        [SITE_NAME, "/"],
        ["Work", "/work/"],
        [name, `/work/${project.slug}/`],
      ]),
    ],
  };
}
