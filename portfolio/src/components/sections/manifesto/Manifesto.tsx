import Image from "next/image";
import type { CSSProperties } from "react";
import { DimensionLine, PartLabel, RegistrationMark } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { SectionShell } from "@/components/ui/SectionShell";
import { getProfile, getYearsOfExperience, isTodo, type Media } from "@/content";
import { todo } from "@/content/todo";
import { ManifestoStage } from "./ManifestoStage";

/*
 * T04 · Manifesto + portrait. Static, readable markup first (server-rendered,
 * complete with JS off); ManifestoStage adds the word scrub and the unmask.
 *
 * Layout (src/styles/manifesto.css)
 *   desktop  the manifesto across 8 columns, one sentence to a line block, like
 *            lyrics; the portrait in the last 4, sticky while it is read.
 *   tablet   portrait first (4 of 8 columns), then the manifesto.
 *   mobile   portrait first (3 of 4 columns), then the manifesto.
 *
 * Every sentence is bone from the first paint; motion only ever dims the ones away
 * from the viewport centre (read above it, unread below it: --manifesto-read /
 * --manifesto-unread), so contrast holds at every state.
 */

/** One entry per sentence (Intl.Segmenter knows "4.0 GPA." from the end of a sentence). */
const sentences = (text: string) =>
  [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);

export function Manifesto() {
  const { manifesto, name, portrait } = getProfile();
  const years = getYearsOfExperience();
  const missing = isTodo(manifesto);

  return (
    <SectionShell id="manifesto" index={2} title="Manifesto">
      <ManifestoStage>
        <figure className="portrait" data-manifesto="portrait">
          <div
            className="portrait__frame"
            style={
              hasAsset(portrait)
                ? ({ "--portrait-ratio": `${portrait.width} / ${portrait.height}` } as CSSProperties)
                : undefined
            }
          >
            {hasAsset(portrait) ? (
              <div className="portrait__media">
                <Image
                  src={portrait.src}
                  alt={portrait.alt}
                  width={portrait.width}
                  height={portrait.height}
                  sizes="(width >= 64rem) 33vw, (width >= 48rem) 50vw, 75vw"
                />
              </div>
            ) : (
              <div className="portrait__placeholder">
                <RegistrationMark />
                <Content value={todo("Portrait photo")} />
              </div>
            )}
            <span className="portrait__plate" data-manifesto="plate" aria-hidden="true" />
          </div>
          <figcaption className="portrait__caption" data-manifesto="caption">
            <DimensionLine
              value={
                years === undefined ? todo("Years · experience dates") : `${years.toFixed(1)} YRS EXPERIENCE`
              }
            />
            <PartLabel number="Operator" name={name} className="portrait__label" />
          </figcaption>
        </figure>

        <div className="manifesto__body">
          {missing && (
            <p className="manifesto__todo">
              TODO<span className="sr-only">:</span>
              <span aria-hidden="true">(content) · manifesto</span>
            </p>
          )}
          <p className="manifesto__text" data-manifesto="text" data-todo={missing ? "" : undefined}>
            {sentences(missing ? manifesto.replace(/^TODO:\s*/, "") : manifesto).map((sentence, i) => (
              <span key={i} className="manifesto__line" data-manifesto="line">
                {sentence}{" "}
              </span>
            ))}
          </p>
        </div>
      </ManifestoStage>
    </SectionShell>
  );
}

/** A supplied photo: real dimensions and real alt text. Anything less renders the placeholder. */
const hasAsset = (media: Media) =>
  media.width > 0 && media.height > 0 && !isTodo(media.alt) && !isTodo(media.src);
