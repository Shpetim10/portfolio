"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Media } from "@/content/types";
import { cx } from "./cx";

/*
 * A small photo gallery for a record: a strip of thumbnails (up to three, the
 * rest counted on the last) that opens a lightbox. Used for the photos behind
 * an award (medal, plaque, certificate) wherever the award is shown.
 *
 * Lightbox: a native modal <dialog>, so focus is trapped, the page behind is
 * inert, Esc closes it and focus returns to the thumbnail that opened it. Arrow
 * keys, the PREV / NEXT buttons, the thumbnail rail and a horizontal swipe move
 * between photos; the backdrop and CLOSE dismiss. The photo's alt text is its
 * caption. Only opacity is animated (reduced motion keeps the same short fade).
 * Photos are sized by their natural dimensions, so no width / height is needed.
 *
 * Photos are expected to be filtered to files that exist (publishedPhotos in
 * src/content/files.ts); an empty list renders nothing.
 */

const SHOWN = 3;
const SWIPE = 48;

const pad = (n: number) => String(n).padStart(2, "0");

type PhotoGalleryProps = {
  photos: Media[];
  /** What the photos belong to, e.g. the award's title: names the strip and the lightbox. */
  label: string;
  className?: string;
};

export function PhotoGallery({ photos, label, className }: PhotoGalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  if (photos.length === 0) return null;

  const hidden = photos.length - SHOWN;

  return (
    <div className={cx("photos", className)} data-photos="gallery">
      <p className="photos__label" aria-hidden="true">
        Photos · {pad(photos.length)}
      </p>
      <ul className="photos__strip" aria-label={`Photos: ${label}`}>
        {photos.slice(0, SHOWN).map((photo, i) => (
          <li key={photo.src}>
            <button
              type="button"
              className="photos__thumb"
              aria-haspopup="dialog"
              aria-label={`Open photo ${i + 1} of ${photos.length}: ${photo.alt}`}
              onClick={() => setOpen(i)}
            >
              {/* Pre-optimised at build; next/image needs a server. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt="" loading="lazy" decoding="async" />
              {i === SHOWN - 1 && hidden > 0 && (
                <span className="photos__more" aria-hidden="true">
                  +{hidden}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {open !== null &&
        createPortal(
          <Lightbox
            photos={photos}
            label={label}
            index={open}
            onIndex={setOpen}
            onClose={() => setOpen(null)}
          />,
          document.body,
        )}
    </div>
  );
}

function Lightbox({
  photos,
  label,
  index,
  onIndex,
  onClose,
}: {
  photos: Media[];
  label: string;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const swipeFrom = useRef<number | null>(null);
  const total = photos.length;
  const photo = photos[index];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    // The page behind must not scroll while the lightbox is up.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (element.open) element.close();
    };
  }, []);

  const step = (by: number) => onIndex((index + by + total) % total);

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      aria-label={`Photos: ${label}`}
      data-lenis-prevent
      data-photos="lightbox"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (total < 2) return;
        if (event.key === "ArrowRight") step(1);
        else if (event.key === "ArrowLeft") step(-1);
        else return;
        event.preventDefault();
      }}
    >
      <div className="lightbox__bar">
        <p className="lightbox__count">
          <span aria-hidden="true">
            {pad(index + 1)} / {pad(total)}
          </span>
          <span className="sr-only">
            Photo {index + 1} of {total}
          </span>
          <span className="lightbox__label" aria-hidden="true">
            {label}
          </span>
        </p>
        <button type="button" className="lightbox__close" onClick={onClose}>
          Close
          <span aria-hidden="true"> ×</span>
        </button>
      </div>

      <figure
        className="lightbox__figure"
        onPointerDown={(event) => {
          swipeFrom.current = event.clientX;
        }}
        onPointerUp={(event) => {
          const from = swipeFrom.current;
          swipeFrom.current = null;
          if (from === null || total < 2) return;
          const dx = event.clientX - from;
          if (Math.abs(dx) >= SWIPE) step(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipeFrom.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={photo.src} className="lightbox__photo" src={photo.src} alt={photo.alt} draggable={false} />
        <figcaption className="lightbox__caption">{photo.alt}</figcaption>
      </figure>

      {total > 1 && (
        <div className="lightbox__nav">
          <button type="button" className="lightbox__step" onClick={() => step(-1)}>
            <span aria-hidden="true">← </span>Prev
            <span className="sr-only"> photo</span>
          </button>
          <ul className="lightbox__rail" aria-label="Choose a photo">
            {photos.map((item, i) => (
              <li key={item.src}>
                <button
                  type="button"
                  className="lightbox__pick"
                  aria-label={`Photo ${i + 1}: ${item.alt}`}
                  aria-current={i === index || undefined}
                  onClick={() => onIndex(i)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.src} alt="" loading="lazy" decoding="async" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="lightbox__step" onClick={() => step(1)}>
            Next<span className="sr-only"> photo</span>
            <span aria-hidden="true"> →</span>
          </button>
        </div>
      )}
    </dialog>
  );
}
