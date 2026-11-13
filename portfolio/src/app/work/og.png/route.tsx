import { ImageResponse } from "next/og";
import { getProjects } from "@/content";
import { MARGIN, OG_SIZE, ogOptions, Sheet, SheetHeader, TitleBlock } from "@/seo/og";
import { SITE_NAME } from "@/seo/site";

/*
 * T15 · The /work/ share card, /work/og.png: the register's title sheet.
 * "All work" in the display face; the title block counts the record
 * (projects, featured case studies, the span of years), all from content.
 */

export const dynamic = "force-static";

export const WORK_OG_ALT = "All work: the project register's title card, with project count and years";

export async function GET() {
  const projects = getProjects();
  const years = projects.map((project) => project.year).filter((year) => year > 0);
  const span = years.length > 0 ? `${Math.min(...years)}–${Math.max(...years)}` : "";
  const facts = (
    [
      ["Projects", String(projects.length).padStart(2, "0")],
      ["Featured", String(projects.filter((project) => project.featured).length).padStart(2, "0")],
      ["Years", span],
    ] as [string, string][]
  ).filter(([, value]) => value);

  return new ImageResponse(
    <Sheet>
      <SheetHeader lead="Register" rest={[SITE_NAME]} />
      <div
        style={{
          display: "flex",
          fontFamily: "Display",
          fontSize: 220,
          lineHeight: 0.88,
          textTransform: "uppercase",
          maxWidth: OG_SIZE.width - MARGIN * 2,
        }}
      >
        All work
      </div>
      <TitleBlock facts={facts} />
    </Sheet>,
    await ogOptions(),
  );
}
