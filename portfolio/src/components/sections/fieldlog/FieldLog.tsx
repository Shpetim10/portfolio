import { Content } from "@/components/ui/Content";
import { SectionShell } from "@/components/ui/SectionShell";
import { getWriting, type Writing } from "@/content";
import { getContributions, type ContributionSnapshot } from "@/content/github";
import { todo } from "@/content/todo";
import { FieldLogStage } from "./FieldLogStage";
import { layout, ROWS, WEEKS } from "./matrix";

/*
 * T11 · Open source & Writing — "FIELD LOG".
 *
 * A 52×7 dot-matrix of the last year's GitHub contributions from the build-time
 * snapshot (scripts/fetch-github.mjs → src/content/generated/github.json), then
 * a log of articles, talks and papers (date · venue · title). Dust dots, signal
 * for the busiest tenth of days. The matrix is a picture (role="img" with a
 * one-line summary); the log is real text. No token or fetch reaches the client.
 *
 * Mobile: the matrix scales to the column (≈5px dots), the log rows stack
 * (date · kind, then title, then venue). Reduced motion: blocks fade (200ms).
 */

const KIND: Record<Writing["kind"], string> = { article: "Article", talk: "Talk", paper: "Paper" };

type FieldLogProps = {
  snapshot?: ContributionSnapshot;
  writing?: Writing[];
  id?: string;
  index?: number;
};

export function FieldLog({
  snapshot = getContributions(),
  writing = getWriting(),
  id = "field-log",
  index = 8,
}: FieldLogProps) {
  return (
    <SectionShell id={id} index={index} title="Open source & Writing">
      <FieldLogStage>
        <h2 className="fieldlog__label">Field log</h2>
        <Matrix snapshot={snapshot} />
        <Log writing={writing} />
      </FieldLogStage>
    </SectionShell>
  );
}

const pitch = 12; // dot grid unit in the SVG's own coordinates
const dot = 8;

function Matrix({ snapshot }: { snapshot: ContributionSnapshot }) {
  const cells = layout(snapshot.days);
  if (cells.length === 0) {
    return (
      <Content
        as="p"
        value={todo("GitHub contribution snapshot (set GITHUB_USER and GITHUB_TOKEN at build)")}
      />
    );
  }

  const busiest = cells.reduce((a, b) => (b.count > a.count ? b : a));
  const columns = Array.from({ length: WEEKS + 1 }, (_, col) => cells.filter((cell) => cell.col === col));
  const label = `${snapshot.total.toLocaleString("en-US")} contributions on GitHub in the last year; busiest day ${busiest.date} with ${busiest.count}.`;

  return (
    <figure className="fieldlog__figure" data-fieldlog="matrix">
      <svg
        className="fieldlog__matrix"
        viewBox={`0 0 ${(WEEKS + 1) * pitch - (pitch - dot)} ${ROWS * pitch - (pitch - dot)}`}
        role="img"
        aria-label={label}
      >
        {columns.map((column, col) => (
          <g key={col} data-fieldlog="col">
            {column.map((cell) => (
              <rect
                key={cell.date}
                className={`fieldlog__dot--${cell.level}`}
                x={col * pitch}
                y={cell.row * pitch}
                width={dot}
                height={dot}
                rx="1"
              />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="fieldlog__caption">
        <span>
          {snapshot.login && `@${snapshot.login} · `}
          {snapshot.total.toLocaleString("en-US")} contributions · last 52 weeks
        </span>
        <span className="fieldlog__legend" aria-hidden="true">
          less
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} className={`fieldlog__swatch fieldlog__dot--${level}`} />
          ))}
          more
        </span>
      </figcaption>
    </figure>
  );
}

function Log({ writing }: { writing: Writing[] }) {
  if (writing.length === 0) {
    return <Content as="p" value={todo("Articles, talks and papers: date · venue · title")} />;
  }
  return (
    <ol className="fieldlog__log" data-fieldlog="log" aria-label="Writing and talks">
      {writing.map((entry) => (
        <li key={entry.href} className="fieldlog__entry" data-fieldlog="entry">
          <time className="fieldlog__date" dateTime={entry.date}>
            {entry.date}
          </time>
          <span className="fieldlog__kind">{KIND[entry.kind]}</span>
          <a className="fieldlog__title" href={entry.href} target="_blank" rel="noreferrer">
            {entry.title}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <span className="fieldlog__venue">{entry.venue}</span>
        </li>
      ))}
    </ol>
  );
}
