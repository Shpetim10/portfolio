import { Content } from "@/components/ui/Content";
import { cx } from "@/components/ui/cx";
import { todo } from "@/content/todo";
import type { AwardCategory, Link as ProofLinkData } from "@/content/types";
import { CATEGORIES } from "./categories";

/*
 * The marks every entry in the qualification record carries: its category
 * stamp and its proof link. Shared by the featured certificate (server) and
 * the record's cards (client), so both stay plain, hook-free components.
 */

/**
 * The category stamp: a double-ruled box with the category code and entry
 * number, "CRT · 02". Read out as "Certification, entry 02". Only the visible
 * code decodes (ANNOTATE).
 */
export function Stamp({
  category,
  entry,
  className,
}: {
  category: AwardCategory;
  entry: string;
  className?: string;
}) {
  const { label, code } = CATEGORIES[category];
  return (
    <span className={cx("stamp", className)} data-awards="stamp">
      <span aria-hidden="true">
        <span className="stamp__code" data-awards="decode">
          {code} · {entry}
        </span>
        <span className="stamp__name">{label}</span>
      </span>
      <span className="sr-only">
        {label}, entry {entry}
      </span>
    </span>
  );
}

/**
 * "VERIFY →" — the proof, in a new tab (rel="noopener noreferrer"), with the
 * proof's own label beside it. Its accessible name says what it verifies.
 *
 * An award with a digital badge shows it as a dial: the badge inside a ring of
 * tick marks that steps one tick on hover / focus. The dial links to the same
 * proof, so it is a pointer-only duplicate of the VERIFY link (out of the tab
 * order and the accessibility tree); the badge's alt text is read in the link.
 */
export function Proof({
  proof,
  title,
  badge,
  className,
}: {
  proof: ProofLinkData;
  title: string;
  badge?: { src: string; alt: string };
  className?: string;
}) {
  const link = (
    <p className={cx("proof", !badge && className)}>
      <a className="link proof__link" href={proof.href} target="_blank" rel="noopener noreferrer">
        Verify
        <span className="proof__arrow" aria-hidden="true">
          {" "}
          →
        </span>
        <span className="sr-only">
          {" "}
          {title}: {proof.label}
          {badge ? `, ${badge.alt}` : ""} (opens in a new tab)
        </span>
      </a>
      <span className="proof__source" aria-hidden="true">
        {proof.label}
      </span>
    </p>
  );
  if (!badge) return link;

  return (
    <div className={cx("proof-badge", className)} data-awards="badge">
      <a
        className="badge"
        href={proof.href}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
      >
        <svg className="badge__dial" viewBox="0 0 100 100" focusable="false">
          <circle className="badge__rim" cx="50" cy="50" r="48" />
          <g className="badge__ticks">
            {Array.from({ length: 24 }, (_, i) => (
              <line
                key={i}
                x1="50"
                y1="2"
                x2="50"
                y2={i % 6 === 0 ? 10 : 6}
                transform={`rotate(${i * 15} 50 50)`}
              />
            ))}
          </g>
        </svg>
        {/* Pre-optimised at build; next/image needs a server. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="badge__image" src={badge.src} alt="" loading="lazy" decoding="async" />
      </a>
      {link}
    </div>
  );
}

/** A year, or a marked placeholder while it is the numeric TODO (0). */
export function Year({ year, className }: { year: number; className?: string }) {
  return year === 0 ? (
    <Content value={todo("Year")} className={className} />
  ) : (
    <span className={className}>{year}</span>
  );
}
