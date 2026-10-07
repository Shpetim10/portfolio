"use client";

import NextLink from "next/link";
import { useEffect, useEffectEvent, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link } from "@/components/ui/Link";
import type { Layer } from "@/content/types";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { useLenis } from "@/motion/MotionProvider";
import { EASE, motionTokens } from "@/motion/tokens";
import { LAYER_NAMES, NAV, partNumber } from "./nav";
import { PartOutline } from "./PartOutline";

/*
 * T02 · Menu — full-screen carbon overlay (z overlay), a modal dialog.
 *
 * Motion score
 *   trigger   element              property    from → to        ease     duration   stagger  mobile  reduced
 *   open      panel                yPercent    -100 → 0         machine  medium     —        same    overlay opacity 0 → 1, reduced (200ms)
 *   open      row hairlines        scaleX      0 → 1            machine  medium     items    same    —
 *   open      link labels (REVEAL) yPercent    120 → 0          settle   large      items    same    —
 *   open      part no. · layer     opacity     0 → 1            settle   small      items    same    —
 *   open      top bar, footer,     opacity     0 → 1            settle   medium     —        same    —
 *             part outline
 *   hover/    part outline         opacity     dust ⇄ bone      snap     small      —        hidden  reduced crossfade
 *   focus                                                                                   (< lg)
 *   close     contents             opacity     1 → 0            snap     micro      —        same    overlay opacity 1 → 0, reduced
 *   close     panel                yPercent    0 → -100         machine  medium     —        same    —
 * Longest open: 0.3s offset + 4 × 0.06s stagger + 1.0s = 1.54s (UI cap 1.6s).
 *
 * Modal behaviour: everything else in <body> is inert while open, Tab wraps
 * inside, Esc or CLOSE dismiss and return focus to the MENU button.
 * Choosing a link closes the menu and lets the navigation take focus.
 */

export type CloseReason = "dismiss" | "navigate";

type MenuProps = {
  open: boolean;
  onClose: (reason: CloseReason) => void;
  /** Receives focus back when the menu is dismissed. */
  returnFocus: RefObject<HTMLElement | null>;
  monogram: ReactNode;
  status: ReactNode;
};

export const MENU_ID = "site-menu";

