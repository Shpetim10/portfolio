import type { MDXComponents } from "mdx/types";
import { Content } from "@/components/ui/Content";
import type { Project } from "@/content";
import { todo } from "@/content/todo";
import { Chapter } from "./Chapter";
import { Gallery, Shot, Spread, type FigureProps } from "./Gallery";
import { SystemDiagram } from "./SystemDiagram";

/** A paragraph the owner still has to write: `<Todo what="…" />`. */
function Todo({ what }: { what: string }) {
  return <Content as="p" value={todo(what)} className="story-todo" />;
}

/** The components a case-study MDX story can use, bound to its project (figures index its gallery). */
export function storyComponents(project: Project): MDXComponents {
  return {
    Chapter,
    SystemDiagram,
    Gallery,
    Todo,
    Shot: (props: FigureProps) => <Shot gallery={project.gallery} {...props} />,
    Spread: (props: FigureProps) => <Spread gallery={project.gallery} {...props} />,
  };
}
