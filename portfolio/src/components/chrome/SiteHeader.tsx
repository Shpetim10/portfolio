"use client";

import NextLink from "next/link";
import { useRef, useState } from "react";
import { isTodo } from "@/content/todo";
import type { Profile } from "@/content/types";
import { gsap, useGSAP } from "@/motion/gsap";
import { useReducedMotion } from "@/motion/hooks/useReducedMotion";
import { EASE, motionTokens } from "@/motion/tokens";
import { Menu, MENU_ID } from "./Menu";
import { Status } from "./Status";

/*
 * T02 · Header — monogram left, live status centre (desktop), MENU right.
 *
 * Motion score
 *   trigger            element    property   from → to       ease     duration  mobile  reduced
 *   scroll down        header     yPercent   0 → -100        machine  small     same    opacity 1 → 0, reduced (200ms)
 *   scroll up / top /  header     yPercent   -100 → 0        machine  small     same    opacity 0 → 1, reduced
 *   focus inside
 *   leave the top      backdrop   opacity    0 → 1           snap     small     same    reduced (CSS)
 *   clock              time text  —          ticks each second                 same    HH:MM, once a minute
 *
 * Mobile (< lg): monogram + MENU only; status moves into the menu footer.
 */

type SiteHeaderProps = {
  name: string;
  availability: Profile["availability"];
  timezone: string;
};

export function SiteHeader({ name, availability, timezone }: SiteHeaderProps) {
  const header = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const prefersReduced = useReducedMotion();

  useGSAP(
    () => {
      const bar = header.current!;
      const { duration } = motionTokens();
      let hidden = false;

      const setHidden = (next: boolean) => {
        if (next === hidden) return;
        hidden = next;
        bar.toggleAttribute("data-hidden", next);
        gsap.to(
          bar,
          prefersReduced
            ? { opacity: next ? 0 : 1, duration: duration.reduced, ease: "none", overwrite: true }
            : { yPercent: next ? -100 : 0, duration: duration.small, ease: EASE.machine, overwrite: true },
        );
      };

      const sync = (scroll: number, direction: number) => {
        const atTop = scroll <= bar.offsetHeight;
        bar.toggleAttribute("data-scrolled", !atTop);
        if (atTop || direction < 0) setHidden(false);
        else if (direction > 0) setHidden(true);
      };

      // Window scroll: native and Lenis (which drives the window) alike; no range to go stale.
      let last = window.scrollY;
      const onScroll = () => {
        const y = window.scrollY;
        sync(y, Math.sign(y - last));
        last = y;
      };
      sync(last, 0);
      window.addEventListener("scroll", onScroll, { passive: true });

      // Keyboard focus landing in a hidden header brings it back.
      const reveal = () => setHidden(false);
      bar.addEventListener("focusin", reveal);
      return () => {
        window.removeEventListener("scroll", onScroll);
        bar.removeEventListener("focusin", reveal);
      };
    },
    { scope: header, dependencies: [prefersReduced], revertOnUpdate: true },
  );

  const status = <Status availability={availability} timezone={timezone} />;

  return (
    <>
      <header ref={header} className="site-header">
        <span className="site-header__backdrop" aria-hidden="true" />
        <div className="site-header__bar">
          <Monogram name={name} />
          <div className="site-header__status">{status}</div>
          <button
            ref={menuButton}
            type="button"
            className="menu-toggle"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={MENU_ID}
            onClick={() => setOpen(true)}
          >
            <span>Menu</span>
            <span className="menu-toggle__glyph" aria-hidden="true" />
          </button>
        </div>
      </header>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        returnFocus={menuButton}
        monogram={<Monogram name={name} />}
        status={status}
      />
    </>
  );
}

/** Up to two initials, from the owner's name. A TODO name renders a marked placeholder. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Monogram({ name }: { name: string }) {
  const missing = isTodo(name);
  return (
    <NextLink href="/" className="monogram" aria-label={missing ? "Home" : `${name} — home`}>
      {missing ? (
        <span className="monogram__todo" data-todo="" title={name}>
          TODO
        </span>
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </NextLink>
  );
}
