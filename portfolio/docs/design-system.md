# Design System — Exploded View

## Color tokens (define once in /src/styles/tokens.css)
--carbon:    #0B0A08   page background
--graphite:  #151412   surfaces
--gunmetal:  #1E1C19   elevated / hover
--hairline:  rgba(237,232,223,0.10)   borders, drawing lines
--bone:      #EDE8DF   primary text on dark
--dust:      #8F8A80   secondary text, annotations
--signal:    #FF4F00   the ONLY accent
--coolant:   #9DB4C0   diagram/data lines only
--paper:     #EFEAE0   inverted sections
--ink:       #0B0A08   text on paper
Rules: ~92% carbon/bone/dust, ~6% paper, ~2% signal. No gradients except
image/3D lighting. Signal never as small text on paper. Selection = signal bg, ink text.

## Typography
Display: PP Formula Condensed | fallback Big Shoulders Display — uppercase, weights 500/800
Text:    ABC Diatype | fallback Schibsted Grotesk — 400/500
Mono:    Berkeley Mono | fallback Martian Mono — 400, uppercase for labels
Scale (fluid):
  display-xl  clamp(4.5rem, 16vw, 18rem)   lh 0.82  tracking -0.01em
  display-l   clamp(3rem, 9vw, 9rem)       lh 0.88
  display-m   clamp(2.25rem, 5vw, 4.5rem)  lh 0.95
  heading     clamp(1.5rem, 2.4vw, 2rem)   lh 1.15  text font 500
  body-l      1.25rem   lh 1.5
  body        1.0625rem lh 1.6   (max 68ch)
  small       0.875rem  lh 1.5
  label       0.75rem   lh 1.2  mono uppercase tracking 0.08em
  micro       0.6875rem lh 1.2  mono uppercase tracking 0.1em
Numbers in display use tabular figures.

## Layout
Breakpoints: sm 480 · md 768 · lg 1024 · xl 1440 · 2xl 1920
Grid: 4 col (<768, gutter 16, margin 20) · 8 col (768–1023, gutter 20)
      · 12 col (≥1024, gutter 24, margin clamp(24px, 4vw, 64px))
Spacing scale (px): 4 8 12 16 24 32 48 64 96 128 192 256
Section padding: clamp(96px, 14vw, 224px) vertical
Radius: 0 everywhere; 2px only on tags. Borders: 1px hairline.
Display type may bleed past the grid edge; body text never does.

## Annotation system (the signature detail layer)
- Leader line: 1px dust, angled segment + horizontal elbow, 4px signal dot at the target
- Part label: micro mono, e.g. "P/N 03 — SERVICES"
- Dimension line: hairline with end ticks + mono value, e.g. "← 4.2 YRS →"
- Registration mark: 12px crosshair at section corners, dust at 40%
- Section index: "[03]  WORK  ─────────  REV.26" in label mono at section top
- Title block: the footer, styled like an engineering drawing title block
  (DRAWN BY / PROJECT / REV / DATE / SCALE / SHEET 1 OF 1)
Use annotations to add information, never as pure decoration. Max ~6 visible per viewport.

## Components
Button primary: signal fill, ink label (label mono), 48px high, square, arrow glyph
  slides 4px on hover, magnetic pull max 6px (pointer: fine only)
Button secondary: hairline outline, bone label; hover fills gunmetal
Link: bone, underline draws left→right on hover (320ms settle)
Tag: micro mono, hairline border, 2px radius, 6×10px padding
Counter: display font, tabular, counts once when 60% in view
Cursor (pointer: fine only): 6px bone dot + 28px hairline crosshair ring;
  grows to 64px with a mono label (VIEW / DRAG / OPEN) over interactive media
Focus: 2px signal outline, 3px offset, never removed

## Motion tokens
Easing:
  settle   cubic-bezier(0.16, 1, 0.3, 1)    reveals, text, UI
  machine  cubic-bezier(0.76, 0, 0.24, 1)   mechanical moves: explode, panels, page wipes
  snap     cubic-bezier(0.2, 0, 0, 1)       micro-interactions
  NO bounce, NO elastic, NO spring overshoot on mechanical parts
Duration: micro 180ms · small 320ms · medium 600ms · large 1000ms · cinematic 1400ms
Stagger: characters 0.02s · lines 0.08s · items 0.06s

Signature motions:
1. EXPLODE — parts separate along straight axes with machine easing, scroll-scrubbed
2. ANNOTATE — leader line draws (300ms), dot appears, label decodes left→right in mono
   (character scramble ONLY on mono labels, max 400ms)
3. REVEAL — display lines rise from behind masks (settle, 1000ms, 0.08s line stagger)
4. INVERT — full-section wipe from carbon to paper (machine, 1000ms) for Awards
5. CALIBRATE — numbers count up while a dimension line extends to its value

Idle (static) motion — the page is never dead:
- Instrument rotates ~3°/s, indicator LED breathes on a 2.4s cycle
- Live clock in the header ticks; registration marks drift ±2px over 8s
- Hovering any part of the Instrument raises its annotation

Reduced motion: replace all of the above with 200ms opacity fades;
Instrument shows a static render; no scramble, no counters (show final value).

## Imagery
3D/renders: carbon environment, warm key light from top-left, cool fill,
  signal orange ONLY from the indicator light or engraved fills.
Photos: warm monochrome (carbon→bone duotone), fine grain, no color photos.
Project screenshots: real UI, shown flat on graphite with hairline frames
  and annotations — no tilted device mockups.

## Z-index
base 0 · content 10 · sticky 100 · header 200 · overlay 300 · cursor 400 · preloader 500