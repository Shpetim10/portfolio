import type { MetadataRoute } from "next";
import { getAwards, getProfile, getProjects } from "@/content";
import { isPublished } from "@/content/files";
import { absolute } from "@/seo/site";

/*
 * T15 · /sitemap.xml: the pages that carry the record, each with the images
 * on it (an image sitemap), so the portrait, award photos and project
 * screens can be found in image search under their alt text.
 * Only files that are in /public at build are listed. The lab benches are
 * indexable but left out: they document the design system, not the owner.
 */

export const dynamic = "force-static";

const images = (sources: string[]) =>
  [...new Set(sources)].filter((src) => isPublished(src)).map((src) => absolute(src));

export default function sitemap(): MetadataRoute.Sitemap {
  const projects = getProjects();
  const awardPhotos = getAwards().flatMap((award) => [
    ...(award.gallery ?? []).map((photo) => photo.src),
    ...(award.badge ? [award.badge.src] : []),
  ]);

  return [
    {
      url: absolute("/"),
      changeFrequency: "monthly",
      priority: 1,
      images: images([getProfile().portrait.src, ...awardPhotos]),
    },
    {
      url: absolute("/work/"),
      changeFrequency: "monthly",
      priority: 0.8,
      images: images(projects.map((project) => project.cover.src)),
    },
    ...projects.map((project) => ({
      url: absolute(`/work/${project.slug}/`),
      changeFrequency: "yearly" as const,
      priority: project.featured ? 0.7 : 0.5,
      images: images([project.cover, ...project.gallery].map((media) => media.src)),
    })),
  ];
}
