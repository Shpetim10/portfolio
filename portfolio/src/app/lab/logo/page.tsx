import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { Fragment, type CSSProperties } from "react";
import { Logo, type LogoProps } from "@/components/brand/Logo";
import { cx } from "@/components/ui/cx";
import { Link } from "@/components/ui/Link";
import { getProfile, isTodo } from "@/content";
import { Replay } from "../Replay";
import { DrawSpecimen } from "./DrawSpecimen";

export const metadata: Metadata = {
  title: "Lab · Logo",
  robots: { index: false, follow: false },
};

/*
 * BRAND-01 · Sh² bench. "Kept" shows the shipped <Logo> (variant C, built
 * by `pnpm brand`) in each form and tone, and replays the header's first-load
 * draw. Below it, the three options as drawn for the choice: each is read from
 * assets-src/brand/options at build (`pnpm brand:options`) and inlined, so the
 * S and h take currentColor and the exponent square takes --signal: signal
 * orange for "color", currentColor for "mono".
 */

const KEPT: { variant: NonNullable<LogoProps["variant"]>; sizes: string[] }[] = [
  { variant: "mark", sizes: ["16px", "32px", "64px"] },
  { variant: "wordmark", sizes: ["16px", "32px"] },
  { variant: "lockup", sizes: ["20px", "40px"] },
];

const VARIANTS = [
  {
    id: "a",
    name: "A · Ligature",
    note: "Stroke 2.5. The arc's 3 o'clock end runs straight up as the ascender.",
  },
  { id: "b", name: "B · Ligature, bold", note: "Stroke 3, exponent square 4 (A's is 3.5)." },
  { id: "c", name: "C · Separate", note: "Stroke 2.5. S and h stand 1.5 units apart." },
] as const;

const SIZES = [16, 24, 32, 64] as const;
const LARGE = 512;
const SURFACES = [
  { id: "carbon", label: "On carbon", className: "bg-carbon text-bone" },
  { id: "paper", label: "On paper", className: "bg-paper text-ink" },
] as const;
const TONES = ["color", "mono"] as const;

/** The option's drawing without its <svg> wrapper and <title>: specimens are decorative. */
const drawing = (id: string) =>
  readFileSync(join(process.cwd(), `assets-src/brand/options/sh2-${id}.svg`), "utf8")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>/, "");

