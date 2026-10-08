import localFont from "next/font/local";

/*
 * The 404's faces: only the two it sets (display 800 for the title, mono for
 * everything else), so it preloads two files instead of five. Same files and
 * fallback metrics as src/styles/fonts.ts — keep the two in step.
 * next/font needs literal options per call, hence the repetition.
 * The text face is mapped to mono in src/styles/not-found.css.
 */

export const displayFont = localFont({
  src: [{ path: "./fonts/big-shoulders-display-latin-800-normal.woff2", weight: "800", style: "normal" }],
  variable: "--font-display-face",
  display: "swap",
  adjustFontFallback: "Arial",
  fallback: ["Arial Narrow", "sans-serif"],
});

export const monoFont = localFont({
  src: [{ path: "./fonts/martian-mono-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-mono-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Mono Fallback", "ui-monospace", "monospace"],
});

export const fontVariables = [displayFont.variable, monoFont.variable].join(" ");
