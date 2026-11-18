# Exploded View — Portfolio

Personal portfolio built around one idea, "Exploded View": the visual language of precision
engineering (machined hardware, technical drawings, exploded assembly diagrams). The hero
object, the Instrument, separates into five labelled layers (Interface, API, Services, Data,
Infrastructure), and its parts recur through the site.

The site runs on Next.js on Vercel. Pages are prerendered at build time, and ISR regenerates
the homepage every hour so the GitHub field log stays current.

## Stack

- **Next.js 16** (App Router) + **React 19**, TypeScript strict
- **Tailwind CSS 4**: design tokens are defined once in `src/styles/tokens.css`
- **GSAP** (ScrollTrigger, SplitText) via `@gsap/react` for scroll choreography
- **Lenis** smooth scroll, driven by the GSAP ticker (one RAF loop)
- **React Three Fiber / three.js** for the Instrument, loaded after first paint
- **MDX** for case studies
- **Playwright** (smoke + visual) and **Lighthouse CI**

## Getting started

Requirements: Node 22 and pnpm 10 (the version is pinned in `packageManager`).

```sh
pnpm install
# optional: add CONTRIBUTIONS_TOKEN to .env (see Environment)
pnpm dev               # http://localhost:3000
```

The first smoke-test run needs a browser: `pnpm exec playwright install chromium`.

To test on a phone, open the dev server from your LAN IP or a Cloudflare quick tunnel.
`next.config.ts` lists those origins in `allowedDevOrigins`, so hydration works there.

### Environment

| Variable              | Required | Purpose                                                              |
| --------------------- | -------- | -------------------------------------------------------------------- |
| `CONTRIBUTIONS_TOKEN` | No       | Classic GitHub PAT with `read:user`, for the live contribution graph |

Set it in `.env` locally and in the Vercel project's environment variables. `.env*` is
gitignored. Never commit the token.

## Commands

| Command           | What it does                                                    |
| ----------------- | --------------------------------------------------------------- |
| `pnpm dev`        | Dev server on http://localhost:3000                             |
| `pnpm build`      | Production build (refreshes the GitHub fallback snapshot first) |
| `pnpm serve`      | Serve the production build on http://localhost:3100            |
| `pnpm lint`       | ESLint (includes a raw-hex guard for components)                |
| `pnpm typecheck`  | Generate route types, then `tsc --noEmit`                       |
| `pnpm format`     | Prettier (with Tailwind class sorting)                          |
| `pnpm test:e2e`   | Playwright tests against `pnpm serve` (desktop + mobile)        |
| `pnpm lhci`       | Lighthouse CI against `pnpm serve` (CLS, LCP, accessibility)    |
| `pnpm run verify` | lint → typecheck → format check → build → Playwright tests      |

### Asset pipelines

The scripts below generate assets at build time. Each one reads from `assets-src/` and
commits its output. They are deterministic, so the same inputs always produce byte-identical
files. Run a script only when you change its inputs.

