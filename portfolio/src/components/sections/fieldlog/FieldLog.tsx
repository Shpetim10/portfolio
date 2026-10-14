import { Content } from "@/components/ui/Content";
import { SectionShell } from "@/components/ui/SectionShell";
import { getWriting, type Writing } from "@/content";
import { getContributions, type ContributionSnapshot } from "@/content/github";
import { todo } from "@/content/todo";
import { FieldLogStage } from "./FieldLogStage";
import { ContributionMatrix } from "./ContributionMatrix";
import { layout } from "./matrix";

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

function Matrix({ snapshot }: { snapshot: ContributionSnapshot }) {
  if (layout(snapshot.days).length === 0) {
    return (
      <Content
        as="p"
        value={todo("GitHub contribution snapshot (set GITHUB_USER and GITHUB_TOKEN at build)")}
      />
    );
  }
  return <ContributionMatrix snapshot={snapshot} />;
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
