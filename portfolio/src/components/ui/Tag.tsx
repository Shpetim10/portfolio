import NextLink from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

type TagProps = {
  children: ReactNode;
  /** Render as a list item when tags sit in a <ul>. */
  as?: "span" | "li";
  /**
   * Makes the tag a link: an arrow glyph follows the label, and `linkSuffix`
   * (e.g. "View award") ends its accessible name. A fragment ("#award-x")
   * stays a plain anchor so the browser and Lenis scroll to it.
   */
  href?: string;
  linkSuffix?: string;
  className?: string;
};

/** Micro mono label in a hairline frame (2px radius — the only rounded box). */
export function Tag({ children, as: Element = "span", href, linkSuffix, className }: TagProps) {
  if (!href) return <Element className={cx("tag", className)}>{children}</Element>;

  const content = (
    <>
      {children}
      <span className="tag__arrow" aria-hidden="true">
        →
      </span>
      {linkSuffix && <span className="sr-only">, {linkSuffix}</span>}
    </>
  );
  const link = href.startsWith("#") ? (
    <a href={href} className={cx("tag tag--link", className)}>
      {content}
    </a>
  ) : (
    <NextLink href={href} className={cx("tag tag--link", className)}>
      {content}
    </NextLink>
  );
  return Element === "li" ? <li className="tag-item">{link}</li> : link;
}
