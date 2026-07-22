# Begone

Chrome MV3 extension that auto-removes user-defined DOM elements the instant they appear. No selectors are shipped in the code: the user manages a global CSS-selector list in the toolbar popup (`popup.html` / `src/popup.ts`), persisted in `chrome.storage.sync` (key `selectors`, helpers in `src/storage.ts`). The content script (`src/content_script.ts`) loads the list, removes matches on load and via a MutationObserver, and picks up popup edits live through `chrome.storage.onChanged`.

## Conventions

- Lives in the orchard monorepo (2026-07-22) as `plugins/begone/extension` (`@begone/extension`) plus `plugins/begone/site` (`@begone/site`, Astro promo site on `@browser-plugins/site-kit`), vanilla TS + esbuild like focaccia. pnpm only — run scripts from inside the package or via `pnpm begone <script>` from the root; always `pnpm install` from the root (toolchain via `mise x --`).
- Build with `pnpm begone build` (`scripts/build.mjs`: esbuild multi-entry + staticFiles copy, mirroring focaccia's) → `dist/`; load `dist/` unpacked in Chrome. `pnpm begone typecheck` = `tsc --noEmit` (tsconfig extends `@browser-plugins/config/tsconfig.base.json`).
- Flat layout (deliberate — single popup page): `manifest.json`, `popup.html`, `popup.css`, `icons/`, `pearpages-icon.png` sit at the package root, entries in `src/`. `build.mjs` copies statics from the package root, not `src/`.
- Extension display name: **Begone** (manifest `name` and `action.default_title`); package name: `@begone/extension`.
- No inline styles or CSS-in-JS — popup styling lives in `popup.css` with block-element classNames (`popup__*`); visibility is toggled with the `hidden` attribute. Popup ends with the monorepo-standard pearpages credit footer (`.popup__credit`, 16px pear icon + "Made by pearpages"). Light theme only — no dark variant (unlike the other plugins).
- No tests yet (the only plugin without a vitest/playwright suite — no `test` script, so `pnpm -r test` skips it).

## Session log

### 2026-07-22 — Astro promo site (`@begone/site`) on site-kit
- New `plugins/begone/site`, cloned from cookiejar/site's shape (site-kit `Layout`/`InstallSteps`/`OtherPlugins`/`AuthorCard`, empty `defineConfig` until deployment lands). Theme "vanishing act" (`--be-*` tokens in `src/styles/theme.css`): the extension's red `#c0392b` as accent, white surface, `#eee`/`#888` neutrals, system-ui body + mono for selectors; dark block included (site convention, even though the popup is light-only). Hero = faux browser window showing a DOM snippet with `.cookie-banner`/`#newsletter-popup` lines struck through in red + "✕ banished" rule chips; six text-only feature cards (headerforge-style, no SVG icons — fits the minimal brand). AuthorCard slot carries the README's dedication to Christophe.
- Registered begone in `packages/site-kit/src/plugins.ts` (slug union + registry entry, alphabetical-first) and added `public/plugins/begone.png` (copy of `icon48.png`) to cookiejar's, headerforge's, and begone's own site so `OtherPlugins` resolves everywhere.
- Verified: `pnpm -r build` green (12 workspace projects incl. all four sites), typecheck + unit tests green (137+72+30+53), begone site screenshot-checked light+dark over HTTP, headerforge's OtherPlugins strip confirmed showing Begone.
- **Pending:** deployment (base/site config, GH Pages) still parked monorepo-wide; product screenshot for the site.
- Deleted the nested standalone `.git` (history discarded by user decision — the folder had been copied in and git treated it as an opaque embedded repo/gitlink) along with npm artifacts (`package-lock.json`, own `node_modules`), local `.gitignore`, and `.nvmrc` (root `.gitignore`/`mise.toml` own those concerns).
- Moved the package to `plugins/begone/extension/` (workspace glob is `plugins/*/extension`); renamed `begone` → `@begone/extension`; deps bumped to monorepo versions (esbuild 0.28, @types/chrome 0.2.2, TS 7.0.2; rimraf dropped); inline esbuild CLI scripts replaced by `scripts/build.mjs` (focaccia's pattern, target chrome115 → chrome120); tsconfig now extends the shared base (the extra strictness surfaced no errors); root `package.json` gained the `begone` filter script.
- Added the pearpages credit footer to the popup (pear icon copied from focaccia).
- Verified: root build + typecheck green (11 workspace projects), all unit tests green (137+72+30+53), popup screenshot-checked light+dark via `--load-extension` in disposable Chromium (storage.sync round-trip incidentally proven by the duplicate-selector validation firing across pages).
- **Pending TODOs:**
  - Manual test in Chrome: load `plugins/begone/extension/dist` unpacked and re-add the desired selectors via the popup.
  - Add a vitest suite (storage helpers + selector validation are pure and easy to cover) to match the other plugins.
  - Not committed to git yet.



### 2026-07-22 — User-managed selectors via popup

- Removed the hardcoded `TARGETS` selectors from the content script; the extension is now a neutral, general-purpose element remover.
- Added a toolbar popup (`popup.html`, `popup.css`, `src/popup.ts`): form to add selectors (validates syntax, rejects duplicates/empties), list with per-entry delete. New `src/storage.ts` wraps `chrome.storage.sync` (global list, key `selectors`).
- Content script now loads selectors from storage and reacts to `chrome.storage.onChanged`, so popup edits apply to open tabs without reload.
- Manifest: added `"permissions": ["storage"]` and `action.default_popup`. Build: esbuild multi-entry (`content_script.ts` + `popup.ts` → `--outdir=dist`), static copy includes `popup.html`/`popup.css`.
- Verified: `npm run build` and `npx tsc --noEmit` pass; `dist/` complete; bundle contains no `ev-open-modal` strings.
- README: added a usage example with *generic* selectors only (`.cookie-banner`, `#newsletter-popup`). Decision: never document the real selectors in the repo — they live only in the user's `chrome.storage.sync`, keeping the codebase neutral.
- **Pending TODOs:**
  - Manual test in Chrome: reload the unpacked extension, re-add the desired selectors via the popup (they no longer ship with the code).
  - ~~Optionally rename the repo folder `news-plugin` → `begone`~~ (superseded 2026-07-22: lives at `plugins/begone/` in the orchard monorepo).

### 2026-07-22 — Rename to "Begone"

- Renamed the project from "Auto-Remove Element" to **Begone** (chosen over Poof, Nix, Vanish). Updated `manifest.json`, `package.json`, and `README.md`; rebuilt `dist/`.
- **Pending TODOs:**
  - ~~Optionally rename the repo folder `news-plugin` → `begone`~~ (superseded 2026-07-22: lives at `plugins/begone/` in the orchard monorepo).
  - Reload the extension in chrome://extensions to see the new name.
