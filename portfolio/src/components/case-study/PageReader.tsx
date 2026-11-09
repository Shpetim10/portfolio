"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { Media } from "@/content/types";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

/*
 * Page reader: a full-page screenshot (thousands of pixels tall) shown as a
 * scrolling window instead of a figure the page has to scroll past.
 *
 *   window     the real screenshot, scrolled natively (wheel, touch, keys); phones
 *              pan sideways rather than shrink the page to nothing.
 *   meter      a readout and a hairline along the title bar track how far in you are.
 *   minimap    from 48rem, the whole page as a thumbnail with the viewport marked;
 *              click or drag it to seek.
 *   jump chips named points on the page ("Abstention check"): one press goes there.
 *              The chip for where you are is marked.
 *   full screen a modal reader wide enough to read the small type. Opens where you
 *              were and hands the position back on close.
 *
 * The scroller is a focusable region, so the keyboard needs nothing extra
 * (arrows, Space, PgUp / PgDn, Home / End). Smooth jumps drop to instant under
 * reduced motion. Everything that tracks scroll writes straight to the DOM
 * (transforms and text) rather than through React state.
 */

export type Stop = { at: number; label: string };

type ReaderProps = {
  media: Media;
  label: string;
  stops: Stop[];
  mode: "inline" | "full";
  /** Top of the viewport as a fraction of the page: shared so the two readers stay in step. */
  placeRef: { current: number };
  onExpand?: () => void;
  onClose?: () => void;
  expandRef?: { current: HTMLButtonElement | null };
};

/** Pages are drawn in the middle of wide margins: where a window is narrower than the page, start on the page. */
const centre = (el: HTMLElement) => {
  el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
};

const pad = (n: number, width = 2) => String(n).padStart(width, "0");
const clamp = (n: number) => Math.min(1, Math.max(0, n));

