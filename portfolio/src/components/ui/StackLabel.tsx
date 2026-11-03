import { Content } from "@/components/ui/Content";
import { todo } from "@/content/todo";

/** How many of a project's technologies a cover names; the case study lists them all. */
const SHOWN = 3;

/**
 * "STACK — LLM REQUEST PARSING · NEXT.JS" on a project cover, inside a LeaderLine.
 * One line, one box per tag: a later tag that does not fit drops out whole
 * instead of being cut mid-word. The first tag shares the "Stack —" box, so it
 * always shows, cut only on the narrowest screens (src/styles/primitives.css).
 */
export function StackLabel({ stack }: { stack: string[] }) {
  const [first, ...rest] = stack.slice(0, SHOWN);
  return (
    <span className="stack-label">
      <span className="stack-label__item">
        <span className="part-label__number">Stack</span> — <Content value={first ?? todo("Stack")} />
      </span>
      {rest.map((tag) => (
        <span key={tag} className="stack-label__item">
          · {tag}
        </span>
      ))}
    </span>
  );
}
