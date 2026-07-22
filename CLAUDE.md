# browser-plugins — monorepo conventions

pnpm-workspace monorepo of Chrome extensions (MV3). Layout:

```
packages/config/            # @browser-plugins/config — shared tsconfig.base.json + playwright.base.js
plugins/<name>/extension    # the extension package
plugins/<name>/site         # optional Astro promo site (focaccia has one)
plugins/<name>/CLAUDE.md    # plugin conventions + session log (root file = shared rules only)
```

Plugins: **cookiejar** (`@cookiejar/extension`, React+Vite+crxjs), **focaccia** (`@focaccia/extension` vanilla TS + esbuild, `@focaccia/site` Astro), **headerforge** (`@headerforge/extension`, React+Vite+crxjs).

## Toolchain

- Node 24 + pnpm 11 pinned in the root `mise.toml` (mise-managed; nothing is on the default non-interactive PATH — run commands via `mise x -- <cmd>` or activate mise). **pnpm only** — no npm/yarn anywhere. Always `pnpm install` from the root.
- pnpm 11 blocks dependency build scripts by default; approved ones live under `allowBuilds` in the root `pnpm-workspace.yaml` (esbuild, @parcel/watcher). If `pnpm install` warns about ignored build scripts, extend that list deliberately.
- Do not add per-package `pnpm-workspace.yaml`, lockfiles, `.node-version`, or `.tool-versions` — the root owns all of them (nearest-file-wins would silently override the root pins).

## Commands

- Root: `pnpm build` / `pnpm typecheck` / `pnpm test` / `pnpm test:e2e` (tests run with `--workspace-concurrency=1` — e2e suites bind fixed ports and persistent Chromium profiles, keep them serial).
- Per plugin: `pnpm cookiejar <script>` / `pnpm focaccia <script>` / `pnpm headerforge <script>` (directory filters, forward any script), or cd into the package.
- **Tests are always `vitest run`** — every package's `test` script is non-watch; use `test:watch` explicitly when you want watch mode. Never bare `vitest`/`pnpm test -w` in scripts.
- **Never run `playwright test` from the repo root** — e2e fixtures resolve `dist/` from the package cwd; always go through the package's `test:e2e` script or a `--filter`.

## Shared config

- Every extension tsconfig `extends` `@browser-plugins/config/tsconfig.base.json` and keeps only its deltas (`lib`, `jsx`, `types`, extra strictness). Keep configs `noEmit` and non-composite — `tsc -b` emits stray `.js` that breaks cookiejar's bddgen.
- Every `playwright.config.ts` spreads `baseConfig` from `@browser-plugins/config/playwright.base.js` (workers 1, serial, 30s, list reporter) and keeps only its deltas.
- Loading unpacked: each extension builds to `plugins/<name>/extension/dist/`. Unpacked extension IDs are path-derived — moving the folder changes the ID and orphans old dev `chrome.storage` data.

## Memory

- Shared/monorepo decisions go in this file; plugin-specific conventions and session logs go in `plugins/<name>/CLAUDE.md`. Update the relevant CLAUDE.md at the end of each session (finished + pending TODOs).
