import type { Metadata, Viewport } from "next";
import { Preloader } from "@/components/chrome/Preloader";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { TitleBlock } from "@/components/chrome/TitleBlock";
import { getProfile, isTodo } from "@/content";
import { Cursor } from "@/motion/Cursor";
import { MotionProvider } from "@/motion/MotionProvider";
import { PageWipe } from "@/motion/PageWipe";
import { fontVariables } from "@/styles/fonts";
import "@/styles/globals.css";

const profile = getProfile();
const siteName = isTodo(profile.name) ? "Portfolio" : profile.name;

export const metadata: Metadata = {
  // Absolute base for Open Graph image URLs (case-study cards, T07).
  // TODO(content): set SITE_URL to the production origin at build; locally it's the static server.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3100"),
  title: { default: siteName, template: `%s — ${siteName}` },
  description: isTodo(profile.positioning) ? undefined : profile.positioning,
};

export const viewport: Viewport = {
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <a
          href="#main"
          className="sr-only-focusable fixed top-4 left-4 z-(--z-overlay) bg-signal px-4 py-3 font-mono text-label text-ink uppercase"
        >
          Skip to content
        </a>
        <MotionProvider>
          <Preloader />
          <SiteHeader name={profile.name} availability={profile.availability} timezone={profile.timezone} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <TitleBlock />
          <PageWipe />
          <Cursor />
        </MotionProvider>
      </body>
    </html>
  );
}
