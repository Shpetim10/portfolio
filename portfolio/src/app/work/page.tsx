import type { Metadata } from "next";
import { WorkIndex } from "@/components/work-index/WorkIndex";
import { getProjects } from "@/content";

/*
 * /work/: the full project register. The homepage track shows the featured
 * projects; this page files every one, in reading order, each linking to its
 * case study (/work/<slug>/).
 */

export const metadata: Metadata = {
  title: "All work",
  description:
    "Every project in the record: featured case studies and the rest of the work, in one register.",
};

export default function WorkIndexPage() {
  return <WorkIndex projects={getProjects()} />;
}
