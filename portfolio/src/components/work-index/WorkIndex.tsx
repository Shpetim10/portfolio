import { LAYER_NAMES, LAYERS } from "@/components/chrome/nav";
import { LayerStrip } from "@/components/sections/work/LayerStrip";
import { LeaderLine, RegistrationMark, type Corner } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { OpenProject } from "@/components/ui/OpenProject";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { StackLabel } from "@/components/ui/StackLabel";
import { Tag } from "@/components/ui/Tag";
import type { Project } from "@/content";
import { todo } from "@/content/todo";
import { IndexStage } from "./IndexStage";

/*
 * Work index, /work/: every project in the record, in reading order — the
 * homepage track shows the featured few, this sheet files them all.
 *
 * Layout (src/styles/work-index.css)
 *   header   drawing number row → title (display-xl) → intro → sheet totals.
 *            Static markup above the fold (LCP); only its exit is scrubbed.
 *   desktop  (≥ 64rem) a sticky register in columns 1–3 (every part, the one
 *            in view lit, a progress rule beside them); the entries fill 4–12,
 *            cover beside its meta.
 *   mobile   no register: entries stack full width, cover above meta, each
 *            carrying its own "03 / 07" count.
 * Entry: rule → head (P/N · count · client · year) → cover → title → summary
 *        → title block (role · team · duration · outcome) → layer tags + strip.
 *
 * One tab stop per entry (the title link); the cover repeats it for the
 * pointer only. The register is in-page navigation (fragment links).
 */

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const pad = (n: number) => String(n).padStart(2, "0");

type WorkIndexProps = { projects: Project[] };

