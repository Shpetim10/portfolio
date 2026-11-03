import { LAYER_NAMES } from "@/components/chrome/nav";
import { DimensionLine, LeaderLine } from "@/components/ui/Annotation";
import { Button } from "@/components/ui/Button";
import { Content } from "@/components/ui/Content";
import { OpenProject } from "@/components/ui/OpenProject";
import { ProjectCover } from "@/components/ui/ProjectCover";
import { SectionShell } from "@/components/ui/SectionShell";
import { StackLabel } from "@/components/ui/StackLabel";
import { Tag } from "@/components/ui/Tag";
import { getFeaturedProjects, getProjects, type Project } from "@/content";
import { todo } from "@/content/todo";
import { LayerStrip } from "./LayerStrip";
import { WorkStage } from "./WorkStage";

/*
 * T06 · Selected work. Static, readable markup first (server-rendered, every
 * project a plain link in reading order); WorkStage adds the track.
 *
 * Layout (src/styles/work.css)
 *   desktop  (≥ 64rem, full motion) a pinned horizontal track: 3–5 large panels
 *            pass through the centre as the page scrolls; the assembly diagram
 *            under them lights the layers of the centred project.
 *   mobile   (and reduced motion / no JS at any width) a vertical stack of
 *            full-width cards, no pin, each with its layer strip inline.
 * Panel: cover → title → title block (P/N · year · role · outcome) → layer tags.
 *
 * One tab stop per project (the title link); the cover repeats it for the
 * pointer only. Focusing a project scrolls the page to centre its panel, so
 * the keyboard never needs the horizontal track.
 */

type WorkProps = {
  projects?: Project[];
  id?: string;
  index?: number;
  /** Projects in the full register (/work/). Shown as the way to all work; 0 hides the link (specimens). */
  total?: number;
};

export function Work({
  projects = getFeaturedProjects(),
  id = "work",
  index = 4,
  total = getProjects().length,
}: WorkProps) {
  const [lead] = projects;
  return (
    <SectionShell id={id} index={index} title="Work" contentClassName="work-shell">
      <h2 className="sr-only">Selected work</h2>
      <WorkStage>
        <div className="work__stage" data-work="stage">
          <ol className="work__rail" data-work="rail">
            {projects.map((project) => (
              <Panel key={project.slug} project={project} idPrefix={id} />
            ))}
          </ol>
          <div className="work__foot" data-work="foot">
            <div className="work__assembly" aria-hidden="true">
              <p className="work__readout">
                <span data-work="readout-part">{lead.partNumber}</span>
                <span className="work__readout-count">
                  <span data-work="readout-index">01</span> / {String(projects.length).padStart(2, "0")}
                </span>
              </p>
              <LayerStrip lit={lead.layers} variant="full" className="work__strip" />
            </div>
            {/* In the pinned stage on desktop: the way to every project stays in view across the track. */}
            {total > 0 && (
              <p className="work__all">
                <span className="work__all-note">
                  {String(projects.length).padStart(2, "0")} of {String(total).padStart(2, "0")} shown here
                </span>
                <Button href="/work/" className="work__all-button">
                  View all {total} projects
                </Button>
              </p>
            )}
          </div>
        </div>
      </WorkStage>
    </SectionShell>
  );
}

function Panel({ project, idPrefix }: { project: Project; idPrefix: string }) {
  const href = `/work/${project.slug}/`;
  const titleId = `${idPrefix}-${project.slug}`;
  const [outcome] = project.outcomes;

  return (
    <li className="work-panel" data-work="panel" data-layers={project.layers.join(" ")}>
      <article className="work-panel__body" aria-labelledby={titleId}>
        <div className="work-panel__cover" data-cursor="view">
          {/* Pointer shortcut to the same place as the title link: not a second tab stop. */}
          <OpenProject
            href={href}
            label={project.partNumber}
            tabIndex={-1}
            aria-hidden="true"
            className="work-panel__cover-link"
          >
            <ProjectCover project={project} />
          </OpenProject>
          {/* Raised on hover / focus (fine pointers); always shown on touch. */}
          <div className="work-panel__notes" data-work="notes">
            <LeaderLine direction="up-right" className="work-panel__stack">
              <StackLabel stack={project.stack} />
            </LeaderLine>
            <div className="work-panel__duration">
              <DimensionLine value={project.duration} />
            </div>
          </div>
        </div>

        <div className="work-panel__meta">
          <h3 id={titleId} className="work-panel__title">
            <OpenProject href={href} label={project.partNumber} className="work-panel__link">
              <Content value={project.title} />
            </OpenProject>
          </h3>

          <dl className="work-panel__block">
            <div className="work-panel__cell">
              <dt>Part</dt>
              <dd className="work-panel__part">{project.partNumber}</dd>
            </div>
            <div className="work-panel__cell">
              <dt>Year</dt>
              <Content as="dd" value={project.year > 0 ? String(project.year) : todo("Year")} />
            </div>
            <div className="work-panel__cell">
              <dt>Role</dt>
              <Content as="dd" value={project.role} />
            </div>
            <div className="work-panel__cell work-panel__cell--outcome">
              <dt>Outcome</dt>
              {outcome ? (
                <dd className="work-panel__outcome">
                  <span className="work-panel__outcome-value">{outcome.value}</span>{" "}
                  <span className="work-panel__outcome-label">{outcome.label}</span>
                </dd>
              ) : (
                <Content as="dd" value={todo("One hard, verifiable result")} />
              )}
            </div>
          </dl>

          <ul className="work-panel__layers" aria-label="Layers">
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

          <LayerStrip lit={project.layers} variant="inline" className="work-panel__strip" />
        </div>
      </article>
    </li>
  );
}