| Command               | Input → output                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm sculpture`      | `assets-src/victory/` → `src/content/sculpture/victory.json` (glyph sculpture grid)             |
| `pnpm drawing:glyphs` | Martian Mono in Chromium → `assets-src/vitruvian/glyphs.png` (glyph atlas; re-run on font change) |
| `pnpm drawing`        | `assets-src/vitruvian/` → `src/content/drawing/vitruvian.json` + lab alignment scan             |
| `pnpm brand:options`  | `scripts/brand/geometry.mjs` → `assets-src/brand/options/` (Sh² variants for `/lab/logo`)       |
| `pnpm brand`          | Chosen Sh² mark → `assets-src/brand/*.svg` + `src/components/brand/geometry.ts`                 |
| `pnpm brand:icons`    | `assets-src/brand/mark-square.svg` → `src/app/favicon.ico`, `icon.svg`, `apple-icon.png`        |

## Routes

| Route                   | Notes                                                              |
| ----------------------- | ------------------------------------------------------------------ |
| `/`                     | Homepage. ISR, revalidated hourly for the GitHub field log         |
| `/work/`                | Index of every project                                             |
| `/work/[slug]/`         | Case study, one per project in `src/content` (unknown slugs → 404) |
| `/lab/…`                | Development benches: components, sculpture, drawing, logo          |
| `/llms.txt`, `/og.png`  | Plain-Markdown record for AI search, and generated share cards     |
| `/sitemap.xml`, `/robots.txt` | Generated from content                                       |

`src/app/_resume` holds the resume page, which is withheld for now. The leading underscore
keeps the folder out of routing. Clean URLs keep their trailing slash (`trailingSlash: true`).

## Project structure

```
src/app                  routes, metadata routes, OG cards, global 404
src/components/ui        primitives (Button, Link, Tag, Annotation, Counter, …)
src/components/sections  one folder per homepage section
src/components/three     Instrument scene, materials, WebGL fallback
src/components/…         case-study, work-index, sculpture, drawing, brand, chrome
src/motion               motion tokens, shared timelines, hooks
src/content              typed data, the only source of facts about the owner
src/seo                  metadata helpers, JSON-LD, OG rendering
src/styles               tokens.css, globals.css and per-section styles
scripts                  build-time asset pipelines and the GitHub snapshot fetch
assets-src               source images and brand files for the pipelines
tests                    Playwright specs, one per section/feature
docs                     design system, content schema, task briefs, reviews
```

## Content

`src/content` holds every fact about the owner, typed against `docs/content-schema.md`.
Values that haven't been supplied yet are `TODO: …` strings (built with `todo()` from
`src/content/todo.ts`) and render as clearly marked placeholders. To list them, search for
`TODO(content)`. Do not invent content to fill a placeholder.

### Adding a case study

1. Add the project to `src/content/projects.ts`.
2. Put its images in `public/assets/work/<slug>/`, pre-optimized as WebP/AVIF. Keep the
   originals in `assets-src/work-originals/`.
3. Write `src/content/work/<slug>.mdx`. The build validates every story and fails on a
   malformed one. A valid story has:
   - exactly the six chapters, in order: Problem, Constraints, Architecture, Key decisions,
     Results, Reflection (see `src/content/chapters.ts`)
   - a `<SystemDiagram>` in the Architecture chapter
   - exactly one `<Spread>`
   - no Markdown `#` or `##` headings (use `###` and below)

## GitHub field log

The server fetches the homepage's contribution graph from the GitHub GraphQL API with
`CONTRIBUTIONS_TOKEN` and caches it for an hour (`src/content/github.ts`). If the token is
missing or GitHub fails, the graph falls back to the committed snapshot in
`src/content/generated/github.json`. When the token is present, `pnpm build` refreshes that
snapshot (`scripts/fetch-github.mjs`). This step never fails the build. The token stays on
the server and never reaches the browser.

## CI and deployment

`.github/workflows/ci.yml` lives at the repository root, one level up. It runs on pushes to
`main` and on pull requests: install → lint → typecheck → format check → build → Playwright →
Lighthouse CI. When a run fails, it uploads the Playwright report.

The site is hosted on Vercel. Set `CONTRIBUTIONS_TOKEN` in the Vercel project.

Budgets enforced by the tests and LHCI: LCP < 2.5 s on mid-range mobile, CLS < 0.05, and
initial JS < 200 KB gzipped, excluding the lazy 3D chunk.

## Docs

- `AGENTS.md` / `CLAUDE.md`: engineering rules, non-negotiables, forbidden patterns
- `docs/design-system.md`: tokens, type, colour, motion
- `docs/content-schema.md`: content types
- `docs/agents/`: role briefs; `docs/tasks/`: task briefs; `docs/review/`: review notes

## Licences

The self-hosted fonts (Big Shoulders Display, Martian Mono, Schibsted Grotesk) are under the
SIL Open Font License. Their licence texts are in `public/licenses/`.
