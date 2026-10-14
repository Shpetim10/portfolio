import type { CSSProperties } from "react";
import { awardAnchor } from "@/components/sections/awards/categories";
import { DimensionLine } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { PhotoGallery } from "@/components/ui/PhotoGallery";
import { Link } from "@/components/ui/Link";
import { SectionShell } from "@/components/ui/SectionShell";
import { Tag } from "@/components/ui/Tag";
import {
  getAwards,
  getEducation,
  getProject,
  parseMonth,
  type Award,
  type Education as Entry,
  type Grade,
} from "@/content";
import { publishedPhotos } from "@/content/files";
import { todo } from "@/content/todo";
import { Reveal } from "@/motion/signatures/reveal";
import { EducationStage } from "./EducationStage";

/*
 * T09b · Education, filed as a training record. Static, readable markup first
 * (server-rendered, every fact and final value in the HTML); EducationStage
 * calibrates the gauges in.
 *
 * Layout (src/styles/education.css)
 *   desktop  (≥ 64rem) one full-width row per entry, newest first, between 1px
 *            hairlines, on the 12-column grid: dates (1–2) · credential,
 *            institution and tags (3–8) · grade gauge (9–12). The featured row
 *            is taller, its grade in display-l, its related projects linked
 *            under the credential. An in-progress row shows a breathing LED
 *            and "In progress" where the gauge would be.
 *   tablet   dates (1–2) · the rest stacked in columns 3–8.
 *   mobile   everything stacked: dates, credential, institution, tags, gauge
 *            at full width; related projects become wrapping link tags.
 *
 * The gauge is a calibrated scale, not a progress bar: a hairline from the
 * scale's minimum to its maximum, ticked at whole steps; a 2px bone fill from
 * the minimum to the value ending in a signal dot; a dimension line over the
 * fill reading the value. It is decorative (aria-hidden): the row states the
 * grade in words ("GPA 4.00 out of 4.00").
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Dates the owner hasn't confirmed are marked in dev builds; production shows the value as supplied. */
const MARK_UNCONFIRMED = process.env.NODE_ENV !== "production";

type EducationProps = {
  education?: Entry[];
  /** The awards the entries' distinctions link to; their photos open from the entry. */
  awards?: Award[];
  id?: string;
  index?: number;
};

export function Education({
  education = getEducation(),
  awards = getAwards(),
  id = "education",
  index = 7,
}: EducationProps) {
  const titleId = `${id}-title`;

  return (
    <SectionShell id={id} index={index} title="Training record" labelledBy={titleId}>
      <EducationStage>
        <header className="education__head">
          <Reveal as="h2" id={titleId} className="education__title">
            Education
          </Reveal>
          {education.length > 0 && (
            <p className="education__total">
              {pad(education.length)} {education.length === 1 ? "entry" : "entries"}
            </p>
          )}
        </header>

        {education.length === 0 ? (
          <Content as="p" value={todo("Education, newest first, one of it featured")} />
        ) : (
          <ol className="education__list">
            {education.map((entry) => (
              <Row key={entry.id} entry={entry} awards={awards} />
            ))}
          </ol>
        )}
      </EducationStage>
    </SectionShell>
  );
}

