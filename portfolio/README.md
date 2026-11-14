# Exploded View — Portfolio

Next.js site on Vercel: pages are prerendered at build, and the homepage is regenerated
hourly with ISR so the GitHub field log stays fresh. Agent guidance lives in `AGENTS.md`;
design tokens in `docs/design-system.md`; content schema in `docs/content-schema.md`.

## Commands (pnpm)

| Command             | What it does                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm dev`          | Dev server on http://localhost:3000                               |
| `pnpm build`        | Production build (refreshes the GitHub fallback snapshot first)  |
| `pnpm serve`        | Serve the production build on http://localhost:3100              |
| `pnpm lint`         | ESLint (includes a raw-hex guard for components)                  |
| `pnpm typecheck`    | Generate route types, then `tsc --noEmit`                         |
| `pnpm format`       | Prettier (with Tailwind class sorting)                            |
| `pnpm test:e2e`     | Playwright smoke tests against `pnpm serve` (desktop + mobile)    |
| `pnpm lhci`         | Lighthouse CI against `pnpm serve` (CLS, LCP, accessibility)      |
| `pnpm run verify`   | lint → typecheck → format check → build → smoke tests             |

First run of the smoke tests needs a browser: `pnpm exec playwright install chromium`.

## Content

All facts about the owner live in `src/content`. Unsupplied values are `TODO: …`
strings and render as marked placeholders — search for `TODO(content)`.

## GitHub field log

The homepage's contribution graph is fetched on the server with `CONTRIBUTIONS_TOKEN`
(a classic personal access token with `read:user`) and cached for an hour
(`src/content/github.ts`). Set it in `.env` locally and in the Vercel project's
environment variables. Without it, or if GitHub fails, the graph uses the committed
snapshot in `src/content/generated/github.json`, which `pnpm build` refreshes when the
token is present. The token never reaches the browser.
