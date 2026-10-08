import type { Metadata } from "next";
import { ResumeSheet } from "@/components/resume/ResumeSheet";
import { getAwards, getExperience, getFeaturedProjects, getProfile, getSkills, getWriting } from "@/content";
import { isPublished } from "@/content/files";

export const metadata: Metadata = { title: "Resume" };

// T14 · One clean sheet: ink on paper, printable on one page of A4 or US Letter (src/styles/resume.css).
export default function ResumePage() {
  const profile = getProfile();
  return (
    <ResumeSheet
      profile={profile}
      experience={getExperience()}
      projects={getFeaturedProjects()}
      skills={getSkills()}
      awards={getAwards()}
      writing={getWriting()}
      pdf={{ href: profile.resumeUrl, published: isPublished(profile.resumeUrl) }}
    />
  );
}