function Row({ entry, awards }: { entry: Entry; awards: Award[] }) {
  // The photos behind the distinctions (medal, plaque…), for the files that exist.
  const photos = publishedPhotos(
    entry.distinctions.flatMap(
      (distinction) => awards.find((award) => award.id === distinction.awardId)?.gallery ?? [],
    ),
  );
  const inProgress = entry.status === "in-progress";
  const projects = (entry.relatedProjects ?? []).flatMap((slug) => getProject(slug) ?? []);

  return (
    <li
      className="schooling"
      data-edu="row"
      data-featured={entry.featured || undefined}
      data-status={entry.status}
    >
      <p className="schooling__dates" data-edu="cell">
        <Dates entry={entry} />
      </p>

      <div className="schooling__body">
        <div data-edu="cell">
          <h3 className="schooling__credential">
            <Content value={entry.credential} />
            {entry.field && <Content value={`, ${entry.field}`} />}
          </h3>
          <p className="schooling__institution">
            <Content value={entry.institution} />
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            <Content value={entry.location} className="schooling__location" />
          </p>
        </div>

        {entry.featured && projects.length > 0 && (
          <div className="schooling__projects" data-edu="cell">
            <p className="schooling__projects-label" id={`${entry.id}-projects`}>
              Thesis and course work behind these projects:
            </p>
            <ul className="schooling__project-list" aria-labelledby={`${entry.id}-projects`}>
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link href={`/work/${project.slug}/`} className="schooling__project">
                    <span className="schooling__part">{project.partNumber}</span> {project.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {entry.distinctions.length > 0 && (
          <ul className="schooling__tags" aria-label="Distinctions" data-edu="cell">
            {entry.distinctions.map((distinction) => (
              <Tag
                key={distinction.label}
                as="li"
                href={distinction.awardId && `#${awardAnchor(distinction.awardId)}`}
                linkSuffix="View award"
              >
                {distinction.label}
              </Tag>
            ))}
          </ul>
        )}

        {photos.length > 0 && (
          <div data-edu="cell">
            <PhotoGallery photos={photos} label={entry.institution} />
          </div>
        )}

        {entry.coursework && entry.coursework.length > 0 && (
          <ul className="schooling__tags" aria-label="Coursework" data-edu="cell">
            {entry.coursework.map((course) => (
              <Tag key={course} as="li">
                {course}
              </Tag>
            ))}
          </ul>
        )}
      </div>

      <div className="schooling__reading" data-edu="cell">
        {inProgress ? (
          <p className="schooling__status">
            <span className="schooling__led" aria-hidden="true" />
            In progress
          </p>
        ) : entry.grade ? (
          <Gauge grade={entry.grade} featured={entry.featured} />
        ) : null}
      </div>
    </li>
  );
}

/* Dates ------------------------------------------------------------------ */

/** "2023.09 — 2026.06" / "2026.09 — PRESENT". */
function Dates({ entry }: { entry: Entry }) {
  return (
    <>
      <When value={entry.start} unconfirmed={entry.confirm?.includes("start")} />{" "}
      <span aria-hidden="true">—</span>
      <span className="sr-only">to</span>{" "}
      <When value={entry.end} unconfirmed={entry.confirm?.includes("end")} />
    </>
  );
}

function When({ value, unconfirmed }: { value: string; unconfirmed?: boolean }) {
  if (value === "present") return <span className="schooling__when schooling__when--present">Present</span>;
  const month = parseMonth(value);
  if (!month) return <Content value={value} className="schooling__when" />;
  return (
    <>
      <time className="schooling__when" dateTime={value}>
        {month.year}.{pad(month.month)}
      </time>
      {unconfirmed && MARK_UNCONFIRMED && (
        <Content value={todo("confirm date")} className="schooling__confirm" />
      )}
    </>
  );
}

/* Gauge ------------------------------------------------------------------ */

const DECIMALS = 2;

/** Whole steps across the scale, at most six labels: 0 1 2 3 4 · 0 2 4 6 8 10. */
function scaleTicks({ scaleMin, scaleMax }: Grade): number[] {
  const step = Math.max(1, Math.ceil((scaleMax - scaleMin) / 5));
  const ticks: number[] = [];
  for (let tick = Math.ceil(scaleMin); tick <= scaleMax; tick += step) ticks.push(tick);
  if (ticks.at(-1) !== scaleMax) ticks.push(scaleMax); // the scale always ends on a labelled tick
  return ticks;
}

/** A scale is quoted as it is printed: "4.00" for a GPA, "10" for a ten-point average. */
const formatScale = (n: number) => (Number.isInteger(n) && n >= 10 ? String(n) : n.toFixed(DECIMALS));

/** The calibrated scale. Decorative: the sentence after it states the grade. */
function Gauge({ grade, featured }: { grade: Grade; featured: boolean }) {
  const span = grade.scaleMax - grade.scaleMin;
  const at = (n: number) => (n - grade.scaleMin) / span;
  const value = grade.value.toFixed(DECIMALS);
  const max = formatScale(grade.scaleMax);
  const count = { "data-edu": "count", "data-value": grade.value, "data-from": grade.scaleMin } as const;

  return (
    <>
      <div className="gauge" aria-hidden="true" style={{ "--gauge-value": at(grade.value) } as CSSProperties}>
        {featured && (
          <p className="gauge__figure">
            <span className="gauge__value" {...count}>
              {value}
            </span>
          </p>
        )}
        <div className="gauge__reading">
          <DimensionLine
            value={
              <>
                <span className="gauge__count" {...count}>
                  {value}
                </span>{" "}
                / {max} {grade.label}
              </>
            }
          />
        </div>
        <div className="gauge__scale" data-edu="scale">
          <span className="gauge__track" />
          <span className="gauge__fill" data-edu="fill" />
          <span className="gauge__dot" data-edu="dot" />
          {scaleTicks(grade).map((tick) => (
            <span
              key={tick}
              className="gauge__tick"
              data-end={tick === grade.scaleMin ? "min" : tick === grade.scaleMax ? "max" : undefined}
              style={{ "--tick-at": at(tick) } as CSSProperties}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">
        {grade.label} {value} out of {max}
      </p>
    </>
  );
}
