import type { CSSProperties, ReactNode } from "react";
import { LeaderLine, type LeaderDirection } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { ContentError, type Media } from "@/content";
import { todo } from "@/content/todo";
import { Annotate } from "@/motion/signatures/annotate";
import { Invert } from "@/motion/signatures/invert";

/*
 * T07 · Gallery. Real screenshots, flat on graphite in hairline frames — no
 * device mockups, no tilt. Written in MDX; `media` indexes the project's
 * gallery (content/projects.ts), where the alt text lives.
 *
 *   <Gallery>  a run of <Shot>s: the first full width, the rest in pairs (desktop);
 *              one column on mobile.
 *   <Shot>     one screenshot + up to 3 notes, each pinned at (x, y), 0–1 of the image.
 *   <Spread>   the strongest visual, edge to edge on a paper section that
 *              INVERTs in. Exactly one per story.
 *
 * Notes: desktop draws each as a leader line (ANNOTATE in view); mobile marks
 * the point with its number and lists the notes under the image. The list is
 * the notes' text for everyone: visible on mobile, read by screen readers on
 * desktop; the drawn marks are aria-hidden. Figures number themselves (CSS counter).
 * Until the owner supplies an image, its frame shows a crossed box and a TODO.
 */

export type Note = { x: number; y: number; label: string };

const MAX_NOTES = 3;

const pad = (n: number) => String(n).padStart(2, "0");

function checkNotes(notes: Note[]) {
  if (notes.length > MAX_NOTES) {
    throw new ContentError(`A figure takes at most ${MAX_NOTES} notes (found ${notes.length}).`);
  }
  for (const { x, y, label } of notes) {
    if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) {
      throw new ContentError(`Note "${label}" must sit inside its image (x and y from 0 to 1).`);
    }
  }
}

/** Resolves `media` against the project's gallery. Undefined while the gallery is still TODO. */
export function pickMedia(gallery: Media[], index: number): Media | undefined {
  if (gallery.length === 0) return undefined;
  const media = gallery[index];
  if (!media) throw new ContentError(`Gallery has no image ${index} (it has ${gallery.length}).`);
  return media;
}

/* Plate: the media itself, or the placeholder frame. ----------------------------------------- */

function Plate({ media }: { media?: Media }) {
  const supplied = media && media.width > 0 && media.height > 0;
  const ratio = supplied
    ? ({ "--plate-ratio": `${media.width} / ${media.height}` } as CSSProperties)
    : undefined;

  return (
    <div className="plate" style={ratio} data-todo={supplied ? undefined : ""}>
      {!supplied ? (
        <>
          <svg
            className="plate__frame"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M0 0L1 1M1 0L0 1" vectorEffect="non-scaling-stroke" />
          </svg>
          <Content value={todo("Screenshot · real UI, with its alt text")} className="plate__todo" />
        </>
      ) : media.kind === "video" ? (
        <video
          className="plate__media"
          src={media.src}
          poster={media.poster}
          width={media.width}
          height={media.height}
          aria-label={media.alt}
          controls
          muted
          playsInline
          preload="none"
        />
      ) : (
        // Pre-optimised at build (P1-01 will swap in <Picture>); next/image needs a server.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="plate__media"
          src={media.src}
          alt={media.alt}
          width={media.width}
          height={media.height}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}

/* Notes ---------------------------------------------------------------------------------------- */

// Leaders head away from the nearer edges, so labels stay over the image.
const directionOf = ({ x, y }: Note): LeaderDirection =>
  `${y > 0.3 ? "up" : "down"}-${x < 0.55 ? "right" : "left"}`;

const at = ({ x, y }: Note) => ({ "--x": x * 100, "--y": y * 100 }) as CSSProperties;

function Marks({ notes }: { notes: Note[] }) {
  if (notes.length === 0) return null;
  return (
    <>
      <Annotate className="figure-notes" start="top 70%">
        {notes.map((note, i) => (
          <LeaderLine
            key={i}
            direction={directionOf(note)}
            className="figure-notes__leader"
            style={at(note)}
            aria-hidden="true"
          >
            <span className="part-label">
              <span className="part-label__number">{pad(i + 1)}</span> — {note.label}
            </span>
          </LeaderLine>
        ))}
      </Annotate>
      {notes.map((note, i) => (
        <span key={i} className="figure-notes__marker" style={at(note)} aria-hidden="true">
          {pad(i + 1)}
        </span>
      ))}
    </>
  );
}

function Caption({ caption, notes }: { caption: string; notes: Note[] }) {
  return (
    <figcaption className="case-figure__caption">
      <span className="case-figure__number" aria-hidden="true" />
      <Content value={caption} />
      {notes.length > 0 && (
        <ol className="figure-key" aria-label="Notes">
          {notes.map((note, i) => (
            <li key={i}>
              <span className="figure-key__number" aria-hidden="true">
                {pad(i + 1)}
              </span>
              {note.label}
            </li>
          ))}
        </ol>
      )}
    </figcaption>
  );
}

/* MDX components --------------------------------------------------------------------------------- */

export type FigureProps = { media: number; caption: string; notes?: Note[] };

export function Shot({ gallery, media, caption, notes = [] }: FigureProps & { gallery: Media[] }) {
  checkNotes(notes);
  return (
    <figure className="shot case-figure">
      <div className="shot__frame">
        <Plate media={pickMedia(gallery, media)} />
        <Marks notes={notes} />
      </div>
      <Caption caption={caption} notes={notes} />
    </figure>
  );
}

export function Gallery({ children }: { children: ReactNode }) {
  return <div className="gallery story-wide">{children}</div>;
}

export function Spread({ gallery, media, caption, notes = [] }: FigureProps & { gallery: Media[] }) {
  checkNotes(notes);
  return (
    <div className="spread story-bleed">
      <Invert>
        <figure className="spread__figure case-figure layout-grid section-pad">
          <p className="section-index spread__index" aria-hidden="true">
            <span className="section-index__number case-figure__number" />
            <span className="section-index__title">Spread</span>
            <span className="section-index__rule" />
          </p>
          <div className="spread__frame">
            <Plate media={pickMedia(gallery, media)} />
            <Marks notes={notes} />
          </div>
          <Caption caption={caption} notes={notes} />
        </figure>
      </Invert>
    </div>
  );
}
