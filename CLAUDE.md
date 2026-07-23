# orchard — monorepo conventions (dir: browser-plugins)

pnpm-workspace monorepo of Chrome extensions (MV3). Layout:

```
packages/assets/            # @browser-plugins/assets — shared images (pear icon + 48px plugin icons), source-shipped
packages/config/            # @browser-plugins/config — shared tsconfig.base.json + playwright.base.js
packages/site-kit/          # @browser-plugins/site-kit — shared Astro components + plugin registry
plugins/<name>/extension    # the extension package
plugins/<name>/site         # Astro promo site (all five plugins have one)
plugins/<name>/CLAUDE.md    # plugin conventions + session log (root file = shared rules only)
sites/home/                 # @orchard/home — root directory page at orchard.pearpages.com/
```

Plugins: **begone** (`@begone/extension`, vanilla TS + esbuild — user-managed CSS-selector element remover; `@begone/site` Astro), **cookiejar** (`@cookiejar/extension`, React+Vite+crxjs), **focaccia** (`@focaccia/extension` vanilla TS + esbuild, `@focaccia/site` Astro), **headerforge** (`@headerforge/extension`, React+Vite+crxjs), **hopchase** (`@hopchase/extension`, React+Vite+crxjs — redirect-chain inspector).

## Toolchain

- Node 24 + pnpm 11 pinned in the root `mise.toml` (mise-managed; nothing is on the default non-interactive PATH — run commands via `mise x -- <cmd>` or activate mise). **pnpm only** — no npm/yarn anywhere. Always `pnpm install` from the root.
- pnpm 11 blocks dependency build scripts by default; approved ones live under `allowBuilds` in the root `pnpm-workspace.yaml` (esbuild, @parcel/watcher). If `pnpm install` warns about ignored build scripts, extend that list deliberately.
- Do not add per-package `pnpm-workspace.yaml`, lockfiles, `.node-version`, or `.tool-versions` — the root owns all of them (nearest-file-wins would silently override the root pins).
- The repo is named **orchard** (root package.json; use it for the GitHub repo when created). The local folder deliberately stays `browser-plugins` — unpacked extension IDs are path-derived, so renaming the folder would orphan all dev `chrome.storage` data. Do not "fix" the mismatch. The internal `@browser-plugins/*` npm scope also stays (private, would churn ~10 config files for nothing).

## Commands

