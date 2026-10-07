import type { Metadata } from "next";
import type { ReactNode } from "react";
import { todo } from "@/content/todo";
import {
  DimensionLine,
  LeaderLine,
  PartLabel,
  RegistrationMark,
  SectionIndex,
} from "@/components/ui/Annotation";
import { Button } from "@/components/ui/Button";
import { Counter } from "@/components/ui/Counter";
import { Link } from "@/components/ui/Link";
import { SectionShell } from "@/components/ui/SectionShell";
import { Tag } from "@/components/ui/Tag";
import { CursorTargets, MotionScore } from "./MotionSpecimens";
import { Replay } from "./Replay";
import { Magnetic } from "@/motion/Magnetic";
import { Annotate } from "@/motion/signatures/annotate";
import { Calibrate } from "@/motion/signatures/calibrate";
import { Invert } from "@/motion/signatures/invert";
import { Reveal } from "@/motion/signatures/reveal";

export const metadata: Metadata = {
  title: "Lab",
  robots: { index: false, follow: false },
};

/*
 * Primitive + motion specimen sheet. Every value shown is a fact about the
 * design system itself (breakpoints, tokens, layer names) — nothing here is
 * about the owner. Hover / focus / active are forced with data-preview so each
 * state is visible at once; the live components respond to real input as usual.
 * Sections 01–06 are static (the no-JS / reduced state of every primitive);
 * 07–13 run the motion kit from src/motion.
 */

const STATES = [
  { label: "Default", preview: undefined },
  { label: "Hover", preview: "hover" },
  { label: "Focus", preview: "focus" },
  { label: "Active", preview: "active" },
] as const;

const LAYERS = ["Interface", "API", "Services", "Data", "Infrastructure"] as const;

const SPECIMENS = [
  ["P0-02 · Primitives", ["Button", "Link", "Tag", "Counter", "Annotation", "Section shell"]],
  ["P0-03 · Motion", ["Motion score", "Reveal", "Annotate", "Calibrate", "Invert", "Magnetic", "Cursor"]],
] as const;

const slug = (name: string) => name.toLowerCase().replace(" ", "-");

function Specimen({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={className}>
      <div className="flex min-h-24 items-center border border-hairline bg-graphite p-6">{children}</div>
      <figcaption className="mt-2 font-mono text-micro text-dust uppercase">{label}</figcaption>
    </figure>
  );
}

function SpecimenHeading({ children }: { children: ReactNode }) {
  return <h2 className="col-span-full font-display text-display-m font-black uppercase">{children}</h2>;
}

function RowLabel({ children }: { children: ReactNode }) {
  return <h3 className="col-span-full mt-12 font-mono text-label text-dust uppercase">{children}</h3>;
}

/** Five plates of the Instrument; each leader's dot sits on its plate's right edge. */
function Assembly() {
  return (
    <ol className="flex w-8 flex-col gap-12 md:w-1/3">
      {LAYERS.map((layer, i) => (
        <li key={layer} className="relative h-3 border border-hairline bg-gunmetal">
          <LeaderLine className="absolute bottom-1/2 left-full">
            <PartLabel number={`P/N 0${i + 1}`} name={layer} />
          </LeaderLine>
        </li>
      ))}
    </ol>
  );
}

/** A dimension line whose value is the column count it actually spans at each breakpoint. */
function GridDimension({
  span,
  cols,
}: {
  span: string;
  cols: [mobile: number, tablet: number, desktop: number];
}) {
  const [mobile, tablet, desktop] = cols;
  return (
    <div className={span}>
      <DimensionLine value={`${mobile} col`} className="md:hidden" />
      <DimensionLine value={`${tablet} col`} className="hidden md:flex lg:hidden" />
      <DimensionLine value={`${desktop} col`} className="hidden lg:flex" />
    </div>
  );
}