function Reader({ media, label, stops, mode, placeRef, onExpand, onClose, expandRef }: ReaderProps) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const map = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const readout = useRef<HTMLSpanElement>(null);
  const meter = useRef<HTMLSpanElement>(null);
  const current = useRef(0);
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();

  // Everything that follows the scroll position, in one place.
  const sync = () => {
    const el = scroller.current;
    if (!el || el.scrollHeight === 0) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const max = scrollHeight - clientHeight;
    const progress = max > 0 ? clamp(scrollTop / max) : 0;
    placeRef.current = scrollTop / scrollHeight;

    if (readout.current) readout.current.textContent = `${pad(Math.round(progress * 100), 3)}%`;
    if (meter.current) meter.current.style.transform = `scaleX(${progress})`;
    if (root.current) {
      if (scrollTop > 8) root.current.dataset.scrolled = "";
      else delete root.current.dataset.scrolled;
      // A page that fits its window both ways has nothing to read by scrolling.
      if (max <= 1 && el.scrollWidth <= el.clientWidth + 1) root.current.dataset.static = "";
      else delete root.current.dataset.static;
    }
    if (map.current && thumb.current) {
      const height = map.current.clientHeight;
      thumb.current.style.height = `${(clientHeight / scrollHeight) * height}px`;
      thumb.current.style.transform = `translateY(${(scrollTop / scrollHeight) * height}px)`;
    }

    // The chip for the last point passed; the bottom of the page always counts as the last.
    const probe = (scrollTop + clientHeight * 0.25) / scrollHeight;
    let index = 0;
    stops.forEach((stop, i) => {
      if (stop.at <= probe) index = i;
    });
    if (progress >= 0.995 && stops.length > 0) index = stops.length - 1;
    if (index !== current.current) {
      current.current = index;
      setActive(index);
    }
  };

  // The window's size is not known until it is laid out (and a modal's is zero until it opens).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    if (map.current) observer.observe(map.current);
    centre(el);
    sync();
    return () => observer.disconnect();
    // `sync` reads refs and props that never change for this reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = (at: number) => {
    const el = scroller.current;
    el?.scrollTo({ top: at * el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  };

  // The minimap: the pointer's height on the thumbnail is a place on the page, centred in the window.
  const seek = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = scroller.current;
    const rail = map.current;
    if (!el || !rail) return;
    const box = rail.getBoundingClientRect();
    const at = clamp((event.clientY - box.top) / box.height);
    el.scrollTop = at * el.scrollHeight - el.clientHeight / 2;
  };

  const full = mode === "full";

  return (
    <div className="reader" data-mode={mode} ref={root}>
      <div className="reader__bar">
        <p className="reader__title">
          <span className="reader__kind" aria-hidden="true">
            Full page ·{" "}
          </span>
          {label}
        </p>
        <span className="reader__readout" ref={readout} aria-hidden="true">
          000%
        </span>
        {full ? (
          <button type="button" className="reader__action" onClick={onClose}>
            Close
            <span aria-hidden="true"> ×</span>
          </button>
        ) : (
          <button
            type="button"
            className="reader__action"
            aria-haspopup="dialog"
            onClick={onExpand}
            ref={expandRef}
          >
            Full screen
            <span aria-hidden="true"> ⤢</span>
            <span className="sr-only"> view of {label}</span>
          </button>
        )}
        <span className="reader__meter" ref={meter} aria-hidden="true" />
      </div>

      <div className="reader__body">
        <div
          className="reader__scroller"
          ref={scroller}
          role="region"
          tabIndex={0}
          aria-label={`${label}, a full-page screenshot. Scroll to read it.`}
          data-lenis-prevent
          onScroll={sync}
        >
          {/* Pre-optimised at build; next/image needs a server. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="reader__page"
            src={media.src}
            alt={media.alt}
            width={media.width}
            height={media.height}
            loading={full ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
          />
        </div>

        <div
          className="reader__rail"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seek(event);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) seek(event);
          }}
        >
          <div
            className="reader__map"
            ref={map}
            style={{ "--page-ratio": `${media.width} / ${media.height}` } as CSSProperties}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.src} alt="" loading="lazy" decoding="async" draggable={false} />
            {stops.map((stop, i) => (
              <span
                key={stop.label}
                className="reader__tick"
                style={{ top: `${stop.at * 100}%` }}
                data-active={i === active ? "" : undefined}
              />
            ))}
            <span className="reader__thumb" ref={thumb} />
          </div>
        </div>

        <p className="reader__hint" aria-hidden="true">
          <span className="reader__hint-narrow">Swipe to explore</span>
          <span className="reader__hint-wide">Scroll to read ↓</span>
        </p>
      </div>

      {stops.length > 0 && (
        <ol className="reader__stops" aria-label="Jump to">
          {stops.map((stop, i) => (
            <li key={stop.label}>
              <button
                type="button"
                className="reader__stop"
                aria-current={i === active ? "true" : undefined}
                onClick={() => jump(stop.at)}
              >
                <span className="reader__stop-number" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                {stop.label}
              </button>
            </li>
          ))}
        </ol>
      )}

      {full && (
        <p className="reader__keys" aria-hidden="true">
          ↑ ↓ PgUp PgDn Home End to move · Esc to close
        </p>
      )}
    </div>
  );
}

/* Full screen: a modal <dialog>, so focus is trapped, the page behind is inert, Esc closes it and
 * focus goes back to the button that opened it. Same pattern as the photo lightbox. */

function FullScreen({
  media,
  label,
  stops,
  placeRef,
  onClose,
}: {
  media: Media;
  label: string;
  stops: Stop[];
  placeRef: { current: number };
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // Guarded because Strict Mode runs this effect twice in development.
    if (!element.open) element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Open where the inline reader was, and put the keyboard in the page.
    const scroller = element.querySelector<HTMLElement>(".reader__scroller");
    if (scroller) {
      scroller.scrollTop = placeRef.current * scroller.scrollHeight;
      centre(scroller);
      scroller.focus({ preventScroll: true });
    }
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [placeRef]);

  return (
    <dialog
      ref={dialog}
      className="reader-dialog"
      aria-label={`${label}, full screen`}
      data-lenis-prevent
      onClose={onClose}
    >
      <Reader media={media} label={label} stops={stops} mode="full" placeRef={placeRef} onClose={onClose} />
    </dialog>
  );
}

export function PageReader({ media, label, stops }: { media: Media; label: string; stops: Stop[] }) {
  const [open, setOpen] = useState(false);
  const placeRef = useRef(0);
  const inline = useRef<HTMLDivElement>(null);
  const expand = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    // Hand the position back to the inline reader, and the focus to the button.
    const scroller = inline.current?.querySelector<HTMLElement>(".reader__scroller");
    if (scroller) scroller.scrollTop = placeRef.current * scroller.scrollHeight;
    expand.current?.focus({ preventScroll: true });
  };

  return (
    <div ref={inline}>
      <Reader
        media={media}
        label={label}
        stops={stops}
        mode="inline"
        placeRef={placeRef}
        onExpand={() => setOpen(true)}
        expandRef={expand}
      />
      {open &&
        createPortal(
          <FullScreen media={media} label={label} stops={stops} placeRef={placeRef} onClose={close} />,
          document.body,
        )}
    </div>
  );
}
