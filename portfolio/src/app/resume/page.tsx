import type { Metadata } from "next";
import Link from "next/link";
import { Content } from "@/components/ui/Content";
import { getExperience, getProfile } from "@/content";

export const metadata: Metadata = { title: "Resume" };

// Skeleton only: the full resume layout lands in a later task.
export default function ResumePage() {
  const profile = getProfile();
  const experience = getExperience();

  return (
    <div className="layout-grid gap-y-12 section-pad">
      <header className="col-span-full">
        <p className="font-mono text-label text-dust uppercase">Resume</p>
        <h1 className="font-display text-display-l font-black uppercase">
          <Content value={profile.name} />
        </h1>
      </header>
      <ol className="col-span-full border-t border-hairline">
        {experience.map((role, i) => (
          <li key={i} className="grid gap-2 border-b border-hairline py-6 md:grid-cols-[1fr_2fr]">
            <p className="font-mono text-label text-dust uppercase">
              <Content value={role.start} /> — <Content value={role.end} />
            </p>
            <div>
              <Content as="h2" value={role.company} className="text-heading" />
              <Content as="p" value={role.title} className="text-dust" />
            </div>
          </li>
        ))}
      </ol>
      <Link href="/" className="col-span-full font-mono text-label uppercase underline underline-offset-4">
        ← Index
      </Link>
    </div>
  );
}
