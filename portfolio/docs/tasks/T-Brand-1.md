TASK BRAND-01 · Sh² logo system · Role: UI Engineer (+ Art Director review)
Read: AGENTS.md, docs/design-system.md
This replaces the earlier MONO task and any S² version of this task.

CONCEPT
The owner's name and surname both begin with "Sh", which is a single letter of the
Albanian alphabet. The mark is "Sh²": the letter Sh (capital S + lowercase h) with a
small solid square in the exponent position. The S is built from a circle (upper bowl:
a true circular arc, meaning theory) and a square (lower bowl: straight segments meeting
at right angles, meaning practice). The exponent square is signal orange and doubles
as the site's indicator light.

HARD RULES
- Never render two S letters side by side, and never use angular, jagged or
  lightning-like S forms (they resemble the SS runes). One S, one h.
- Monoline, square terminals, built on a grid of 32 × 24 units (the mark is wider than
  tall) with integer or half-unit coordinates. All parts are filled paths in the final
  SVG (no strokes, no <text>).
- The S uses currentColor; the exponent square uses var(--signal) by default, with a
  "mono" variant where it also uses currentColor.
- Must read clearly at 16px tall and look refined at 512px.

STEPS
1. Draw three variants:
   A · Ligature: the end of the S's upper arc continues straight up to form the h's
       ascender; the h has a squared shoulder. Stroke 2.5 units.
   B · Ligature, bold: as A with a 3-unit stroke and a slightly larger exponent square.
   C · Separate: S and h unconnected, spaced at 1.5 units, stroke 2.5 units.
   In each, the exponent square is 3–4 units, its top aligned with the top of the h's
   ascender, 1.5 units to the right of the h. Save /assets-src/brand/options/sh2-a.svg,
   sh2-b.svg and sh2-c.svg.
2. Build /lab/logo showing each variant at 16, 24, 32, 64 and 512px tall on carbon and
   on paper, colored and mono, plus a favicon preview in a mock browser tab.
3. Stop and ask me which variant to keep.
4. Finalize:
   - /assets-src/brand/mark.svg (SVGO-optimized, viewBox 0 0 32 24, under 2KB).
   - /assets-src/brand/mark-square.svg: the same mark centered in a 32 × 32 viewBox
     for the favicon and app icons.
   - Wordmark "SHPËTIM SHABANAJ" in the display font, uppercase, letter-spacing 0.06em,
     outlined to paths in /assets-src/brand/wordmark.svg (no font dependency). Check
     the Ë diacritic.
   - Horizontal lockup /assets-src/brand/lockup.svg: mark height = wordmark cap height
     × 1.4, gap = 0.5 × the mark's height, optically centered.
   - React component /src/components/brand/Logo.tsx with props
     variant ('mark' | 'wordmark' | 'lockup'), tone ('color' | 'mono'), size, title.
     Decorative usage sets aria-hidden; otherwise renders <title>.
5. Replace the monogram everywhere: header, menu, footer title block, OG image
   compositor, resume page. Regenerate the favicons ("brand:icons") from mark-square.svg.
6. Logo motion (header, first load only): the S's upper arc draws (300ms, settle easing)
   and continues up into the h, then the squared strokes draw (300ms, machine easing),
   then the orange square lights with one soft breath. Under 1s total. Static under
   prefers-reduced-motion.

ACCEPT
- At 16px the mark reads as "Sh" plus a square on both backgrounds.
- mark.svg under 2KB; no embedded fonts in any brand SVG.
- Favicon, header, footer, OG images and resume all use the new mark.
- Report: files changed, /lab/logo screenshots, and the chosen variant.