import type { Metadata } from "next";
import type { SculptureData } from "@/components/sculpture/model";
import { Link } from "@/components/ui/Link";
import victory from "@/content/sculpture/victory.json";
import { SculptureLab } from "./SculptureLab";

export const metadata: Metadata = {
  title: "Lab · Sculpture",
  robots: { index: false, follow: false },
};

/*
 * T04b tuning bench for SymbolSculpture. Everything shown is the component and
 * its sampled data; the controls stand in for the scroll-driven parent.
 */
export default function SculptureLabPage() {
  return (
    <>
      <header className="layout-grid gap-y-6 pt-24 pb-12">
        <p className="col-span-full font-mono text-label text-dust uppercase">T04b · Symbol sculpture</p>
        <h1 className="col-span-full font-display text-display-l font-black uppercase">Sculpture</h1>
        <p className="col-span-full max-w-measure text-body-l md:col-span-6">
          Tuning bench for the sampled figure. Scrub the assembly, switch grids, and read the core point
          against the figure before editing <code className="font-mono text-small">config.json</code> and
          re-running <code className="font-mono text-small">pnpm sculpture</code>.
        </p>
        <p className="col-span-full font-mono text-label uppercase">
          <Link href="/lab/">← Lab</Link>
        </p>
      </header>
      <SculptureLab data={victory as SculptureData} />
    </>
  );
}
