import { RegistrationMark, type Corner } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { ProjectCover } from "@/components/ui/ProjectCover";
import type { Project } from "@/content";
import { todo } from "@/content/todo";

/*
 * T07 · Case-study header. Reading order = visual order:
 *   drawing number row → cover (the work panel's cover morphs into it, T06)
 *   → title (display-l, may bleed) → summary → title block (role · team · duration · year · stack).
 *
 * Mobile: everything stacks; the title block is 2 columns with stack across both.
 * Desktop: the summary takes 7 columns, the title block runs the full width in 5 cells.
 * Static: the header is above the fold, so nothing in it waits on script (LCP).
 */

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

export function CaseHeader({ project }: { project: Project }) {
  const meta: [term: string, value: string][] = [
    ["Role", project.role],
    ["Team", project.team ?? todo("Team")],
    ["Duration", project.duration],
    ["Year", project.year > 0 ? String(project.year) : todo("Year")],
    ["Stack", project.stack.length > 0 ? project.stack.join(" · ") : todo("Stack")],
  ];

  return (
    <header className="case-header layout-grid">
      <p className="section-index case-header__index">
        <span className="section-index__number">{project.partNumber}</span>
        <span className="section-index__title">Case study</span>
        <span className="section-index__rule" aria-hidden="true" />
        {project.client && <span className="section-index__rev">{project.client}</span>}
      </p>

      <div className="case-header__cover">
        {CORNERS.map((corner) => (
          <RegistrationMark key={corner} corner={corner} />
        ))}
        <ProjectCover project={project} eager />
      </div>

      <h1 id="case-title" className="case-header__title">
        <Content value={project.title} />
      </h1>

      <Content as="p" value={project.summary} className="case-header__summary" />

      <dl className="case-header__block">
        {meta.map(([term, value]) => (
          <div key={term} className="case-header__cell" data-term={term.toLowerCase()}>
            <dt>{term}</dt>
            <Content as="dd" value={value} />
          </div>
        ))}
      </dl>
    </header>
  );
}
