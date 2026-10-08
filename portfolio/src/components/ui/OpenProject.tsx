"use client";

import NextLink from "next/link";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { supportsViewTransitions, wipeTo } from "@/motion/PageWipe";
import { OPEN_PROJECT } from "@/motion/transitions";

type OpenProjectProps = Omit<ComponentPropsWithoutRef<typeof NextLink>, "href" | "transitionTypes"> & {
  href: string;
  /** Shown on the wipe plate in browsers without view transitions, e.g. "P/N 01". */
  label: string;
};

/**
 * A link into a case study. The navigation carries OPEN_PROJECT, so the
 * project's cover morphs into the case-study header (view transition). Where the
 * browser can't, a plain left click runs the page wipe instead; modified clicks
 * (new tab, download…) are left to the browser.
 */
export function OpenProject({ href, label, onClick, ...rest }: OpenProjectProps) {
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (supportsViewTransitions()) return;
    if (wipeTo({ href, label })) event.preventDefault();
  };

  return <NextLink {...rest} href={href} transitionTypes={[OPEN_PROJECT]} onClick={open} />;
}
