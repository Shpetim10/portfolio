import { LAYER_NAMES, LAYERS, partNumber } from "@/components/chrome/nav";
import { RegistrationMark } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { Link } from "@/components/ui/Link";
import {
  isTodo,
  parseMonth,
  type Award,
  type Experience,
  type Profile,
  type Project,
  type Skill,
  type Writing,
} from "@/content";
import { todo } from "@/content/todo";
import type { ReactNode } from "react";
import { PrintButton } from "./PrintButton";

/*
 * T14 · The resume as one clean sheet: ink on paper, on screen and in print.
 * Every fact comes from /src/content; anything the owner hasn't supplied shows
 * as a marked TODO (never invented). Static markup, no motion.
 *
 * Layout (src/styles/resume.css)
 *   screen   a bar (label, PDF download, print) over a paper sheet on carbon.
 *            ≥ 64rem: header across, then experience + selected work in a wide
 *            column and skills / recognition / writing in a narrow one.
 *            < 64rem: one column, sections in reading order.
 *   print    the sheet only — no header, footer, bar or cursor — on one page of
 *            A4 or US Letter: the shared 186 × 255mm box inside 12mm margins,
 *            print type sizes from the tokens, the same two columns.
 *            A one-page edit, as resumes are: roles older than the
 *            PRINT_DETAILED most recent print as title, company and dates
 *            (data-print="brief"); selected work prints its first
 *            PRINT_PROJECTS, two to a row (data-print="paired"), outcomes
 *            inline. The screen shows everything.
 */

export type ResumeContent = {
  profile: Pick<Profile, "name" | "role" | "positioning" | "location" | "email" | "socials">;
  experience: Experience[];
  projects: Project[];
  skills: Skill[];
  awards: Award[];
  writing: Writing[];
};

type ResumeSheetProps = ResumeContent & {
  /** The static PDF (profile.resumeUrl) and whether it's in /public yet; until then a TODO stands in. */
  pdf: { href: string; published: boolean };
};

