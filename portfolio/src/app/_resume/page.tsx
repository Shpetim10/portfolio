import type { Metadata } from "next";
import { ResumeViewer } from "@/components/resume/ResumeViewer";
import { getProfile } from "@/content";
import { isPublished } from "@/content/files";

export const metadata: Metadata = { title: "Resume" };

// The owner's real PDF (public/resume.pdf), displayed as written, not rebuilt from content.
export default function ResumePage() {
  const profile = getProfile();
  return (
    <ResumeViewer
      title={profile.name}
      pdf={{ href: profile.resumeUrl, published: isPublished(profile.resumeUrl) }}
    />
  );
}
