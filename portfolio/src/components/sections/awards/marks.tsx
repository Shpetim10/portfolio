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
 */
export function Proof({
  proof,
  title,
  className,
}: {
  proof: ProofLinkData;
  title: string;
  className?: string;
}) {
  return (
    <p className={cx("proof", className)}>
      <a className="link proof__link" href={proof.href} target="_blank" rel="noopener noreferrer">
        Verify
        <span className="proof__arrow" aria-hidden="true">
          {" "}
          →
        </span>
        <span className="sr-only">
          {" "}
          {title}: {proof.label} (opens in a new tab)
        </span>
      </a>
      <span className="proof__source" aria-hidden="true">
        {proof.label}
      </span>
    </p>
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
