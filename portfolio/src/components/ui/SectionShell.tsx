import type { ReactNode } from "react";
import { RegistrationMark, SectionIndex, type Corner } from "./Annotation";
import { cx } from "./cx";

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

type SectionShellProps = {
  /** Anchor id; the section is labelled by its index title. */
  id: string;
  index: number;
  title: string;
  rev?: string;
  children: ReactNode;
  className?: string;
  /** Classes for the inner layout grid (children sit on the 4 / 8 / 12 column grid). */
  contentClassName?: string;
};

/**
 * Every page section: registration marks on the four corners, the section index
 * across the top, then section padding around a layout grid.
 */
export function SectionShell({
  id,
  index,
  title,
  rev,
  children,
  className,
  contentClassName,
}: SectionShellProps) {
  const titleId = `${id}-index`;
  return (
    <section id={id} aria-labelledby={titleId} className={cx("section-shell", className)}>
      {CORNERS.map((corner) => (
        <RegistrationMark key={corner} corner={corner} />
      ))}
      <header className="section-shell__header layout-grid">
        <SectionIndex index={index} title={title} rev={rev} titleId={titleId} className="col-span-full" />
      </header>
      <div className={cx("layout-grid section-pad", contentClassName)}>{children}</div>
    </section>
  );
}
