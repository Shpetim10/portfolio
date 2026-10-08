import { ViewTransition } from "react";
import type { Project } from "@/content";
import { todo } from "@/content/todo";
import { COVER_SHARE, coverName } from "@/motion/transitions";
import { Content } from "./Content";
import { cx } from "./cx";

type ProjectCoverProps = {
  project: Project;
  className?: string;
  /** The case-study header cover is above the fold: load it eagerly. */
  eager?: boolean;
};

/**
 * A project's cover, flat on graphite in a hairline frame (--cover-ratio).
 * The same element on the homepage panel and the case-study header: opening a
 * project morphs one into the other (view-transition name per slug, paired only
 * on OPEN_PROJECT navigations). The frame clips; `data-cover="media"` is the
 * inner layer the work track scales.
 * Until the owner supplies the asset, the frame shows the drafting convention
 * for an image area (a crossed box) and a marked TODO.
 */
export function ProjectCover({ project, className, eager = false }: ProjectCoverProps) {
  const { cover } = project;
  const supplied = cover.width > 0 && cover.height > 0;

  return (
    <ViewTransition name={coverName(project.slug)} share={COVER_SHARE} default="none">
      <div className={cx("project-cover", className)} data-todo={supplied ? undefined : ""}>
        <div className="project-cover__media" data-cover="media">
          {supplied ? (
            // Pre-optimised at build (P1-01 will swap in <Picture>); next/image needs a server.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.src}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
              className="project-cover__image"
            />
          ) : (
            <>
              <svg
                className="project-cover__frame"
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M0 0L1 1M1 0L0 1" vectorEffect="non-scaling-stroke" />
              </svg>
              <Content value={todo(`Cover image · ${project.partNumber}`)} className="project-cover__todo" />
            </>
          )}
        </div>
      </div>
    </ViewTransition>
  );
}
