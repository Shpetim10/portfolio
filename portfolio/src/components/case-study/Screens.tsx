import { ContentError, type Media } from "@/content";
import { Caption, pickMedia } from "./Gallery";
import { ScreenRail } from "./ScreenRail";

/*
 * <Screens> · a run of phone screenshots as one sliding strip: how a flow reads
 * on the device (the Road, one episode played through, review, settings…), so a
 * product with dozens of screens shows them all without a page-long gallery.
 *
 *   <Screens title="The Road" caption="…"
 *            items={[{ media: 1, label: "Light · English" }, { media: 2, label: "…" }]} />
 *
 * `media` indexes the project's gallery (the alt text lives there); `label` is the
 * short visible caption under each screen. Frames are flat on graphite, no device
 * mockups. Phones swipe it, mice use the arrow buttons, keyboards focus it and
 * use the arrow keys. Screens are lazy-loaded.
 */

export type ScreensProps = {
  title: string;
  caption: string;
  items: { media: number; label: string }[];
};

export function Screens({ gallery, title, caption, items }: ScreensProps & { gallery: Media[] }) {
  if (items.length === 0) throw new ContentError(`The "${title}" strip has no screens.`);

  return (
    <figure className="screens story-wide case-figure">
      <ScreenRail title={title} count={items.length}>
        {items.map(({ media, label }) => {
          const picked = pickMedia(gallery, media);
          const supplied = picked && picked.width > 0 && picked.height > 0 && picked.kind === "image";
          return (
            <li key={media} className="screens__item">
              <div
                className="screens__frame"
                style={supplied ? { aspectRatio: `${picked.width} / ${picked.height}` } : undefined}
              >
                {supplied && (
                  // Pre-optimised at build (P1-01 will swap in <Picture>); next/image needs a server.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="screens__image"
                    src={picked.src}
                    alt={picked.alt}
                    width={picked.width}
                    height={picked.height}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>
              <p className="screens__label">
                <span className="screens__index" aria-hidden="true" />
                {label}
              </p>
            </li>
          );
        })}
      </ScreenRail>
      <Caption caption={caption} notes={[]} />
    </figure>
  );
}
