import { Content } from "@/components/ui/Content";
import { SectionShell } from "@/components/ui/SectionShell";
import { getExperience, newestFirst, parseMonth, type Experience as Role } from "@/content";
import { todo } from "@/content/todo";
import { ExperienceStage } from "./ExperienceStage";

/*
 * T09 · Experience as a drawing's revision history. Static, readable markup
 * first (server-rendered, every fact in the HTML); ExperienceStage draws it in.
 *
 * Layout (src/styles/experience.css)
 *   desktop  (≥ 64rem) a revision <table>, newest first: REV · DATE · COMPANY ·
 *            TITLE · CHANGES. A vertical hairline (the spine) runs down the REV
 *            column through a node at each revision; a tick leads from the node
 *            to the mono REV marker.
 *   mobile   (and tablet) one stacked card per revision, the same spine, nodes
 *            and REV markers running down their left edge.
 * Exactly one of table / cards is rendered per breakpoint (display: none on
 * the other), so assistive tech never meets the history twice.
 *
 * Revisions are lettered as drawings are, oldest first: the first role is
 * REV A, the newest the highest letter. The spine is drawn per row — from the
 * first node, through every row, ending on the last node — so it never runs
 * past either end. The node of a role that runs to "present" is signal orange.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 0 → "A", 25 → "Z", 26 → "AA": spreadsheet-style, should the history outgrow the alphabet. */
const letter = (n: number): string =>
  (n >= 26 ? letter(Math.floor(n / 26) - 1) : "") + String.fromCharCode(65 + (n % 26));

const pad = (n: number) => String(n).padStart(2, "0");

type Revision = Role & { rev: string; current: boolean };

const revise = (roles: Role[]): Revision[] =>
  newestFirst(roles).map((role, i, all) => ({
    ...role,
    rev: letter(all.length - 1 - i),
    current: role.end === "present",
  }));

type ExperienceProps = {
  experience?: Role[];
  id?: string;
  index?: number;
};

export function Experience({ experience = getExperience(), id = "experience", index = 6 }: ExperienceProps) {
  const revisions = revise(experience);
  const latest = revisions[0]?.rev;

  return (
    <SectionShell id={id} index={index} title="Experience" rev={latest && `REV.${latest}`}>
      <ExperienceStage>
        <h2 className="experience__label">
          Revision history
          {revisions.length > 0 && (
            <span className="experience__total">
              {" "}
              · {pad(revisions.length)} {revisions.length === 1 ? "revision" : "revisions"}
            </span>
          )}
        </h2>

        {revisions.length === 0 ? (
          <Content as="p" value={todo("Roles, most recent first")} className="experience__todo" />
        ) : (
          <>
            <table className="revs" data-rev="list">
              <caption className="sr-only">Roles, newest first, with their dates and highlights</caption>
              <colgroup>
                <col className="revs__col-rev" />
                <col className="revs__col-date" />
                <col className="revs__col-company" />
                <col className="revs__col-title" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Rev</th>
                  <th scope="col">Date</th>
                  <th scope="col">Company</th>
                  <th scope="col">Title</th>
                  <th scope="col">Changes</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision) => (
                  <tr
                    key={revision.rev}
                    className="rev"
                    data-rev="row"
                    data-current={revision.current || undefined}
                  >
                    <td className="rev__mark">
                      <Rail />
                      <Marker rev={revision.rev} />
                    </td>
                    <td>
                      <div className="rev__cell" data-rev="cell">
                        <Dates start={revision.start} end={revision.end} />
                      </div>
                    </td>
                    <th scope="row" className="rev__company">
                      <div className="rev__cell" data-rev="cell">
                        <Content value={revision.company} />
                        {revision.location && (
                          <Content as="span" value={revision.location} className="rev__location" />
                        )}
                      </div>
                    </th>
                    <td className="rev__title">
                      <div className="rev__cell" data-rev="cell">
                        <Content value={revision.title} />
                      </div>
                    </td>
                    <td>
                      <div className="rev__cell" data-rev="cell">
                        <Changes highlights={revision.highlights} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ol className="rev-cards" data-rev="list">
              {revisions.map((revision) => (
                <li
                  key={revision.rev}
                  className="rev rev-card"
                  data-rev="row"
                  data-current={revision.current || undefined}
                >
                  <Rail />
                  <article className="rev-card__body">
                    <p className="rev-card__head">
                      <Marker rev={revision.rev} />
                      <span className="rev-card__dates" data-rev="cell">
                        <Dates start={revision.start} end={revision.end} />
                      </span>
                    </p>
                    <div data-rev="cell">
                      <Content as="h3" value={revision.company} className="rev-card__company" />
                      <Content as="p" value={revision.title} className="rev__title rev-card__title" />
                      {revision.location && (
                        <Content as="p" value={revision.location} className="rev__location" />
                      )}
                    </div>
                    <div data-rev="cell">
                      <Changes highlights={revision.highlights} />
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </>
        )}
      </ExperienceStage>
    </SectionShell>
  );
}

/** The drawn rail of one revision: its stretch of spine, its node, the tick out to the marker. */
function Rail() {
  return (
    <>
      <span className="rev__spine" data-rev="spine" aria-hidden="true" />
      <span className="rev__node" data-rev="node" aria-hidden="true" />
      <span className="rev__tick" data-rev="tick" aria-hidden="true" />
    </>
  );
}

/** "REV C" in label mono; read out as "Revision C". Only the visible marker decodes. */
function Marker({ rev }: { rev: string }) {
  return (
    <span className="rev__marker" data-rev="marker">
      <span aria-hidden="true" data-rev="decode">
        REV {rev}
      </span>
      <span className="sr-only">Revision {rev}</span>
    </span>
  );
}

/** "SEP 2023 — PRESENT", from the content's YYYY-MM strings. One month reads as one date. */
function Dates({ start, end }: { start: string; end: string }) {
  return (
    <span className="rev__dates">
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
  if (value === "present") return <span className="rev__when rev__when--present">Present</span>;
  const month = parseMonth(value);
  // Content validation lets nothing else through: an unparsed date is a TODO placeholder.
  if (!month) return <Content value={value} className="rev__when" />;
  return (
    <time className="rev__when" dateTime={value}>
      {MONTHS[month.month - 1]} {month.year}
    </time>
  );
}

function Changes({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) return <Content value={todo("Highlights")} />;
  return (
    <ul className="rev__changes">
      {highlights.map((highlight, i) => (
        <Content key={i} as="li" value={highlight} className="rev__change" />
      ))}
    </ul>
  );
}