function Mark({ markup, size, square = false }: { markup: string; size: number; square?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="logo-lab__mark"
      // The favicon tile: the 32 × 24 mark centred in 32 × 32.
      viewBox={square ? "0 -4 32 32" : "0 0 32 24"}
      style={{ "--mark-height": `${size}px` } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

/** Scaled down to the column on narrow screens; the label keeps the drawn size. */
function Ruler({ size }: { size: number }) {
  return <p className="font-mono text-micro uppercase opacity-70">{size} px</p>;
}

export default function LogoLabPage() {
  const profile = getProfile();
  const tabTitle = isTodo(profile.name) ? "Portfolio" : profile.name;
  const marks = Object.fromEntries(VARIANTS.map(({ id }) => [id, drawing(id)]));

  return (
    <>
      <header className="layout-grid gap-y-6 pt-24 pb-12">
        <p className="col-span-full font-mono text-label text-dust uppercase">BRAND-01 · Sh² logo system</p>
        <h1 className="col-span-full font-display text-display-l font-black uppercase">Logo</h1>
        <p className="col-span-full max-w-measure text-body-l md:col-span-6">
          Three drawings of the Sh² mark on the 32 × 24 grid, at 16, 24, 32, 64 and 512 px tall, on carbon and
          on paper, in color and mono. Redraw them with{" "}
          <code className="font-mono text-small">pnpm brand:options</code>.
        </p>
        <nav
          aria-label="Variants"
          className="col-span-full flex flex-wrap gap-x-6 gap-y-3 font-mono text-label uppercase"
        >
          <Link href="/lab/">← Lab</Link>
          <Link href="#kept">Kept · C</Link>
          {VARIANTS.map(({ id, name }) => (
            <Link key={id} href={`#variant-${id}`}>
              {name}
            </Link>
          ))}
          <Link href="#favicon">Favicon</Link>
        </nav>
      </header>

      <section id="kept" aria-labelledby="kept-title" className="logo-lab__variant">
        <div className="layout-grid gap-y-3 pb-6">
          <h2 id="kept-title" className="col-span-full font-display text-display-m font-black uppercase">
            Kept · C
          </h2>
          <p className="col-span-full max-w-measure text-body text-dust">
            The shipped component: mark, wordmark and lockup, in color and mono, then the header&rsquo;s
            first-load draw (static under reduced motion).
          </p>
        </div>
        <div className="logo-lab__surfaces">
          {SURFACES.map((surface) => (
            <div
              key={surface.id}
              className={cx("logo-lab__surface", surface.className)}
              data-surface={surface.id}
            >
              <p className="font-mono text-label uppercase">{surface.label}</p>
              {TONES.map((tone) => (
                <div key={tone} className="logo-lab__row" data-mark-tone={tone}>
                  <p className="logo-lab__tone font-mono text-micro uppercase">{tone}</p>
                  {KEPT.flatMap(({ variant, sizes }) =>
                    sizes.map((size) => (
                      <figure key={`${variant}-${size}`} className="logo-lab__specimen" data-kept={variant}>
                        <Logo variant={variant} tone={tone} size={size} />
                        <p className="font-mono text-micro uppercase opacity-70">
                          {variant} · {size}
                        </p>
                      </figure>
                    )),
                  )}
                </div>
              ))}
            </div>
          ))}
          <div className="logo-lab__surface bg-carbon text-bone">
            <p className="font-mono text-label uppercase">Header draw · 0.96s</p>
            <Replay label="draw">
              <DrawSpecimen size="var(--lab-draw-size)" />
            </Replay>
          </div>
        </div>
      </section>

      {VARIANTS.map(({ id, name, note }) => (
        <section
          key={id}
          id={`variant-${id}`}
          aria-labelledby={`variant-${id}-title`}
          className="logo-lab__variant"
        >
          <div className="layout-grid gap-y-3 pb-6">
            <h2
              id={`variant-${id}-title`}
              className="col-span-full font-display text-display-m font-black uppercase"
            >
              {name}
            </h2>
            <p className="col-span-full max-w-measure text-body text-dust">{note}</p>
          </div>
          <div className="logo-lab__surfaces">
            {SURFACES.map((surface) => (
              <div
                key={surface.id}
                className={cx("logo-lab__surface", surface.className)}
                data-surface={surface.id}
              >
                <p className="font-mono text-label uppercase">{surface.label}</p>
                {TONES.map((tone) => (
                  <div key={tone} className="logo-lab__row" data-mark-tone={tone}>
                    <p className="logo-lab__tone font-mono text-micro uppercase">{tone}</p>
                    {SIZES.map((size) => (
                      <figure key={size} className="logo-lab__specimen" data-size={size}>
                        <Mark markup={marks[id]} size={size} />
                        <Ruler size={size} />
                      </figure>
                    ))}
                  </div>
                ))}
                <div className="logo-lab__large">
                  {TONES.map((tone) => (
                    <figure key={tone} className="logo-lab__specimen" data-mark-tone={tone} data-size={LARGE}>
                      <Mark markup={marks[id]} size={LARGE} />
                      <Ruler size={LARGE} />
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section id="favicon" aria-labelledby="favicon-title" className="logo-lab__variant">
        <div className="layout-grid gap-y-3 pb-6">
          <h2 id="favicon-title" className="col-span-full font-display text-display-m font-black uppercase">
            Favicon
          </h2>
          <p className="col-span-full max-w-measure text-body text-dust">
            Each mark centred in a 32 × 32 carbon tile, the shape mark-square.svg will take, at the 16 px a
            tab draws it. The tile keeps one drawing legible on light and dark browser chrome alike.
          </p>
        </div>
        <div className="logo-lab__surfaces" data-pair="">
          {(["dark", "light"] as const).map((chrome) => (
            <div key={chrome} className="logo-lab__browser" data-chrome={chrome}>
              <p className="font-mono text-label uppercase">{chrome} browser</p>
              <ul className="logo-lab__tabs" aria-label={`Tabs, ${chrome} browser`}>
                {VARIANTS.map(({ id, name }, index) => (
                  <li key={id} className="logo-lab__tab" data-active={index === 0 ? "" : undefined}>
                    <span className="logo-lab__favicon" data-mark-tone="color">
                      <Mark markup={marks[id]} size={16} square />
                    </span>
                    <span className="logo-lab__tab-title">{tabTitle}</span>
                    <span className="logo-lab__tab-variant font-mono text-micro uppercase">
                      {name.slice(0, 1)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="logo-lab__address font-mono text-micro">localhost:3100</div>
              <div className="logo-lab__retina">
                {VARIANTS.map(({ id, name }) => (
                  <Fragment key={id}>
                    <span className="logo-lab__favicon" data-mark-tone="color">
                      <Mark markup={marks[id]} size={32} square />
                    </span>
                    <p className="font-mono text-micro uppercase">{name.slice(0, 1)} · 32 px (2×)</p>
                  </Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
