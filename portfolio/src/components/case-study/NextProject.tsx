import { LeaderLine } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { Link } from "@/components/ui/Link";
import { OpenProject } from "@/components/ui/OpenProject";
import { ProjectCover } from "@/components/ui/ProjectCover";
import type { Project } from "@/content";
import { todo } from "@/content/todo";
import { NextStage } from "./NextStage";

/*
 * T07 · Next-project panel: the end of every case study, and the way forward.
 *
 * Layout
 *   desktop  title + title block in columns 1–5, the cover in 6–12.
 *   mobile   label → title → cover → meta, stacked.
 * Previews: the cover settles from --work-cover-scale to 1 as the panel
 * scrolls in (scrubbed); hovering or focusing the project raises a note on
 * the cover (fine pointers; always shown on touch).
 * Forward: the same OPEN_PROJECT link as the work panels — the cover morphs
 * into the next case study's header (view transition), or the page wipe runs.
 *
 * One tab stop (the title link); the cover repeats it for the pointer only.
 */

type NextProjectProps = {
  project: Project;
  /** 1-based place of `project` among all projects, in reading order. */
  position: number;
  total: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function NextProject({ project, position, total }: NextProjectProps) {
  const href = `/work/${project.slug}/`;

  return (
    <nav className="next-project" aria-labelledby="next-project-title">
      <div className="layout-grid section-pad">
        <p className="section-index next-project__index">
          <span className="section-index__number" aria-hidden="true">
            [→]
          </span>
          <span className="section-index__title">Next project</span>
          <span className="section-index__rule" aria-hidden="true" />
          <span className="section-index__rev">
            {pad(position)} / {pad(total)}
          </span>
        </p>

        <NextStage>
          <div className="next-project__meta">
            <p className="next-project__part">{project.partNumber}</p>
            <h2 id="next-project-title" className="next-project__title">
              <span className="sr-only">Next project: </span>
              <OpenProject href={href} label={project.partNumber} className="next-project__link">
                <Content value={project.title} />
                <span className="next-project__arrow" aria-hidden="true">
                  {" "}
                  →
                </span>
              </OpenProject>
            </h2>
            <Content as="p" value={project.summary} className="next-project__summary" />
          </div>

          <div className="next-project__cover" data-cursor="open">
            <OpenProject
              href={href}
              label={project.partNumber}
              tabIndex={-1}
              aria-hidden="true"
              className="next-project__cover-link"
            >
              <ProjectCover project={project} />
            </OpenProject>
            <div className="next-project__note" aria-hidden="true">
              <LeaderLine direction="up-right">
                <span className="part-label">
                  <span className="part-label__number">{project.partNumber}</span> —{" "}
                  <Content value={project.role} />
                </span>
              </LeaderLine>
            </div>
          </div>

          <dl className="next-project__block">
            <div className="case-header__cell">
              <dt>Year</dt>
              <Content as="dd" value={project.year > 0 ? String(project.year) : todo("Year")} />
            </div>
            <div className="case-header__cell">
              <dt>Duration</dt>
              <Content as="dd" value={project.duration} />
            </div>
          </dl>
        </NextStage>

        <p className="next-project__index-link">
          <Link href="/#work">← All work</Link>
        </p>
      </div>
    </nav>
  );
}
