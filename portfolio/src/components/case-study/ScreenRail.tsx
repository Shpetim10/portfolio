"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";

/*
 * The sliding strip of <Screens>: a native horizontal scroller (touch, trackpad,
 * keyboard arrows all work) with previous / next buttons for mouse users.
 * Scrolling is the browser's own, so nothing here animates layout; the buttons
 * step by most of a window and jump instantly under reduced motion.
 */

const STEP = 0.8; // of the visible width

export function ScreenRail({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  const id = useId();
  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const sync = () => {
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, []);

  const step = (direction: 1 | -1) => {
    const el = rail.current;
    el?.scrollBy({ left: direction * el.clientWidth * STEP, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="screens__box">
      <div className="screens__bar">
        <h3 id={id} className="screens__title">
          {title}
        </h3>
        <span className="screens__count">{count} screens</span>
        <button
          type="button"
          className="screens__step"
          onClick={() => step(-1)}
          disabled={atStart}
          aria-label={`Previous screens of ${title}`}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          type="button"
          className="screens__step"
          onClick={() => step(1)}
          disabled={atEnd}
          aria-label={`Next screens of ${title}`}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <div
        ref={rail}
        className="screens__rail"
        role="region"
        aria-labelledby={id}
        tabIndex={0}
        data-lenis-prevent
      >
        <ul className="screens__list">{children}</ul>
      </div>
    </div>
  );
}