const FOCUSABLE = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Menu({ open, onClose, returnFocus, monogram, status }: MenuProps) {
  const root = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const reason = useRef<CloseReason>("dismiss");
  const inerted = useRef<HTMLElement[]>([]);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const prefersReduced = useReducedMotion();
  const lenis = useLenis();
  const [active, setActive] = useState<Layer | null>(null);

  // Stays rendered through the close animation; hidden (display: none) once it lands.
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setClosing(!open);
    if (open) setActive(null);
  }

  /** Releases the page underneath. Idempotent; runs before navigation so anchors can scroll. */
  const release = () => {
    inerted.current.forEach((node) => (node.inert = false));
    inerted.current = [];
    delete document.documentElement.dataset.menu;
    lenis?.start();
  };

  const close = (why: CloseReason) => {
    reason.current = why;
    if (why === "navigate") release();
    onClose(why);
  };

  useGSAP(
    (_, contextSafe) => {
      const overlay = root.current!;
      const { duration, stagger } = motionTokens();
      const q = (part: string) => overlay.querySelectorAll<HTMLElement>(`[data-part="${part}"]`);
      timeline.current?.kill();

      if (open) {
        // Lock the page: inert siblings, no scroll.
        inerted.current = [...document.body.children].filter(
          (node): node is HTMLElement => node instanceof HTMLElement && node !== overlay && !node.inert,
        );
        inerted.current.forEach((node) => (node.inert = true));
        document.documentElement.dataset.menu = "open";
        lenis?.stop();
        closeButton.current?.focus();

        const tl = gsap.timeline();
        timeline.current = tl;
        if (prefersReduced) {
          tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: duration.reduced, ease: "none" });
        } else {
          gsap.set(overlay, { opacity: 1 });
          gsap.set(q("content"), { opacity: 1 }); // faded by the previous close
          tl.fromTo(
            q("panel"),
            { yPercent: -100 },
            { yPercent: 0, duration: duration.medium, ease: EASE.machine },
          )
            .fromTo(
              q("chrome"),
              { opacity: 0 },
              { opacity: 1, duration: duration.medium, ease: EASE.settle },
              duration.small,
            )
            .fromTo(
              q("row-rule"),
              { scaleX: 0 },
              { scaleX: 1, duration: duration.medium, ease: EASE.machine, stagger: stagger.items },
              duration.small - stagger.items,
            )
            .fromTo(
              q("label"),
              { yPercent: 120 },
              { yPercent: 0, duration: duration.large, ease: EASE.settle, stagger: stagger.items },
              duration.small,
            )
            .fromTo(
              q("meta"),
              { opacity: 0 },
              { opacity: 1, duration: duration.small, ease: EASE.settle, stagger: stagger.items },
              duration.medium,
            );
        }
        return;
      }

      // Closing (skipped on first mount, when there is nothing to close).
      if (!closing) return;
      release();
      if (reason.current === "dismiss") returnFocus.current?.focus({ preventScroll: true });
      reason.current = "dismiss";

      const done = contextSafe!(() => setClosing(false));
      const tl = gsap.timeline({ onComplete: done });
      timeline.current = tl;
      if (prefersReduced) {
        tl.to(overlay, { opacity: 0, duration: duration.reduced, ease: "none" });
      } else {
        tl.to(q("content"), { opacity: 0, duration: duration.micro, ease: EASE.snap }).to(
          q("panel"),
          { yPercent: -100, duration: duration.medium, ease: EASE.machine },
          duration.micro / 2,
        );
      }
    },
    { scope: root, dependencies: [open] },
  );

  // Esc closes; Tab wraps inside the overlay (also catches focus that fell to <body> on a stray click).
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    const overlay = root.current;
    if (!overlay) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close("dismiss");
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = [...overlay.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusables[0];
    const last = focusables.at(-1);
    const current = document.activeElement;
    if (!overlay.contains(current)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    } else if (event.shiftKey && current === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first?.focus();
    }
  });

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={root}
      id={MENU_ID}
      className="menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      hidden={!open && !closing}
      data-state={open ? "open" : closing ? "closing" : "closed"}
    >
      <div className="menu__panel" data-part="panel">
        <div className="menu__bar" data-part="content">
          <div data-part="chrome">{monogram}</div>
          <button ref={closeButton} type="button" className="menu-toggle" onClick={() => close("dismiss")}>
            <span>Close</span>
            <span className="menu-toggle__glyph" data-variant="close" aria-hidden="true" />
          </button>
        </div>

        <div className="menu__body layout-grid" data-part="content">
          <nav aria-label="Primary" className="menu__nav">
            <ol className="menu__list" onPointerLeave={() => setActive(null)}>
              {NAV.map((item) => (
                <li key={item.href} className="menu__row">
                  <span className="menu__row-rule" data-part="row-rule" aria-hidden="true" />
                  <NextLink
                    href={item.href}
                    className="menu__link"
                    onClick={() => close("navigate")}
                    onPointerEnter={() => setActive(item.layer)}
                    onFocus={() => setActive(item.layer)}
                    onBlur={() => setActive(null)}
                  >
                    <span className="menu__part" data-part="meta">
                      {partNumber(item.layer)}
                    </span>
                    <span className="menu__label-mask">
                      <span className="menu__label" data-part="label">
                        {item.label}
                      </span>
                    </span>
                    <span className="menu__layer" data-part="meta">
                      {LAYER_NAMES[item.layer]}
                    </span>
                  </NextLink>
                </li>
              ))}
            </ol>
          </nav>

          <div className="menu__figure" data-part="chrome">
            <PartOutline active={active} />
          </div>
        </div>

        <div className="menu__footer layout-grid" data-part="content">
          <div className="menu__footer-inner" data-part="chrome">
            <Link href="/resume/" onClick={() => close("navigate")} className="menu__resume">
              Résumé
            </Link>
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