/** Most recent roles that keep their highlights and stack on paper. */
const PRINT_DETAILED = 3;
/** Featured projects (in order) that make the printed page. */
const PRINT_PROJECTS = 3;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ResumeSheet({
  profile,
  experience,
  projects,
  skills,
  awards,
  writing,
  pdf,
}: ResumeSheetProps) {
  const email = isTodo(profile.email) ? null : profile.email;
  let section = 0;
  const number = () => String(++section).padStart(2, "0");

  return (
    <div className="resume layout-grid">
      <div className="resume__bar">
        <p className="resume__bar-label">
          Resume <span aria-hidden="true">·</span> Sheet 1 of 1
        </p>
        <div className="resume__bar-actions">
          {pdf.published ? (
            <Link href={pdf.href} download className="resume__download" data-resume="pdf">
              Download PDF
              <span aria-hidden="true"> ↓</span>
            </Link>
          ) : (
            <Content value={todo(`Resume PDF at public${pdf.href}`)} />
          )}
          <PrintButton />
        </div>
      </div>

      <article className="resume__sheet" data-surface="paper" aria-labelledby="resume-name">
        <RegistrationMark corner="top-left" />
        <RegistrationMark corner="top-right" />
        <RegistrationMark corner="bottom-left" />
        <RegistrationMark corner="bottom-right" />

        <header className="resume__head">
          <div className="resume__identity">
            <h1 id="resume-name" className="resume__name">
              <Content value={profile.name} />
            </h1>
            <Content as="p" value={profile.role} className="resume__role" />
            <Content as="p" value={profile.positioning} className="resume__positioning" />
          </div>
          <ul className="resume__contact">
            <li>
              {email ? (
                <a className="resume__link" href={`mailto:${email}`}>
                  {email}
                </a>
              ) : (
                <Content value={profile.email} />
              )}
            </li>
            <li>
              <Content value={profile.location} />
            </li>
            {profile.socials.map((social) => (
              <li key={social.href}>
                <a className="resume__link" href={social.href}>
                  {social.label}
                  <span className="resume__url"> {social.href.replace(/^https?:\/\/(www\.)?/, "")}</span>
                </a>
              </li>
            ))}
          </ul>
        </header>

        <div className="resume__columns">
          <div className="resume__main">
            <Section id="resume-experience" number={number()} title="Experience">
              <ol className="resume__entries">
                {experience.map((role, i) => (
                  <li
                    key={i}
                    className="resume__entry"
                    data-print={i >= PRINT_DETAILED ? "brief" : undefined}
                  >
                    <p className="resume__meta">
                      <Dates start={role.start} end={role.end} />
                      {role.location && (
                        <>
                          {" "}
                          <span aria-hidden="true">·</span> <Content value={role.location} />
                        </>
                      )}
                    </p>
                    <h3 className="resume__entry-title">
                      <Content value={role.title} />
                      <span className="resume__at">, </span>
                      <Content value={role.company} />
                    </h3>
                    {role.highlights.length > 0 ? (
                      <ul className="resume__points">
                        {role.highlights.map((highlight, j) => (
                          <Content key={j} as="li" value={highlight} />
                        ))}
                      </ul>
                    ) : (
                      <Content as="p" value={todo("Highlights")} />
                    )}
                    {role.stack && role.stack.length > 0 && (
                      <p className="resume__stack">{role.stack.join(" · ")}</p>
                    )}
                  </li>
                ))}
              </ol>
            </Section>

            <Section id="resume-work" number={number()} title="Selected work" paired>
              <ol className="resume__entries">
                {projects.map((project, i) => (
                  <li
                    key={project.slug}
                    className="resume__entry"
                    data-print={i >= PRINT_PROJECTS ? "omit" : undefined}
                  >
                    <p className="resume__meta">
                      <span>{project.partNumber}</span> <span aria-hidden="true">·</span>{" "}
                      {project.year > 0 ? project.year : <Content value={todo("Year")} />}{" "}
                      <span aria-hidden="true">·</span> <Content value={project.role} />
                    </p>
                    <h3 className="resume__entry-title">
                      <Content value={project.title} />
                    </h3>
                    <Content as="p" value={project.summary} className="resume__summary" />
                    {project.outcomes.length > 0 && (
                      <ul className="resume__outcomes">
                        {project.outcomes.map((outcome, j) => (
                          <li key={j}>
                            <strong>{outcome.value}</strong> {outcome.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          <div className="resume__side">
            <Section id="resume-skills" number={number()} title="Skills">
              {skills.length > 0 ? (
                <dl className="resume__skills">
                  {LAYERS.filter((layer) => skills.some((skill) => skill.layer === layer)).map((layer) => (
                    <div key={layer} className="resume__skill-group">
                      <dt>
                        {partNumber(layer)} — {LAYER_NAMES[layer]}
                      </dt>
                      <dd>
                        {skills
                          .filter((skill) => skill.layer === layer)
                          .map((skill) => skill.name)
                          .join(" · ")}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <Content as="p" value={todo("Skills, grouped by layer")} />
              )}
            </Section>

            <Section id="resume-recognition" number={number()} title="Recognition">
              <ol className="resume__list">
                {awards.map((award, i) => (
                  <li key={i}>
                    <p className="resume__meta">
                      {award.year > 0 ? award.year : <Content value={todo("Year")} />}
                      {award.placement && (
                        <>
                          {" "}
                          <span aria-hidden="true">·</span> <Content value={award.placement} />
                        </>
                      )}
                    </p>
                    <p className="resume__item">
                      <Content value={award.title} />
                      <span className="resume__at">, </span>
                      <Content value={award.issuer} />
                    </p>
                  </li>
                ))}
              </ol>
            </Section>

            {writing.length > 0 && (
              <Section id="resume-writing" number={number()} title="Writing & talks">
                <ol className="resume__list">
                  {writing.map((piece) => (
                    <li key={piece.href}>
                      <p className="resume__meta">
                        {piece.date.slice(0, 4)} <span aria-hidden="true">·</span> {piece.kind}
                      </p>
                      <p className="resume__item">
                        <a className="resume__link" href={piece.href}>
                          {piece.title}
                        </a>
                        <span className="resume__at">, </span>
                        {piece.venue}
                      </p>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function Section({
  id,
  number,
  title,
  paired,
  children,
}: {
  id: string;
  number: string;
  title: string;
  /** In print, entries sit two to a row (the one-page edit). */
  paired?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="resume__section" aria-labelledby={id} data-print={paired ? "paired" : undefined}>
      <h2 id={id} className="resume__section-title">
        <span className="resume__section-number">{number}</span> {title}
      </h2>
      {children}
    </section>
  );
}

/** "Sep 2023 — Present" from the content's YYYY-MM strings. */
function Dates({ start, end }: { start: string; end: string }) {
  return (
    <span>
      <When value={start} />
      {end !== start && (
        <>
          {" "}
          <span aria-hidden="true">—</span>
          <span className="sr-only">to</span> <When value={end} />
        </>
      )}
    </span>
  );
}

function When({ value }: { value: string }) {
  if (value === "present") return <span>Present</span>;
  const month = parseMonth(value);
  // Content validation lets nothing else through: an unparsed date is a TODO placeholder.
  if (!month) return <Content value={value} />;
  return (
    <time dateTime={value}>
      {MONTHS[month.month - 1]} {month.year}
    </time>
  );
}
