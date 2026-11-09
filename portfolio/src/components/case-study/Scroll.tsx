import { ContentError, type Media } from "@/content";
import { Caption, pickMedia, Shot } from "./Gallery";
import { PageReader, type Stop } from "./PageReader";

/*
 * <Scroll> · a full-page screenshot too long to be a figure (a whole web page,
 * many screens tall), shown in a scrolling reader with a minimap, jump points
 * and a full-screen mode. See PageReader.tsx for how it behaves.
 *
 *   <Scroll media={2} label="Retrieval console" caption="…"
 *           stops={[{ at: 0, label: "Query" }, { at: 0.4, label: "Ranked chunks" }]} />
 *
 * `media` indexes the project's gallery (the page's alt text lives there).
 * `label` names the page in the reader's title bar. `stops` are the jump points:
 * `at` is where on the page, 0 (top) to 1 (bottom), in order, up to MAX_STOPS.
 * Until the image is supplied it falls back to the marked placeholder frame.
 */

const MAX_STOPS = 6;

export type ScrollProps = { media: number; label: string; caption: string; stops?: Stop[] };

function checkStops(label: string, stops: Stop[]) {
  if (stops.length > MAX_STOPS) {
    throw new ContentError(`"${label}" takes at most ${MAX_STOPS} jump points (found ${stops.length}).`);
  }
  stops.forEach(({ at, label: name }, i) => {
    if (!(at >= 0 && at <= 1)) {
      throw new ContentError(`Jump point "${name}" must sit on the page (at from 0 to 1).`);
    }
    if (i > 0 && at <= stops[i - 1].at) {
      throw new ContentError(`Jump point "${name}" must come after "${stops[i - 1].label}".`);
    }
  });
}

export function Scroll({ gallery, media, label, caption, stops = [] }: ScrollProps & { gallery: Media[] }) {
  checkStops(label, stops);
  const picked = pickMedia(gallery, media);
  if (!picked || picked.width === 0 || picked.height === 0 || picked.kind !== "image") {
    return (
      <div className="gallery story-wide">
        <Shot gallery={gallery} media={media} caption={caption} />
      </div>
    );
  }

  return (
    <figure className="scroll story-wide case-figure">
      <PageReader media={picked} label={label} stops={stops} />
      <Caption caption={caption} notes={[]} />
    </figure>
  );
}
