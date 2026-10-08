import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import { Link } from "@/components/ui/Link";

/*
 * Global MDX elements (required by @next/mdx in the App Router). Prose is
 * styled by its container (.chapter__body in src/styles/case-study.css), so
 * only behaviour is mapped here: links route internally and announce new tabs.
 * Case-study components (Chapter, SystemDiagram, Shot…) are bound per project
 * in src/components/case-study/story.tsx.
 */

const components: MDXComponents = {
  a: ({ href = "", ...rest }: ComponentPropsWithoutRef<"a">) => (
    <Link href={href} target={/^https?:/.test(href) ? "_blank" : undefined} {...rest} />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
