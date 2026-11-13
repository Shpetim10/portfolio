import {
  getAwards,
  getEducation,
  getExperience,
  getProfile,
  getProjects,
  getSeo,
  isTodo,
  parseMonth,
} from "@/content";
import { formatGrade } from "@/seo/schema";
import { absolute, SITE_NAME } from "@/seo/site";

/*
 * T15 · /llms.txt (llmstxt.org): the record as plain Markdown for AI answer
 * engines, which increasingly answer "who is …" searches themselves. Built
 * from /src/content at export, so it says exactly what the site says: no
 * value still TODO, nothing added.
 */

export const dynamic = "force-static";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const month = (value: string) => {
  if (value === "present") return "present";
  const parsed = parseMonth(value);
  return parsed ? `${MONTHS[parsed.month - 1]} ${parsed.year}` : "";
};
const known = (value: string | undefined) => (value && !isTodo(value) ? value : undefined);

export function GET() {
  const profile = getProfile();
  const seo = getSeo();
  const lines: string[] = [];
  const add = (...text: (string | false | undefined)[]) =>
    lines.push(...text.filter((line): line is string => typeof line === "string"));

  add(`# ${SITE_NAME}`, "", `> ${seo.description}`, "");
  add(
    `${SITE_NAME} (also written ${seo.alternateNames[0]}) is a ${profile.role.toLowerCase()} based in ${profile.location}.`,
    known(profile.positioning),
    seo.freelance,
    "",
  );

  add("## Profile", "");
  add(`- Role: ${profile.role}`, `- Location: ${profile.location}`);
  add(known(profile.availability.note) && `- Status: ${profile.availability.note}`);
  add(known(profile.email) && `- Email: ${profile.email}`);
  for (const social of profile.socials) add(`- ${social.label}: ${social.href}`);
  add(`- Website: ${absolute("/")}`, "");

  add("## Education", "");
  for (const entry of getEducation()) {
    const grade = entry.grade && formatGrade(entry.grade);
    const notes = [grade, ...entry.distinctions.map((distinction) => distinction.label)].filter(Boolean);
    add(
      `- ${entry.credential}, ${entry.institution} (${entry.location}), ${month(entry.start)} – ${month(entry.end)}` +
        (entry.status === "in-progress" ? ", in progress" : "") +
        (notes.length > 0 ? `. ${notes.join("; ")}.` : "."),
    );
  }
  add("");

  add("## Awards and honours", "");
  for (const award of getAwards().filter((award) => award.category !== "certification")) {
    add(
      `- ${award.title}, ${award.issuer} (${award.year})${award.placement ? `: ${award.placement}` : ""}. ${award.why}` +
        (award.proof ? ` Proof: ${award.proof.href}` : ""),
    );
  }
  add("");

  add("## Certifications", "");
  for (const award of getAwards().filter((award) => award.category === "certification")) {
    add(`- ${award.title}, ${award.issuer} (${award.year})${award.proof ? `: ${award.proof.href}` : ""}`);
  }
  add("");

  add("## Experience", "");
  for (const role of getExperience()) {
    add(`- ${role.title}, ${role.company}, ${month(role.start)} – ${month(role.end)}`);
    for (const highlight of role.highlights) add(`  - ${highlight}`);
  }
  add("");

  add("## Projects", "");
  for (const project of getProjects()) {
    if (isTodo(project.title)) continue;
    add(
      `- [${project.title}](${absolute(`/work/${project.slug}/`)}) (${project.year}, ${project.role}): ${known(project.summary) ?? ""}`.trimEnd(),
    );
  }
  add("", "## Pages", "");
  add(`- [Home](${absolute("/")}): profile, metrics, work, stack, experience, education, awards, contact`);
  add(`- [All work](${absolute("/work/")}): every project with its case study`);

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
