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

## Session log

### 2026-07-22 (later) — promo sites for CookieJar + HeaderForge, shared site-kit
- New `packages/site-kit` (`@browser-plugins/site-kit`): shared Astro components shipped as source (no build step) — `Layout` (head shell + favicon/og via `withBase()`), `OtherPlugins` (cross-plugin strip fed by the `plugins.ts` registry), `AuthorCard` (pearpages credit + slot), `InstallSteps` (clone → pnpm install → build → load unpacked). Components style themselves ONLY via `--sk-*` custom properties with fallbacks; each site maps its own tokens onto `--sk-*` in `theme.css`. `paths.ts::withBase()` normalizes `import.meta.env.BASE_URL` so the same components will work under `/​<slug>` bases when deployment lands.
- New `plugins/cookiejar/site` (`@cookiejar/site`, pantry-jar theme: serif display, amber/warm-paper palette from the extension's `_variables.scss`, SVG glass-jar hero, dark via `prefers-color-scheme`) and `plugins/headerforge/site` (`@headerforge/site`, wire-truth theme: mono headings, request-blue/response-teal from the popup's `base.scss`, hero = HTTP exchange with injected headers highlighted, "DevTools lies" callout). Both seeded from the extension READMEs; each site's `public/` carries copies of all three 48px plugin icons + pearpages icon.
- Astro gotcha (bit twice): a line break before an inline element inside prose collapses the preceding space ("enableDeveloper mode") — keep `text <strong>/<a>` on one line.
- Verified: `pnpm -r build` green (3 extensions + 3 sites), typecheck green, unit 137+72+30 green; both sites screenshot-checked light+dark over HTTP.
- **Decided & pending (next stage):** GitHub Pages hosting, path-based on ONE domain `plugins.pearpages.com/<slug>/` + minimal root index site (GoDaddy CNAME `plugins` → `pearpages.github.io`; subdomains rejected — GH Pages = one custom domain per repo). Still to do: refactor focaccia site onto site-kit (and fix its two stale `apps/extension` paths), `sites/index` root page, `base`/`site` in astro configs, `.github/workflows/deploy-sites.yml`, create GitHub repo + push, Pages + DNS setup. Also parked: product screenshots for the sites.

### 2026-07-22 — monorepo creation (three repos merged, history preserved)
- Merged the three standalone repos (cookiejar, focaccia, modheader→headerforge) into this pnpm-workspace monorepo. Full git history of cookiejar and focaccia preserved via rename-only move commits + `git merge --allow-unrelated-histories` (verify with `git log --follow`); modheader had zero commits, so it got its first commit here. Layout `plugins/<name>/{extension,site}` anticipates an Astro site per plugin (focaccia's moved from `apps/*`).
- cookiejar migrated npm→pnpm (`pnpm import`) and node 22→24, validated standalone before merging. Extensions renamed `@cookiejar/extension` / `@headerforge/extension`.
- Shared config extracted to `packages/config`: `tsconfig.base.json` (all extension tsconfigs extend it) and `playwright.base.js` + `.d.ts` (all playwright configs spread `baseConfig`; JS not TS so Playwright's loader needs no help).
- All green after migration, matching pre-migration baselines: 137+72+30 unit, 19+7+3 e2e, all builds incl. focaccia site.
- Old repo dirs (with their `.git`) parked in `../browser-plugins-backup/` (`<name>` = pre-migration copy, `<name>-post-migration` = final state). Safe to delete once confident — history lives here now.

**Pending:**
- [ ] Re-load the three unpacked extensions in Chrome from `plugins/<name>/extension/dist` (path-derived extension IDs change; old dev `chrome.storage` data won't carry over).
- [ ] Delete `../browser-plugins-backup/` after a comfortable interval.
- [ ] Future (deliberately out of scope this pass): shared runtime package (chrome storage wrapper, DNR helpers, icon scripts), Astro sites for cookiejar/headerforge, possibly unify focaccia onto Vite+crxjs.
