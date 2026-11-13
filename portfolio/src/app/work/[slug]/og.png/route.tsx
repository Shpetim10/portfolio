import { ImageResponse } from "next/og";
import { getProject, getProjectSlugs, isTodo } from "@/content";
import { MARGIN, OG_SIZE, ogOptions, Sheet, SheetHeader, TitleBlock } from "@/seo/og";

/*
 * T07 · Open Graph card per case study, rendered once at build into
 * /work/<slug>/og.png (a static GET handler, like the metadata image routes,
 * but with an extension: the bare `opengraph-image` file convention exports
 * without one, and static hosts then serve it untyped). page.tsx links it.
 * The shared drawing sheet (src/seo/og.tsx): part number in the header, the
 * title in the display face, a title block of the facts that are known.
 * Unsupplied facts are left off the card (the page marks them TODO); a
 * project without a title shows its part number.
 */

export { OG_SIZE };
export const OG_ALT = "Case study title card: part number, title and project facts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function GET(_request: Request, { params }: RouteContext<"/work/[slug]/og.png">) {
  const project = getProject((await params).slug)!;
  const titled = !isTodo(project.title);
  const facts = (
    [
      ["Role", project.role],
      ["Duration", project.duration],
      ["Year", project.year > 0 ? String(project.year) : ""],
    ] as [string, string][]
  ).filter(([, value]) => value && !isTodo(value));

  return new ImageResponse(
    <Sheet>
      <SheetHeader lead={project.partNumber} rest={["Case study"]} />
      <div
        style={{
          display: "flex",
          fontFamily: "Display",
          fontSize: titled ? 128 : 220,
          lineHeight: 0.88,
          textTransform: "uppercase",
          maxWidth: OG_SIZE.width - MARGIN * 2,
        }}
      >
        {titled ? project.title : project.partNumber}
      </div>
      <TitleBlock facts={facts} />
    </Sheet>,
    await ogOptions(),
  );
}
