import { isTodo } from "@/content";
import type { ElementType } from "react";

type ContentProps = {
  value: string;
  as?: ElementType;
  className?: string;
};

/**
 * Renders a content string. Unsupplied values (TODO …) render as a clearly
 * marked placeholder so missing facts are never mistaken for real ones.
 */
export function Content({ value, as: Tag = "span", className }: ContentProps) {
  if (isTodo(value)) {
    return (
      <Tag className={className} data-todo="">
        <mark className="rounded-tag border border-dashed border-dust bg-transparent px-2 font-mono text-label text-dust uppercase">
          {value}
        </mark>
      </Tag>
    );
  }
  return <Tag className={className}>{value}</Tag>;
}
