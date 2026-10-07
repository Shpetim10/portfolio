import NextLink from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cx, isExternalHref } from "./cx";

export type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & { href: string };

/**
 * Bone text link. A dust rule is always visible; a bone rule draws over it
 * left → right on hover/focus. Internal hrefs route through next/link.
 * Links opening a new tab say so (glyph + screen-reader text).
 */
export function Link({ href, className, children, target, rel, ...rest }: LinkProps) {
  const newTab = target === "_blank";
  const props = {
    ...rest,
    className: cx("link", className),
    target,
    rel: newTab ? cx(rel, "noopener noreferrer") : rel,
  };
  const content = (
    <>
      {children}
      {newTab && (
        <>
          <span className="link__external" aria-hidden="true">
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </>
      )}
    </>
  );

  if (isExternalHref(href)) {
    return (
      <a {...props} href={href}>
        {content}
      </a>
    );
  }
  return (
    <NextLink {...props} href={href}>
      {content}
    </NextLink>
  );
}
