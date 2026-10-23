import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { stillOf, type SculptureData } from "@/components/sculpture/model";
import { LeaderLine, RegistrationMark } from "@/components/ui/Annotation";
import { Content } from "@/components/ui/Content";
import { Counter } from "@/components/ui/Counter";
import { SectionShell } from "@/components/ui/SectionShell";
import { getProfile, isTodo, type Media } from "@/content";
import victoryData from "@/content/sculpture/victory.json";
import { todo } from "@/content/todo";
import { ManifestoSculpture } from "./ManifestoSculpture";
import { ManifestoStage } from "./ManifestoStage";

/*
 * T04c · Manifesto with Winged Victory + signature block. Static, readable
 * markup first (server-rendered, complete with JS off); ManifestoStage adds the
 * pin / sticky, the word highlight, the assembly and the annotation.
 *
 * Layout (src/styles/manifesto.css)
 *   desktop  the manifesto in columns 1–7, Victory in 8–12 facing it; pinned
 *            together for --manifesto-pin of scroll. The signature block follows.
 *   compact  Victory in a sticky band at the top (--victory-sticky), the
 *            manifesto scrolling beneath it, then the signature block.
 *   both     the signature block is a centred hall-of-fame plaque: the mounted
 *            portrait, the nameplate with the tenure figures, the signed line.
 *
 * DOM order is reading order: the manifesto, then the figure (its caption names
 * the sculpture), then the signature. The grid moves the figure up on compact.
 */

/** Victory's final grid, printed by the server; the client loads the sampled data itself. */
const still = stillOf(victoryData as SculptureData, "desktop");
/** Width / height of the sculpture's box (both grids share it), so CSS can fit it to a height. */
const VICTORY_ASPECT = (still.cols * still.cellRatio) / still.rows;

const CAPTION = "After the Winged Victory of Samothrace, c. 190 BC. Rebuilt in code.";
const SPEC = ["Material: Code", "Direction: Forward"];
const CORNERS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;

/** One entry per sentence (Intl.Segmenter knows "4.0 GPA." from the end of a sentence). */
const sentences = (text: string) =>
  [...new Intl.Segmenter("en", { granularity: "sentence" }).segment(text)]
    .map(({ segment }) => segment.trim())
    .filter(Boolean);

export function Manifesto() {
  const { manifesto, name, role, location, portrait, tenure } = getProfile();
  const missing = isTodo(manifesto);
  const city = isTodo(location) ? location : location.split(",")[0].trim();

  return (
    <SectionShell id="manifesto" index={2} title="Manifesto">
      <ManifestoStage>
        <div className="manifesto__track" data-manifesto="track">
          <div className="manifesto__stage" data-manifesto="stage">
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
                    {sentence.split(/\s+/).map((word, w) => (
                      <Fragment key={w}>
                        {w > 0 && " "}
                        <span className="manifesto__word" data-manifesto="word">
                          {word}
                        </span>
                      </Fragment>
                    ))}{" "}
                  </span>
                ))}
              </p>
            </div>

            <figure className="victory" data-manifesto="figure">
              <div className="victory__slot" style={{ "--victory-aspect": VICTORY_ASPECT } as CSSProperties}>
                <div className="victory__plate">
                  <ManifestoSculpture still={still} />
                  <LeaderLine direction="down-right" className="victory__leader">
                    {SPEC.map((line) => (
                      <span key={line} className="victory__spec-line">
                        {line}
                      </span>
                    ))}
                  </LeaderLine>
                </div>
              </div>
              <p className="victory__spec" data-manifesto="spec">
                {SPEC.map((line) => (
                  <span key={line} className="victory__spec-line">
                    {line}
                  </span>
                ))}
              </p>
              <figcaption className="victory__caption">{CAPTION}</figcaption>
            </figure>
          </div>
        </div>

        {/* The plaque: a hall-of-fame mount, centred on every width. */}
        <div className="signature" data-manifesto="signature">
          <p className="signature__eyebrow" data-manifesto="eyebrow">
            <span className="signature__rule" data-manifesto="rule" aria-hidden="true" />
            <span>Hall of Fame</span>
            <span className="signature__rule" data-manifesto="rule" aria-hidden="true" />
          </p>
          <figure className="portrait" data-manifesto="portrait">
            <div className="portrait__mount" data-manifesto="mount">
              <div
                className="portrait__frame"
                style={
                  hasAsset(portrait)
                    ? ({ "--portrait-ratio": `${portrait.width} / ${portrait.height}` } as CSSProperties)
                    : undefined
                }
              >
                {hasAsset(portrait) ? (
                  <div className="portrait__media" data-manifesto="media">
                    <Image
                      src={portrait.src}
                      alt={portrait.alt}
                      width={portrait.width}
                      height={portrait.height}
                      sizes="(width >= 30rem) 448px, calc(100vw - 72px)"
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
              {CORNERS.map((corner) => (
                <span key={corner} className="portrait__corner" data-corner={corner} data-manifesto="corner">
                  <RegistrationMark />
                </span>
              ))}
            </div>
          </figure>
          <div className="signature__text" data-manifesto="plaque">
            <span className="signature__bar" data-manifesto="bar" aria-hidden="true" />
            <Content as="p" className="signature__name" value={name} />
            <p className="signature__role">
              <Content value={role} /> · <Content value={city} />
            </p>
            {tenure.length > 0 && (
              <ul className="signature__tenure" aria-label="Tenure">
                {tenure.map((figure) => (
                  <li key={figure.label} className="signature__figure">
                    <Counter value={figure.value} suffix={figure.suffix} label={figure.label} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="signature__sign" data-manifesto="sign">
            <span className="signature__line" data-manifesto="line-sign" aria-hidden="true" />
            <span>
              — <Content value={name} />
            </span>
          </p>
        </div>
      </ManifestoStage>
    </SectionShell>
  );
}

/** A supplied photo: real dimensions and real alt text. Anything less renders the placeholder. */
const hasAsset = (media: Media) =>
  media.width > 0 && media.height > 0 && !isTodo(media.alt) && !isTodo(media.src);
