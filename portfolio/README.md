# Exploded View — Portfolio

Static Next.js site (`output: "export"` → `/out`). Agent guidance lives in `AGENTS.md`;
design tokens in `docs/design-system.md`; content schema in `docs/content-schema.md`.

## Commands (pnpm)

| Command             | What it does                                                      |
| ------------------- | ----------------------------------------------------------------- |
| `pnpm dev`          | Dev server on http://localhost:3000                               |
| `pnpm build`        | Static export into `/out`                                         |
| `pnpm serve`        | Serve `/out` on http://localhost:3100                             |
| `pnpm lint`         | ESLint (includes a raw-hex guard for components)                  |
| `pnpm typecheck`    | Generate route types, then `tsc --noEmit`                         |
| `pnpm format`       | Prettier (with Tailwind class sorting)                            |
| `pnpm test:e2e`     | Playwright smoke tests against `/out` (desktop + mobile)          |
| `pnpm lhci`         | Lighthouse CI against `/out` (CLS, LCP, accessibility budgets)    |
| `pnpm run verify`   | lint → typecheck → format check → build → smoke tests             |

First run of the smoke tests needs a browser: `pnpm exec playwright install chromium`.

## Content

All facts about the owner live in `src/content`. Unsupplied values are `TODO: …`
strings and render as marked placeholders — search for `TODO(content)`.
