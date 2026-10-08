import { Content } from "@/components/ui/Content";
import { getProfile } from "@/content";
import { LocalTime } from "./Status";

/*
 * T13 · Footer — the sheet's engineering title block (design-system.md §
 * Annotation system): DRAWN BY · PROJECT · REV · SCALE · SHEET · LOCAL TIME.
 * A ruled grid of fields, each a micro mono caption over its value.
 *
 * Layout (src/styles/footer.css)
 *   ≥ 64rem   one row of six fields; PROJECT is the wide one.
 *   ≥ 48rem   two rows of three.
 *   mobile    two columns; PROJECT spans both, on top.
 * REV is the build date (the static export is the revision). LOCAL TIME is
 * the owner's clock (it ticks; HH:MM under reduced motion).
 */

/** YYYY.MM.DD of this build. */
const buildDate = () => new Date().toISOString().slice(0, 10).replaceAll("-", ".");

export function TitleBlock() {
  const profile = getProfile();
  const rev = buildDate();

  return (
    <footer className="title-block layout-grid" aria-label="Title block">
      <dl className="title-block__grid">
        <div className="title-block__field" data-field="drawn-by">
          <dt>Drawn by</dt>
          <dd>
            <Content value={profile.name} />
          </dd>
        </div>
        <div className="title-block__field" data-field="project">
          <dt>Project</dt>
          <dd className="title-block__project">Portfolio</dd>
        </div>
        <div className="title-block__field" data-field="rev">
          <dt>Rev</dt>
          <dd>
            <time dateTime={rev.replaceAll(".", "-")}>{rev}</time>
          </dd>
        </div>
        <div className="title-block__field" data-field="scale">
          <dt>Scale</dt>
          <dd>1:1</dd>
        </div>
        <div className="title-block__field" data-field="sheet">
          <dt>Sheet</dt>
          <dd>1 of 1</dd>
        </div>
        <div className="title-block__field" data-field="time">
          <dt>Local time</dt>
          <dd>
            <LocalTime timezone={profile.timezone} />
          </dd>
        </div>
      </dl>
    </footer>
  );
}
