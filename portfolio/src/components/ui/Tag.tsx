import type { ReactNode } from "react";
import { cx } from "./cx";

type TagProps = {
  children: ReactNode;
  /** Render as a list item when tags sit in a <ul>. */
  as?: "span" | "li";
  className?: string;
};

/** Micro mono label in a hairline frame (2px radius — the only rounded box). */
export function Tag({ children, as: Element = "span", className }: TagProps) {
  return <Element className={cx("tag", className)}>{children}</Element>;
}