- Root: `pnpm build` / `pnpm typecheck` / `pnpm test` / `pnpm test:e2e` (tests run with `--workspace-concurrency=1` — e2e suites bind fixed ports and persistent Chromium profiles, keep them serial).
- `pnpm sites` runs all six site dev servers in parallel on pinned ports (begone 4321, cookiejar 4322, focaccia 4323, headerforge 4324, hopchase 4325, home 4326 — pinned in each site's `dev` script so the port↔site mapping is stable; the `./plugins/*/site` + `./sites/*` filter globs pick up future sites automatically). Plugin-site dev URLs include the base path: `localhost:432x/<slug>/`.
- `pnpm sites:build` builds all six sites and assembles the deployable tree into `_site/` (via `scripts/assemble-site.mjs`, gitignored); `pnpm sites:preview` serves `_site/` at `localhost:4330` (`scripts/serve-site.mjs`, no-dep static server) — the way to test path-based cross-site links before deploying.
- Per plugin: `pnpm cookiejar <script>` / `pnpm focaccia <script>` / `pnpm headerforge <script>` (directory filters, forward any script), or cd into the package.
- **Tests are always `vitest run`** — every package's `test` script is non-watch; use `test:watch` explicitly when you want watch mode. Never bare `vitest`/`pnpm test -w` in scripts.
- **Never run `playwright test` from the repo root** — e2e fixtures resolve `dist/` from the package cwd; always go through the package's `test:e2e` script or a `--filter`.

## Shared config

- Every extension tsconfig `extends` `@browser-plugins/config/tsconfig.base.json` and keeps only its deltas (`lib`, `jsx`, `types`, extra strictness). Keep configs `noEmit` and non-composite — `tsc -b` emits stray `.js` that breaks cookiejar's bddgen.
- Every `playwright.config.ts` spreads `baseConfig` from `@browser-plugins/config/playwright.base.js` (workers 1, serial, 30s, list reporter) and keeps only its deltas.
- Loading unpacked: each extension builds to `plugins/<name>/extension/dist/`. Unpacked extension IDs are path-derived — moving the folder changes the ID and orphans old dev `chrome.storage` data.

## Deployment (sites)

- **One domain, path-based**: `https://orchard.pearpages.com/` (root directory page from `sites/home`) + `/<slug>/` per plugin site. Chosen because GH Pages allows one custom domain per repo; supersedes the earlier `plugins.pearpages.com` decision. `SITE` in `packages/site-kit/src/plugins.ts` is the canonical URL constant.
- Each plugin site's `astro.config.mjs` sets `site: 'https://orchard.pearpages.com'` + `base: '/<slug>'`; the home site sets only `site`. Shared images (pear icon, plugin icons, favicons) are **ESM imports from `@browser-plugins/assets`** — hashed into `_astro/` with the base auto-prefixed; `withBase()` remains only for genuine per-site `public/` files (sole user today: focaccia's hero `focaccia-icon.png`). `OtherPlugins` sibling links are deliberately bare `/<slug>/` (path-root routing) and its footer links home (`/`).
- `.github/workflows/deploy-sites.yml` (push to main + workflow_dispatch): runs `pnpm sites:build` — the same script used locally — then deploys `_site/` via `upload-pages-artifact`/`deploy-pages`. Assembly logic lives ONLY in `scripts/assemble-site.mjs` (slugs derived from `plugins/*/site/dist` on disk, errors if a site package has no dist); keep the workflow free of assembly shell. `sites/home/public/CNAME` is self-documentation; the authoritative domain lives in repo Settings → Pages.
- **Manual go-live steps (user, not yet done)**: (1) `git push origin main`; (2) GitHub → orchard → Settings → Pages → Source: **GitHub Actions**; (3) same page → Custom domain `orchard.pearpages.com`, then Enforce HTTPS once the cert issues; (4) GoDaddy DNS for pearpages.com: CNAME record host `orchard` → `pearpages.github.io`; (5) first deploy runs on the push (or workflow_dispatch).
- **og:image cards**: every site passes an ESM-imported `src/assets/og.png` (1200×630, committed) to Layout's `image` prop → absolute `og:image` + width/height/alt + `twitter:card summary_large_image`. Cards are generated by `pnpm sites:og` (`scripts/generate-og.mjs`: Playwright chromium resolved out of `packages/config` via `createRequire`, renders an HTML template per site, screenshots it — never runs in CI). **Rerun `sites:og` + commit after changing copy in `plugin-data.ts`, a site palette, or an icon** — the script's THEMES table hand-mirrors each site's `theme.css` light tokens; icons come from each extension's native 128px PNG, not the 48px assets package.
- Card/registry text lives in `packages/site-kit/src/plugin-data.ts` (plain erasable TS, no image imports — importable by Node 24 scripts via type stripping; `plugins.ts` re-exports it and attaches icons; `homeCard` is the home site's title/tagline/blurb/description single source).

## Memory

- Shared/monorepo decisions go in this file; plugin-specific conventions and session logs go in `plugins/<name>/CLAUDE.md`. Update the relevant CLAUDE.md at the end of each session (finished + pending TODOs).

## Session log

### 2026-07-23 — og:image social cards for all six sites
- New `scripts/generate-og.mjs` + root `sites:og` script (see Deployment section): branded 1200×630 cards (accent top bar — headerforge's is the request/response split gradient —, 128px icon + name lockup, accent tagline, muted description, mono `orchard.pearpages.com/<slug>/` footer) written to each site's `src/assets/og.png` and committed. Layout gained `image?: ImageMetadata` → og:image/width/height/alt + twitter:card, plus unconditional `og:site_name "orchard"`; all six index.astro pass it.
- Registry split: `plugin-data.ts` (plain data, Node-importable) + `plugins.ts` (adds icons, API unchanged). Home's title/description deduped through the new `homeCard` (its card shows tagline + short `blurb` so the text doesn't repeat).
- Also: InstallSteps' default `repoUrl` now points at `https://github.com/pearpages/orchard` (`cd orchard`), replacing the `<this repo>` placeholder.
- Verified: six PNGs 1200×630 + eyeballed, typecheck green, `sites:build` green, `_site` pages emit absolute og:image URLs whose hashed files exist, git status clean of strays.

### 2026-07-23 — site polish: hero logo lockups + home-card descriptions
- The four logo-less plugin sites (begone, cookiejar, headerforge, hopchase) now show their 48px app icon inline before the hero `<h1>` (`.hero__logo`: inline `vertical-align: middle`, NOT flex on the h1 — flex would split multi-node wordmarks like `Hop<span>Chase</span>` apart with gaps; shadow via each site's token, none for headerforge which has no shadow token by design). Focaccia untouched (logo already on its sign).
- `PluginMeta` gained `description` (a sentence or two beyond the tagline, copy cribbed from each site's own hero pitch); home cards restructured to icon+name+tagline header row with the description below (`.tree__head`/`.tree__desc`).
- Verified: typecheck + `sites:build` green, all six pages screenshot-checked light+dark via Playwright against `sites:preview`.

### 2026-07-23 — `_site/` assembly extracted to a shared local script
- New root scripts `sites:build` (builds all six sites, then `scripts/assemble-site.mjs` assembles `_site/`) and `sites:preview` (`scripts/serve-site.mjs`, no-dep static server on port 4330 with trailing-slash redirects). `deploy-sites.yml` now just runs `pnpm sites:build` — local rehearsal and CI can no longer drift, and the hardcoded five-slug list is gone (slugs derived from `plugins/*/site/dist`, hard error if a site package has no dist). `_site/` added to `.gitignore`.
- Verified: `pnpm sites:build` green, all six pages + a hashed CSS asset 200 over `sites:preview`, `/hopchase` → `/hopchase/` 301, unknown path 404, missing-dist negative test exits 1.
- Hardened `serve-site.mjs` after a stale orphan caused `EADDRINUSE`: friendly port-in-use error with the `lsof -ti :4330 | xargs kill` recovery one-liner, and SIGINT/SIGTERM/SIGHUP handlers that exit immediately (deliberately not `server.close()` — keep-alive connections would delay port release).

### 2026-07-23 — `@browser-plugins/assets`: shared images, ~40 duplicate files deleted
- New `packages/assets` (source-shipped, subpath `exports`, no build): canonical `pearpages-icon.png` + `plugins/{slug}.png` (48px), seeded by `git mv` from existing copies (focaccia's 48px only existed as the site copy — its extension icons are build-generated). Killed the 12× pear-icon and 6-8× plugin-icon duplication.
- Consumption per stack: **sites/site-kit** import the PNGs as ESM (registry `PluginMeta.icon` is now `ImageMetadata`; `OtherPlugins`/`AuthorCard` use `.src`; `Layout` gained a `favicon` prop defaulting to the pear — per-site `public/favicon.png` copies deleted, each site passes its own icon's `.src`). **React extensions** import the pear in the credit footer (`src={pearIcon}`, Vite emits hashed). **esbuild extensions** (begone/focaccia) copy it in `build.mjs` via `fileURLToPath(import.meta.resolve('@browser-plugins/assets/pearpages-icon.png'))`.
- Deleted: every site's `public/plugins/` dir, `public/pearpages-icon.png`, `public/favicon.png`, and all five extension pear copies. Kept: `sites/home/public/CNAME`, focaccia's unique 128px `focaccia-icon.png` (still via `withBase`).
- Verified: root build/typecheck/test green (137+72+30+53), `_site/` reassembled + served over HTTP (all six pages render, icons/favicons as hashed `/<base>/_astro/*` URLs, cross-links intact), pear icon confirmed in all five extension dists + popup screenshots. Not committed (changes staged).

### 2026-07-22 (night, latest+2) — sites deployment prepared (orchard.pearpages.com), hopchase site, focaccia on site-kit
- Full deployment prep for path-based hosting at `orchard.pearpages.com` (see the new Deployment section above). site-kit: `SITE` constant updated, hopchase added to the registry, `Layout` gained canonical + og:url, `OtherPlugins` gained an "Explore the whole orchard →" home link. All plugin-site astro configs got `site` + `base: '/<slug>'`.
- **New `plugins/hopchase/site`** (`@hopchase/site`, port 4325): wire-blue `--hc-*` theme from the extension's popup tokens (incl. status colors), hero = faux browser window with a 4-hop redirect chain (colored status pills, chain connectors, issue chips), six feature cards, InstallSteps/OtherPlugins/AuthorCard. `hopchase.png` (icon-48 copy) fanned out to every site's `public/plugins/`.
- **Focaccia site refactored onto site-kit**: Layout/InstallSteps/OtherPlugins/AuthorCard, `--sk-*` token mapping, `withBase()` for its previously root-absolute assets, both stale `apps/extension` paths fixed, `public/plugins/` added. Awning/hanging-sign hero and SVG cards kept verbatim (the brand). Light-only stays.
- **New `sites/home`** (`@orchard/home`, port 4326, new `sites/*` workspace glob): orchard-branded directory page — pear-green `--oc-*` theme, pear icon hero, five plugin cards from the registry, CNAME file. Root `sites` script now includes it.
- **New `.github/workflows/deploy-sites.yml`** (see Deployment section). **Nothing committed or pushed — user's explicit call; they push when ready.**
- Verified: install/build/typecheck/tests green (14 workspace projects, 137+72+30+53), workflow assembly rehearsed locally and served over HTTP — `/` + all five `/<slug>/` render styled, cross-links and canonicals correct (screenshot-checked home/hopchase light+dark, focaccia, begone), `pnpm sites` smoke: six dev servers 200.

### 2026-07-22 (night, latest+1) — begone popup restyle (icon-blue theme)
- Begone's popup was restyled after user feedback: `--be-*` tokens keyed to the app icon's flat blue `#2d9cdb` (user rejected red for the popup), dark mode added (no longer the light-only outlier), header mark is now an inline currentColor SVG ✕, focaccia-level polish throughout (pills, focus rings, card rows, hover strikethrough motif). Details in `plugins/begone/CLAUDE.md`. Open follow-up: begone's promo site still uses the red palette — now diverges from the popup.

### 2026-07-22 (night, latest) — branded popup headers in all plugins (focaccia pattern)
- Monorepo-wide consistency pass: begone, cookiejar, headerforge, and hopchase popups now open with a focaccia-style branded header — full-bleed banner in each plugin's own accent color (begone red `#c0392b` gradient, cookiejar `--cj-accent` amber, headerforge `--accent-request` blue, hopchase `--accent` blue), holding the plugin's 26px app icon on a white chip, the name, and a static tagline ("Element remover" / "Cookie manager" / "Header editor" / "Redirect inspector"), white text, `rgba(0,0,0,0.18)` bottom border. Same philosophy as the credit footer: identical structure, per-plugin classes/tokens. Focaccia unchanged (its toggle/status header is the reference). Cookiejar's contextual site bar stays below the new `popup__brand`; hopchase's Tabs stay inside `app__header` under the new `app__brand` row.
- Verified: root typecheck/build/test green (137+72+30+53), e2e green (hopchase 5, headerforge 3, cookiejar 19), all four popups screenshot-checked light+dark (begone light-only) via `--load-extension`.

### 2026-07-22 (night, later still) — `pnpm sites` root script
- New root script `sites` (`pnpm -r --parallel --filter "./plugins/*/site" dev`) starts all four promo-site dev servers at once; each site's `dev` script now pins its port (4321–4324 alphabetical) so URLs are stable instead of racing Astro's auto-increment. Verified all four ports serve the right site (title check) and `pnpm -r build` stays green.

### 2026-07-22 (night, later) — begone promo site + site-kit registry entry
- New `plugins/begone/site` (`@begone/site`) on site-kit, cloned from cookiejar/site's shape. "Vanishing act" theme (`--be-*`): the extension's red `#c0392b` accent on minimal white/neutral tokens, mono for selectors; hero = faux browser window with struck-through banished DOM lines + rule chips; six text-only cards; dedication to Christophe in the AuthorCard slot. Begone added to `packages/site-kit/src/plugins.ts` (slug union + entry) and `begone.png` copied into cookiejar's + headerforge's + its own `public/plugins/`.
- Verified: `pnpm -r build`/typecheck/test green (12 workspace projects, 137+72+30+53), site screenshot-checked light+dark over HTTP, sibling sites' OtherPlugins strip shows Begone. Deployment (base/site config, GH Pages) still parked monorepo-wide.

### 2026-07-22 (night) — fifth plugin: Begone integrated from standalone repo
- `plugins/begone` (user-managed CSS-selector element remover, popup + content script) arrived as a copied-in standalone npm repo — its nested `.git` made the monorepo see it as one opaque gitlink, so nothing inside was trackable. Deleted the nested `.git` (standalone history discarded, user's call) + npm lockfile/`node_modules`/local `.gitignore`/`.nvmrc`, moved the package to `plugins/begone/extension` (`@begone/extension`), and aligned it to focaccia's conventions: `scripts/build.mjs` (esbuild API + staticFiles), shared tsconfig base, monorepo dep versions, root `begone` filter script, pearpages credit footer in the popup. Deliberate delta: flat layout (statics at package root, not `src/`) and no tests yet — see `plugins/begone/CLAUDE.md`.
- Verified: root build/typecheck green (11 workspace projects), unit tests 137+72+30+53 green, popup screenshot-checked light+dark via `--load-extension`. Not committed yet.

### 2026-07-22 (evening, later) — consistent pearpages credit in all four popups
- Every extension popup now ends with the same footer credit: 16px pear icon + "Made by [pearpages](https://pearpages.com)" (popup-scale mirror of site-kit's `AuthorCard`; link text "pearpages" per focaccia's pre-existing credit). Focaccia had the text link already and gained the icon (asset at `src/popup/pearpages-icon.png` + `build.mjs` staticFiles entry); the three React plugins gained footer + icon (`public/pearpages-icon.png`, referenced as `/pearpages-icon.png`), styled per each plugin's own tokens (`.popup__credit` in cookiejar, `.credit` in headerforge/hopchase).
- Verified: root build + typecheck green, all unit tests green (137+72+30+53), all four popups screenshot-checked light+dark via `--load-extension`.

### 2026-07-22 (evening) — monorepo named "orchard" + HopChase parity pass
- Named the monorepo **orchard** (pears → orchard → pearpages brand). Names-only scope: root package.json name, README title/tagline, this file's heading. Folder and `@browser-plugins/*` scope intentionally unchanged (see Toolchain note). Future GitHub repo: `orchard`.
- HopChase reached full Redirect Path (Ayima) parity: added `core/export/text.ts` (plain-text chain copy) + "Copy chain" button, and server IP display in the hop's expanded panel. 53 unit + 5 e2e green. Safe to uninstall the original extension once HopChase is loaded unpacked.

### 2026-07-22 (later still) — new plugin: HopChase (redirect-chain inspector)
- New `plugins/hopchase/extension` (`@hopchase/extension`), cloned structurally from headerforge (React 19 + Vite 8 + crxjs, vite port **5174**). Reconstructs main-frame redirect chains from observational `webRequest` events via a pure reducer in `src/core/` (zero chrome mocks — events are plain literals); client redirects (meta/JS) linked via `webNavigation` `client_redirect` qualifier + candidate/merge logic; 8 SEO issue rules; on-demand URL tracer (SW `fetch redirect:'follow'` + marker header self-observed through webRequest — `redirect:'manual'` is opaque by spec); JSON/CSV/HAR/curl exporters; history ring buffer. Live state in `storage.session`, history/settings in `storage.local`, storage-as-bus (single sendMessage exception for the trace trigger, documented in the plugin CLAUDE.md).
- Verified: 51 unit + 5 e2e green (local redirect server: chain/loop/meta/tracer/canonical), root build/typecheck/test all-packages green, popup screenshot-checked light+dark.
- Empirical gotchas recorded in `plugins/hopchase/CLAUDE.md`: `onBeforeRequest` re-fires per redirect hop with the same requestId; Playwright's `serviceworker` event fires before the SW module finishes evaluating (e2e fixtures must ping the worker before navigating or the first webRequest events are lost).
- **Pending:** hopchase promo site + site-kit registry entry; subresource tracking UI; DevTools panel; settings UI; not committed to git yet. Re-load unpacked extensions still pending from the migration.

### 2026-07-22 (later) — promo sites for CookieJar + HeaderForge, shared site-kit
- New `packages/site-kit` (`@browser-plugins/site-kit`): shared Astro components shipped as source (no build step) — `Layout` (head shell + favicon/og via `withBase()`), `OtherPlugins` (cross-plugin strip fed by the `plugins.ts` registry), `AuthorCard` (pearpages credit + slot), `InstallSteps` (clone → pnpm install → build → load unpacked). Components style themselves ONLY via `--sk-*` custom properties with fallbacks; each site maps its own tokens onto `--sk-*` in `theme.css`. `paths.ts::withBase()` normalizes `import.meta.env.BASE_URL` so the same components will work under `/​<slug>` bases when deployment lands.
- New `plugins/cookiejar/site` (`@cookiejar/site`, pantry-jar theme: serif display, amber/warm-paper palette from the extension's `_variables.scss`, SVG glass-jar hero, dark via `prefers-color-scheme`) and `plugins/headerforge/site` (`@headerforge/site`, wire-truth theme: mono headings, request-blue/response-teal from the popup's `base.scss`, hero = HTTP exchange with injected headers highlighted, "DevTools lies" callout). Both seeded from the extension READMEs; each site's `public/` carries copies of all three 48px plugin icons + pearpages icon.
- Astro gotcha (bit twice): a line break before an inline element inside prose collapses the preceding space ("enableDeveloper mode") — keep `text <strong>/<a>` on one line.
- Verified: `pnpm -r build` green (3 extensions + 3 sites), typecheck green, unit 137+72+30 green; both sites screenshot-checked light+dark over HTTP.
- **Decided & pending (next stage):** GitHub Pages hosting, path-based on ONE domain `plugins.pearpages.com/<slug>/` + minimal root index site (GoDaddy CNAME `plugins` → `pearpages.github.io`; subdomains rejected — GH Pages = one custom domain per repo). Still to do: refactor focaccia site onto site-kit (and fix its two stale `apps/extension` paths), `sites/index` root page, `base`/`site` in astro configs, `.github/workflows/deploy-sites.yml`, create GitHub repo "orchard" + push, Pages + DNS setup. Also parked: product screenshots for the sites.

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
