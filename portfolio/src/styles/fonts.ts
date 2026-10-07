import localFont from "next/font/local";

/*
 * Self-hosted faces. The design system's primaries (PP Formula Condensed,
 * ABC Diatype, Berkeley Mono) are commercial and not yet licensed, so the
 * documented OFL fallbacks ship today.
 * TODO(fonts): once licensed, drop the woff2 files into ./fonts and swap `src`.
 *
 * CLS: display and text use next/font's generated size-adjusted Arial fallback
 * (average width + vertical metrics matched). Mono cannot be matched from a
 * proportional face, so it uses the hand-tuned "Mono Fallback" @font-face in
 * globals.css, which matches every glyph's advance exactly. All faces preload.
 */

export const displayFont = localFont({
  src: [
    { path: "./fonts/big-shoulders-display-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/big-shoulders-display-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display-face",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["Arial Narrow", "sans-serif"],
});

export const textFont = localFont({
  src: [
    { path: "./fonts/schibsted-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/schibsted-grotesk-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-text-face",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["system-ui", "sans-serif"],
});

export const monoFont = localFont({
  src: [{ path: "./fonts/martian-mono-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-mono-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Mono Fallback", "ui-monospace", "monospace"],
});

export const fontVariables = [displayFont.variable, textFont.variable, monoFont.variable].join(" ");
