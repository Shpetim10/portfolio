import type { Metadata } from "next";
import type { DrawingData } from "@/components/drawing/model";
import { Link } from "@/components/ui/Link";
import vitruvian from "@/content/drawing/vitruvian.json";
import config from "../../../../assets-src/vitruvian/config.json";
import { DrawingLab, type TracerConfig } from "./DrawingLab";

export const metadata: Metadata = {
  title: "Lab · Drawing",
  robots: { index: false, follow: false },
};

/*
 * T09c tuning bench for GlyphLineDrawing. Everything shown is the component and
 * its traced data; the controls stand in for the scroll-driven parent. The
 * overlay reads config.json itself, so an edit shows here before re-tracing.
 */
export default function DrawingLabPage() {
  return (
    <>
      <header className="layout-grid gap-y-6 pt-24 pb-12">
        <p className="col-span-full font-mono text-label text-dust uppercase">T09c · Glyph line drawing</p>
        <h1 className="col-span-full font-display text-display-l font-black uppercase">Drawing</h1>
        <p className="col-span-full max-w-measure text-body-l md:col-span-6">
          Tuning bench for the traced figure. Scrub the sequence, switch grids, and lay the configured square,
          circle and navel over the scan before editing{" "}
          <code className="font-mono text-small">assets-src/vitruvian/config.json</code> and re-running{" "}
          <code className="font-mono text-small">pnpm drawing</code>.
        </p>
        <p className="col-span-full font-mono text-label uppercase">
          <Link href="/lab/">← Lab</Link>
        </p>
      </header>
      <DrawingLab data={vitruvian as DrawingData} config={config as TracerConfig} />
    </>
  );
}
