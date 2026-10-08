import { Content } from "@/components/ui/Content";
import { SectionShell } from "@/components/ui/SectionShell";
import { checkAwards, getAwards, isTodo, type Award } from "@/content";
import { todo } from "@/content/todo";
import { Invert } from "@/motion/signatures/invert";
import { Reveal } from "@/motion/signatures/reveal";
import { AwardRecord } from "./AwardRecord";
import { AwardsStage } from "./AwardsStage";
import { CATEGORIES, fileAwards, pad, type Entry } from "./categories";
import { Proof, Stamp, Year } from "./marks";

/*
 * T10 · Awards & Achievements, filed as a qualification record. Static,
 * readable markup first (server-rendered, every fact in the HTML);
 * AwardsStage and the INVERT wrapper bring it in.
 *
 * The section is the site's one paper surface on the homepage: it INVERTs in
 * from carbon as it arrives and back to carbon as it leaves (Invert exit), so
 * the next section begins on carbon. Inside, the surface tokens are remapped
 * (src/styles/motion.css): bone and dust read as ink, so text is ink on paper
 * throughout (~16:1). Signal appears once, as the seal's centre — never as text.
 *
 * Layout (src/styles/awards.css)
 *   featured  one certificate, full width at every breakpoint: entry stamp,
 *             title (display-l), the title-block fields (issuer · year ·
 *             placement), the why line, VERIFY →, and the seal. Phones put the
 *             seal beside the stamp; from 64rem it stands in its own column.
 *   record    every other award, grouped by category, behind mono filter tabs
 *             (buttons with aria-pressed). Phones scroll the tabs sideways; the
 *             cards stack in one column, two from 48rem, three from 64rem.
 */

type AwardsProps = {
  awards?: Award[];
  id?: string;
  index?: number;
};

export function Awards({ awards = getAwards(), id = "awards", index = 7 }: AwardsProps) {
  // The homepage list is validated at build (src/content); a list passed in here gets the same rules.
  checkAwards(awards);
  const { featured, groups, total } = fileAwards(awards);

  return (
    <Invert exit>
      <SectionShell id={id} index={index} title="Awards & Achievements">
        <AwardsStage>
          <h2 className="awards__label">
            Qualification record
            {total > 0 && (
              <span className="awards__total">
                {" "}
                · {pad(total)} {total === 1 ? "entry" : "entries"}
              </span>
            )}
          </h2>

          {featured ? (
            <Certificate award={featured} id={id} />
          ) : (
            <Content as="p" value={todo("Awards, one of them featured")} className="awards__todo" />
          )}

          {groups.length > 0 ? (
            <AwardRecord groups={groups} id={id} />
          ) : (
            featured && <Content as="p" value={todo("Other awards, by category")} className="awards__todo" />
          )}
        </AwardsStage>
      </SectionShell>
    </Invert>
  );
}

/** The featured award as a certificate: entry 01 of the record. */
function Certificate({ award, id }: { award: Entry; id: string }) {
  const titleId = `${id}-featured`;
  const { label } = CATEGORIES[award.category];

  return (
    <article className="certificate" aria-labelledby={titleId} data-awards="certificate">
      <p className="certificate__head">
        <Stamp category={award.category} entry={award.entry} />
        <span className="certificate__kind">Featured</span>
      </p>

      <Seal award={award} id={id} />

      {isTodo(award.title) ? (
        <h3 id={titleId} className="certificate__title">
          <Content value={award.title} />
        </h3>
      ) : (
        <Reveal as="h3" id={titleId} className="certificate__title">
          {award.title}
        </Reveal>
      )}

      <dl className="certificate__fields">
        <div className="certificate__field">
          <dt>Issuer</dt>
          <Content as="dd" value={award.issuer} />
        </div>
        <div className="certificate__field">
          <dt>Year</dt>
          <dd>
            <Year year={award.year} />
          </dd>
        </div>
        {award.placement && (
          <div className="certificate__field">
            <dt>Placement</dt>
            <Content as="dd" value={award.placement} />
          </div>
        )}
        <div className="certificate__field">
          <dt>Category</dt>
          <dd>{label}</dd>
        </div>
      </dl>

      <Content as="p" value={award.why} className="certificate__why" />

      {award.proof ? (
        <Proof proof={award.proof} title={award.title} className="certificate__proof" />
      ) : (
        <Content as="p" value={todo("Proof link: credential, article or certificate")} />
      )}
    </article>
  );
}

/* Seal ------------------------------------------------------------------ */

// The seal is drawn on a 200-unit square, centred on (C, C).
const C = 100;
const TEXT_R = 72;
const TEXT_LENGTH = 2 * Math.PI * TEXT_R;

const polar = (r: number, degrees: number) => {
  const a = ((degrees - 90) * Math.PI) / 180;
  return `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`;
};

/** Spokes from r1 to r2, `count` of them evenly round the circle. */
const spokes = (count: number, r1: number, r2: number, every = 1, r1Long = r1) =>
  Array.from(
    { length: count },
    (_, i) => `M${polar(i % every === 0 ? r1Long : r1, (360 / count) * i)}L${polar(r2, (360 / count) * i)}`,
  ).join("");

// Graduated dial (a tick every 5°, long every 30°) and the rosette inside the text ring.
const DIAL = spokes(72, 86, 91, 6, 82);
const ROSETTE = spokes(24, 30, 56);
const RINGS = [96, 64, 60, 30, 16];

/**
 * The embossed seal: hairline rings, a graduated dial and a rosette, each
 * drawn twice — a faint relief offset down-right under the line — round a
 * signal centre. The text ring repeats the entry's category and year. It is a
 * picture of facts already in the certificate, so it is hidden from assistive tech.
 */
function Seal({ award, id }: { award: Entry; id: string }) {
  const pathId = `${id}-seal-ring`;
  const category = CATEGORIES[award.category].label;
  const ring = ["Qualified", category, award.year === 0 ? undefined : String(award.year)]
    .filter(Boolean)
    .join(" · ");

  const face = (
    <>
      {RINGS.map((r) => (
        <circle key={r} cx={C} cy={C} r={r} />
      ))}
      <path d={ROSETTE} />
    </>
  );

  return (
    <svg className="seal" viewBox="0 0 200 200" aria-hidden="true" focusable="false" data-awards="seal">
      <defs>
        <path
          id={pathId}
          d={`M${C} ${C - TEXT_R}a${TEXT_R} ${TEXT_R} 0 1 1 0 ${TEXT_R * 2}a${TEXT_R} ${TEXT_R} 0 1 1 0 ${-TEXT_R * 2}`}
        />
      </defs>
      <g className="seal__relief">{face}</g>
      <g className="seal__face">{face}</g>
      <g className="seal__dial" data-awards="seal-dial">
        <path className="seal__relief" d={DIAL} />
        <path className="seal__face" d={DIAL} />
        <text className="seal__text">
          <textPath href={`#${pathId}`} textLength={TEXT_LENGTH.toFixed(1)} lengthAdjust="spacing">
            {`${ring} · ${ring} · `}
          </textPath>
        </text>
      </g>
      <circle className="seal__core" cx={C} cy={C} r="10" data-awards="seal-core" />
    </svg>
  );
}
