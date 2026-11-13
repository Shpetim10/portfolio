import { WorkIndex } from "@/components/work-index/WorkIndex";
import { getProjects } from "@/content";
import { workIndexGraph } from "@/seo/schema";
import { JsonLd } from "@/seo/JsonLd";
import { pageMetadata, SITE_NAME } from "@/seo/site";
import { WORK_OG_ALT } from "./og.png/route";

/*
 * /work/: the full project register. The homepage track shows the featured
 * projects; this page files every one, in reading order, each linking to its
 * case study (/work/<slug>/).
 */

export const metadata = pageMetadata({
  path: "/work/",
  title: "All work",
  description: `Every software project by ${SITE_NAME}, in one register: ${getProjects()
    .slice(0, 4)
    .map((project) => project.title.split(" — ")[0])
    .join(", ")} and more, each with a case study.`,
  image: { url: "/work/og.png", alt: WORK_OG_ALT, width: 1200, height: 630 },
});

export default function WorkIndexPage() {
  return (
    <>
      <JsonLd data={workIndexGraph()} />
      <WorkIndex projects={getProjects()} />
    </>
  );
}
