import type { Metadata, Viewport } from "next";
import { Preloader } from "@/components/chrome/Preloader";
import { SiteHeader } from "@/components/chrome/SiteHeader";
import { TitleBlock } from "@/components/chrome/TitleBlock";
import { getProfile, getSeo } from "@/content";
import { Cursor } from "@/motion/Cursor";
import { MotionProvider } from "@/motion/MotionProvider";
import { PageWipe } from "@/motion/PageWipe";
import { COLORS, DEFAULT_OG, LOCALE, SITE_NAME, SITE_URL } from "@/seo/site";
import { fontVariables } from "@/styles/fonts";
import "@/styles/globals.css";

const profile = getProfile();
const seo = getSeo();

/*
 * T15 · Site-wide metadata. Deliberately no `alternates` here: a page that set
 * none would inherit the homepage's canonical and drop out of the index. Each
 * page sets its own canonical, Open Graph and Twitter card (src/seo/site.ts).
 * Every page is indexable; only the 404 is noindex (Next adds it).
 */
export const metadata: Metadata = {
  // Absolute base for canonical and Open Graph URLs (SITE_URL overrides it for a preview deploy).
  metadataBase: new URL(SITE_URL),
  title: { default: seo.title, template: `%s · ${SITE_NAME}` },
  description: seo.description,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: `${SITE_URL}/` }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: seo.keywords,
  category: "technology",
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: LOCALE,
    title: seo.title,
    description: seo.description,
    images: [{ ...DEFAULT_OG, type: "image/png" }],
  },
  twitter: { card: "summary_large_image", title: seo.title, description: seo.description },
  // Search Console ownership, when the owner supplies a token at build.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: COLORS.carbon,
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