export default function LabPage() {
  return (
    <>
      <header className="layout-grid gap-y-6 pt-24 pb-12">
        <p className="col-span-full font-mono text-label text-dust uppercase">
          P0-02 · Primitives / P0-03 · Motion
        </p>
        <h1 className="col-span-full font-display text-display-l font-black uppercase">Lab</h1>
        <p className="col-span-full max-w-measure text-body-l md:col-span-6">
          Specimen sheet for the primitive and motion layers. States are pinned so they read side by side;
          every value on this sheet is a design-system fact.
        </p>
        <nav aria-label="Specimens" className="col-span-full flex flex-col gap-4">
          {SPECIMENS.map(([group, names]) => (
            <div key={group} className="flex flex-col gap-3 md:flex-row md:gap-6">
              <p className="font-mono text-micro text-dust uppercase md:w-48">{group}</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-3 font-mono text-label uppercase">
                {names.map((name) => (
                  <li key={name}>
                    <Link href={`#${slug(name)}`}>{name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="font-mono text-label uppercase">
            <Link href="/">← Index</Link>
          </p>
        </nav>
      </header>

      <SectionShell id="button" index={1} title="Button" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Button</SpecimenHeading>
        {(["primary", "secondary"] as const).map((variant) => (
          <div key={variant} className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <RowLabel>{variant}</RowLabel>
            {STATES.map(({ label, preview }) => (
              <Specimen key={label} label={label}>
                <Button variant={variant} data-preview={preview} tabIndex={preview ? -1 : undefined}>
                  Get in touch
                </Button>
              </Specimen>
            ))}
            <Specimen label="Disabled">
              <Button variant={variant} disabled>
                Get in touch
              </Button>
            </Specimen>
          </div>
        ))}
        <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <RowLabel>Content extremes</RowLabel>
          <Specimen label="As link · internal">
            <Button href="/resume/">Resume</Button>
          </Specimen>
          <Specimen label="Long label · wraps, keeps 48px minimum">
            <Button variant="secondary" href="#annotation">
              Read the full case study on the architecture
            </Button>
          </Specimen>
          <Specimen label="No arrow">
            <Button arrow={false}>Send</Button>
          </Specimen>
        </div>
      </SectionShell>

      <SectionShell id="link" index={2} title="Link" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Link</SpecimenHeading>
        <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATES.slice(0, 3).map(({ label, preview }) => (
            <Specimen key={label} label={label}>
              <Link href="#link" data-preview={preview} tabIndex={preview ? -1 : undefined}>
                View project
              </Link>
            </Specimen>
          ))}
          <Specimen label="External · new tab">
            <Link href="https://nextjs.org/docs" target="_blank">
              Next.js docs
            </Link>
          </Specimen>
        </div>
        <p className="col-span-full max-w-measure md:col-span-6">
          Links read as links at rest: a dust rule sits under every label. On hover or focus a bone rule draws
          over it from the left; with reduced motion it fades in instead. Try the{" "}
          <Link href="#tag">next specimen</Link>.
        </p>
      </SectionShell>

      <SectionShell id="tag" index={3} title="Tag" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Tag</SpecimenHeading>
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-2">
          <Specimen label="Set · Instrument layers">
            <ul className="flex flex-wrap gap-2">
              {LAYERS.map((layer) => (
                <Tag key={layer} as="li">
                  {layer}
                </Tag>
              ))}
            </ul>
          </Specimen>
          <Specimen label="Single">
            <Tag>Interface</Tag>
          </Specimen>
        </div>
      </SectionShell>

      <SectionShell id="counter" index={4} title="Counter" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Counter</SpecimenHeading>
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-3">
          <Specimen label="Size m · integer">
            <Counter value={12} suffix="col" label="Grid columns at ≥ 1024 px" />
          </Specimen>
          <Specimen label="Size m · decimals">
            <Counter value={1.6} suffix="s" label="Longest UI animation" />
          </Specimen>
          <Specimen label="Size m · grouping">
            <Counter value={1440} suffix="px" label="XL breakpoint" />
          </Specimen>
        </div>
        <div className="col-span-full grid grid-cols-1 gap-6">
          <Specimen label="Size l">
            <Counter value={0.82} size="l" label="Display XL line height" />
          </Specimen>
          <Specimen label="Size xl">
            <Counter value={1920} size="xl" suffix="px" label="2XL breakpoint" />
          </Specimen>
        </div>
      </SectionShell>

      <SectionShell id="annotation" index={5} title="Annotation" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Annotation</SpecimenHeading>

        <RowLabel>Assembly · leader lines + part labels</RowLabel>
        <figure className="col-span-full">
          <div className="border border-hairline bg-graphite px-4 py-16 md:px-12">
            <Assembly />
          </div>
          <figcaption className="mt-2 font-mono text-micro text-dust uppercase">
            45° leg holds at every width · 1px lines · 5 annotations (max 6 per viewport)
          </figcaption>
        </figure>

        <RowLabel>Leader directions</RowLabel>
        <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(["up-right", "up-left", "down-right", "down-left"] as const).map((direction) => (
            <Specimen key={direction} label={direction}>
              <LeaderLine direction={direction} className="w-full">
                <PartLabel number="P/N 03" name="Services" />
              </LeaderLine>
            </Specimen>
          ))}
        </div>

        <RowLabel>Dimension lines</RowLabel>
        <GridDimension span="col-span-full" cols={[4, 8, 12]} />
        <GridDimension span="col-span-2 md:col-span-4 lg:col-span-6" cols={[2, 4, 6]} />
        <GridDimension span="col-span-1 md:col-span-2 lg:col-span-3" cols={[1, 2, 3]} />
        <div className="col-span-full md:col-span-4">
          <DimensionLine value={todo("years building production systems")} />
        </div>

        <RowLabel>Part labels</RowLabel>
        <ul className="col-span-full flex flex-col gap-3">
          {LAYERS.map((layer, i) => (
            <li key={layer}>
              <PartLabel number={`P/N 0${i + 1}`} name={layer} />
            </li>
          ))}
        </ul>

        <RowLabel>Registration marks</RowLabel>
        <div className="col-span-full grid grid-cols-1 gap-6 md:grid-cols-2">
          <Specimen label="Single · 12px · dust 40%">
            <RegistrationMark />
          </Specimen>
          <Specimen label="Pinned to corners">
            <div className="relative h-24 w-full">
              {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => (
                <RegistrationMark key={corner} corner={corner} />
              ))}
            </div>
          </Specimen>
        </div>

        <RowLabel>Section index</RowLabel>
        <div className="col-span-full flex flex-col gap-6">
          <SectionIndex index={3} title="Work" rev="REV.26" />
          <SectionIndex index={7} title="Awards & recognition" rev="REV.26" />
          <SectionIndex index={12} title="Contact" />
        </div>
      </SectionShell>

      <SectionShell
        id="section-shell"
        index={6}
        title="Section shell"
        rev="REV.26"
        contentClassName="gap-y-6"
      >
        <SpecimenHeading>Section shell</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          Every section on this sheet is a SectionShell: registration marks pinned to its four corners, the
          section index across the top, section padding (clamp 96 → 224px) above and below, and a 4 / 8 / 12
          column grid inside.
        </p>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            aria-hidden="true"
            className={`h-12 border border-hairline bg-graphite ${i >= 8 ? "hidden lg:block" : i >= 4 ? "hidden md:block" : ""}`}
          />
        ))}
      </SectionShell>
      <SectionShell id="motion-score" index={7} title="Motion score" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Motion score</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          The signature motions and pointer layer, as built in src/motion. Every value is a motion token from
          the design system. Each specimen below plays once as it scrolls into view; Replay remounts it.
        </p>
        <MotionScore />
      </SectionShell>

      <SectionShell id="reveal" index={8} title="Reveal" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Reveal</SpecimenHeading>
        <RowLabel>Display L · masked lines · settle 1000ms · 80ms line stagger</RowLabel>
        <Replay label="reveal">
          <Reveal as="p" className="col-span-full font-display text-display-l font-black uppercase">
            Interface API Services Data Infrastructure
          </Reveal>
        </Replay>
      </SectionShell>

      <SectionShell id="annotate" index={9} title="Annotate" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Annotate</SpecimenHeading>
        <RowLabel>Line draws 320ms · dot lands · label decodes ≤ 400ms · 60ms per leader</RowLabel>
        <Replay label="annotate">
          <Annotate className="col-span-full border border-hairline bg-graphite px-4 py-16 md:px-12">
            <Assembly />
          </Annotate>
        </Replay>
      </SectionShell>

      <SectionShell id="calibrate" index={10} title="Calibrate" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Calibrate</SpecimenHeading>
        <RowLabel>Count + dimension extend · settle 1000ms · starts 60% in view</RowLabel>
        <Replay label="calibrate">
          <Calibrate className="col-span-full grid grid-cols-1 gap-12">
            <div>
              <Counter value={4} suffix="col" label="Grid columns at this width" className="md:hidden" />
              <Counter
                value={8}
                suffix="col"
                label="Grid columns at this width"
                className="hidden md:inline-flex lg:hidden"
              />
              <Counter
                value={12}
                suffix="col"
                label="Grid columns at this width"
                className="hidden lg:inline-flex"
              />
            </div>
            <GridDimension span="w-full" cols={[4, 8, 12]} />
          </Calibrate>
        </Replay>
        <RowLabel>Count only · decimals keep their places</RowLabel>
        <Replay label="decimal count">
          <Calibrate className="col-span-full">
            <Counter value={1.6} size="l" suffix="s" label="Longest UI animation" />
          </Calibrate>
        </Replay>
      </SectionShell>

      <Replay label="invert" className="px-(--grid-margin) pt-6">
        <Invert>
          <SectionShell id="invert" index={11} title="Invert" rev="REV.26" contentClassName="gap-y-6">
            <SpecimenHeading>Invert</SpecimenHeading>
            <p className="col-span-full max-w-measure md:col-span-6">
              A full-section wipe from carbon to paper on machine easing, 1000ms, once the section top reaches
              60% of the viewport. Inside, the surface tokens remap so every primitive reads as ink on paper.
            </p>
            <ul className="col-span-full flex flex-wrap gap-2">
              {LAYERS.map((layer) => (
                <Tag key={layer} as="li">
                  {layer}
                </Tag>
              ))}
            </ul>
            <div className="col-span-full flex flex-wrap gap-6">
              <Button href="#magnetic">Next specimen</Button>
              <Button variant="secondary" href="#calibrate" arrow={false}>
                Previous
              </Button>
            </div>
          </SectionShell>
        </Invert>
      </Replay>

      <SectionShell id="magnetic" index={12} title="Magnetic" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Magnetic</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          Primary buttons lean toward a fine pointer, up to 6px at their edges, and settle back over 320ms.
          Touch, coarse pointers and reduced motion get no pull.
        </p>
        <Magnetic className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Specimen label="Primary · magnetic">
            <Button>Get in touch</Button>
          </Specimen>
          <Specimen label="Secondary · static">
            <Button variant="secondary">Get in touch</Button>
          </Specimen>
          <Specimen label="Disabled · static">
            <Button disabled>Get in touch</Button>
          </Specimen>
        </Magnetic>
      </SectionShell>

      <SectionShell id="cursor" index={13} title="Cursor" rev="REV.26" contentClassName="gap-y-6">
        <SpecimenHeading>Cursor</SpecimenHeading>
        <p className="col-span-full max-w-measure md:col-span-6">
          Fine pointers only: a 6px dot with a trailing 28px crosshair ring. Over interactive media the ring
          becomes a 64px lens with a label. Touch devices keep their native behaviour.
        </p>
        <CursorTargets />
      </SectionShell>
    </>
  );
}
