/*
 * Route transitions shared by server and client components (no "use client").
 *
 * OPEN_PROJECT is the transition type a work panel's links carry (next/link
 * `transitionTypes`). Only navigations of that type pair the covers below:
 * the panel's cover and the case-study header's cover share one view-transition
 * name, and morph between them (src/styles/motion.css · VIEW TRANSITIONS).
 * Browser back / other links carry no type, so nothing morphs unexpectedly.
 */

export const OPEN_PROJECT = "open-project";

/** view-transition-name of a project's cover, identical on the homepage and its case study. */
export const coverName = (slug: string) => `cover-${slug}`;

/** view-transition-class of the morph, mapped per transition type. */
export const COVER_SHARE = { [OPEN_PROJECT]: "cover-morph", default: "none" } as const;
