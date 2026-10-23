import type { ReactNode } from "react";
import { RegistrationMark, SectionIndex, type Corner } from "./Annotation";
import { cx } from "./cx";

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

type SectionShellProps = {
  /** Anchor id; the section is labelled by its index title, or by `labelledBy`. */
  id: string;
  index: number;
  title: string;
  rev?: string;
  /** id of the section's own heading, when it names the section better than the index title. */
  labelledBy?: string;
  /** The section's name in the fixed section indicator, when it differs from the index title. */
  indicatorTitle?: string;
  children: ReactNode;
  className?: string;
  /** Classes for the inner layout grid (children sit on the 4 / 8 / 12 column grid). */
  contentClassName?: string;
};

/**
 * Every page section: registration marks on the four corners, the section index
 * across the top, then section padding around a layout grid. The data-indicator-*
 * attributes feed the fixed section indicator (chrome/SectionIndicator).
 */
export function SectionShell({
  id,
  index,
  title,
  rev,
  labelledBy,
  indicatorTitle = title,
  children,
  className,
  contentClassName,
}: SectionShellProps) {
  const titleId = `${id}-index`;
  return (
    <section
      id={id}
      aria-labelledby={labelledBy ?? titleId}
      className={cx("section-shell", className)}
      data-indicator-index={String(index).padStart(2, "0")}
      data-indicator-title={indicatorTitle}
    >
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