export function WorkIndex({ projects }: WorkIndexProps) {
  const total = projects.length;
  const featured = projects.filter((project) => project.featured).length;
  const years = projects.map((project) => project.year).filter((year) => year > 0);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : todo("Years");
  const covered = LAYERS.filter((layer) => projects.some((project) => project.layers.includes(layer)));

  return (
    <IndexStage>
      <header className="work-index__header layout-grid">
        <p className="section-index work-index__number">
          <span className="section-index__number">[W]</span>
          <span className="section-index__title">Work index</span>
          <span className="section-index__rule" aria-hidden="true" data-index="index-rule" />
          <span className="section-index__rev">Sheet 1 of 1</span>
        </p>

        <div className="work-index__masthead" data-index="masthead">
          <h1 id="work-index-title" className="work-index__title">
            All work
          </h1>
        </div>

        <p className="work-index__intro">
          Every project in the record, in reading order.{" "}
          {featured > 0 && featured < total
            ? `${featured} are featured on the home page; all ${total} are filed here.`
            : `All ${total} are filed here.`}
        </p>

        <dl className="work-index__totals">
          <div className="work-index__total">
            <dt>Parts</dt>
            <dd>{pad(total)}</dd>
          </div>
          <div className="work-index__total">
            <dt>Featured</dt>
            <dd>{pad(featured)}</dd>
          </div>
          <div className="work-index__total">
            <dt>Years</dt>
            <Content as="dd" value={span} />
          </div>
          <div className="work-index__total">
            <dt>Layers</dt>
            <dd>
              {covered.length} / {LAYERS.length}
            </dd>
          </div>
        </dl>
      </header>

      <div className="work-index__body layout-grid">
        <nav className="work-index__register" aria-label="Project register" data-index="register">
          <p className="work-index__register-head" aria-hidden="true">
            <span>Register</span>
            <span>
              <span data-index="readout">01</span> / {pad(total)}
            </span>
          </p>
          <div className="work-index__register-track">
            <span className="work-index__progress" aria-hidden="true">
              <span className="work-index__progress-fill" data-index="progress" />
            </span>
            <ol className="work-index__register-list">
              {projects.map((project, i) => (
                <li key={project.slug}>
                  <a
                    href={`#${project.slug}`}
                    className="work-index__register-link"
                    data-index="register-link"
                    aria-current={i === 0 ? "location" : undefined}
                  >
                    <span className="work-index__register-part">{project.partNumber}</span>
                    <Content value={shortTitle(project.title)} className="work-index__register-title" />
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <ol className="work-index__list" aria-labelledby="work-index-title">
          {projects.map((project, i) => (
            <Entry key={project.slug} project={project} position={i + 1} total={total} />
          ))}
        </ol>
      </div>
    </IndexStage>
  );
}

/** "HERISAGA — History as Playable Stories" → "HERISAGA": the register names a part, the entry describes it. */
const shortTitle = (title: string) => title.split(" — ")[0];

function Entry({ project, position, total }: { project: Project; position: number; total: number }) {
  const href = `/work/${project.slug}/`;
  const titleId = `index-${project.slug}`;
  const [outcome] = project.outcomes;
  const cells: [term: string, value: string][] = [
    ["Role", project.role],
    ["Team", project.team ?? todo("Team")],
    ["Duration", project.duration],
  ];

  return (
    <li
      id={project.slug}
      className="index-entry"
      data-index="entry"
      data-layers={project.layers.join(" ")}
      data-featured={project.featured ? "" : undefined}
    >
      <article className="index-entry__body" aria-labelledby={titleId}>
        <span className="index-entry__rule" aria-hidden="true" data-index="rule" />

        <p className="index-entry__head">
          <span className="index-entry__part" data-index="part">
            {project.partNumber}
          </span>
          <span className="index-entry__count" aria-hidden="true">
            {pad(position)} / {pad(total)}
          </span>
          <Content value={project.client ?? todo("Client")} className="index-entry__client" />
          <Content
            value={project.year > 0 ? String(project.year) : todo("Year")}
            className="index-entry__year"
          />
        </p>

        <div className="index-entry__cover" data-cursor="view">
          {CORNERS.map((corner) => (
            <RegistrationMark key={corner} corner={corner} />
          ))}
          {/* Pointer shortcut to the same place as the title link: not a second tab stop. */}
          <OpenProject
            href={href}
            label={project.partNumber}
            tabIndex={-1}
            aria-hidden="true"
            className="index-entry__cover-link"
          >
            <ProjectCover project={project} />
          </OpenProject>
          {/* Lifts off the cover as the entry enters (full motion only). */}
          <span className="index-entry__shutter" aria-hidden="true" data-index="shutter" />
          {/* Raised on hover / focus (fine pointers); always shown on touch. */}
          <div className="index-entry__notes" aria-hidden="true">
            <LeaderLine direction="up-right" className="index-entry__stack">
              <StackLabel stack={project.stack} />
            </LeaderLine>
          </div>
        </div>

        <div className="index-entry__meta">
          <h2 id={titleId} className="index-entry__title">
            <OpenProject href={href} label={project.partNumber} className="index-entry__link">
              <span className="index-entry__title-text reveal" data-index="title">
                <Content value={project.title} />
              </span>{" "}
              <span className="index-entry__arrow" aria-hidden="true" data-index="arrow">
                →
              </span>
            </OpenProject>
          </h2>

          <Content as="p" value={project.summary} className="index-entry__summary" />

          <dl className="index-entry__block">
            {cells.map(([term, value]) => (
              <div key={term} className="index-entry__cell" data-index="cell">
                <dt>{term}</dt>
                <Content as="dd" value={value} />
              </div>
            ))}
            <div className="index-entry__cell index-entry__cell--outcome" data-index="cell">
              <dt>Outcome</dt>
              {outcome ? (
                <dd className="index-entry__outcome">
                  <span className="index-entry__outcome-value">{outcome.value}</span>{" "}
                  <span className="index-entry__outcome-label">{outcome.label}</span>
                </dd>
              ) : (
                <Content as="dd" value={todo("One hard, verifiable result")} />
              )}
            </div>
          </dl>

          <div className="index-entry__layers" data-index="layers">
            <ul className="index-entry__tags" aria-label="Layers">
              {project.layers.length > 0 ? (
                project.layers.map((layer) => (
                  <Tag key={layer} as="li">
                    {LAYER_NAMES[layer]}
                  </Tag>
                ))
              ) : (
                <li>
                  <Content value={todo("Layers it touches")} />
                </li>
              )}
            </ul>
            <LayerStrip lit={project.layers} variant="inline" className="index-entry__strip" />
          </div>
        </div>
      </article>
    </li>
  );
}
