# HeaderForge — project notes for Claude

ModHeader-style Chrome extension (MV3). See README.md for user-facing docs and architecture.

## Conventions & key decisions

- Package manager: **pnpm** (node 24 + pnpm 11 pinned in the monorepo root `mise.toml` via mise).
- Header modification uses **declarativeNetRequest dynamic rules** — blocking webRequest does not exist in MV3. The service worker does a full atomic replace (remove all ids, add rebuilt rules); no rule diffing.
- `src/core/` must stay **pure and chrome-free** (types-only references to `chrome.*` are fine — @types/chrome uses template-literal string unions, so string literals are assignable). All unit tests target this layer; no chrome mocks exist or should be needed.
- Popup ↔ service worker communicate **only through `chrome.storage.local`** (`onChanged` is the bus). Do not add runtime messaging.
- Styling: per-component `.scss` files, block-element classNames (`.header-row__name-input`). No inline styles, no CSS-in-JS.
- `remove` header operations must **omit the `value` key entirely** — DNR hard-errors otherwise (pinned by a unit test).
- One DNR condition holds a single `urlFilter`/`regexFilter`, so N URL filters fan out to N rules with identical actions.
- Tests: `pnpm test` = `vitest run` (never bare watch mode). `pnpm e2e` builds then runs Playwright (persistent context + `--load-extension`, real echo server; DevTools does not show DNR-modified headers, so wire-level verification is the only honest check). The Toggle's real checkbox is hidden — e2e clicks `.toggle__track`.
- The echo server teardown needs `closeAllConnections()` (Chromium keep-alive sockets hang plain `close()`).

- Popup theming: colors are **CSS custom properties** defined in `base.scss` (`:root` + `prefers-color-scheme: dark` block); SCSS variables only hold static tokens (spacing, radius, `$font-mono`). Header sections set `--section-accent`/`--section-accent-soft` via `--request`/`--response` modifiers — child components (Toggle, PresetMenu, HeaderRow) read `var(--section-accent, fallback)` for direction coding.
- Icon workflow: edit `public/icons/icon.svg`, run `pnpm icons` (renders PNGs via Playwright's Chromium, `scripts/render-icons.mjs`). Never hand-edit the PNGs.
- Presets live in `src/core/presets.ts` (pure data). Menu labels must stay unique per section (unit-tested); the e2e clicks presets by label.

## Session log

### 2026-07-22 — branded popup header (monorepo consistency pass)
- Popup gained an `app__header` banner before `ProfileTabs`: full-bleed `var(--accent-request)` blue, `/icons/icon.svg` at 26px on a white chip (`app__mark`), "HeaderForge" + tagline "Header editor", white text. Dark mode adapts via the token. 3 e2e + 30 unit green; screenshot-verified light+dark.

### 2026-07-22 — pearpages credit footer
- Monorepo-wide consistency pass: popup gained a `.credit` footer (16px pear icon at `public/pearpages-icon.png` + "Made by pearpages" → pearpages.com) after `ImportExport`, styled in `App.scss` with the existing tokens.

### 2026-07-20 — initial build (complete)

Built the entire extension from scratch: scaffold (Vite 8 + crxjs 2.7 + React 19 + TS 7), pure core (`types/state/rules/url-filters/serialization`), storage wrapper, service worker with badge + error fallbacks, full popup UI (profiles, request/response headers, URL filters, import/export), 26 unit tests, 2 Playwright e2e tests. All green: `pnpm test`, `pnpm build`, `pnpm e2e`.

### 2026-07-20 (later) — v2: visuals, icon, presets (complete)

- Visual overhaul: system-aware light/dark via CSS custom props; signature = direction-coded sections (request blue `→`, response teal `←`), monospace name`:`value inputs with a literal colon separator, direction-tinted row rail, refined tabs (accent underline + active dot), footer bar. Verified by Playwright screenshots in both schemes.
- Real icon: `icon.svg` (stacked header lines, top line becomes outbound arrow) + `pnpm icons` render script.
- Presets: `src/core/presets.ts` (12 request, 7 response incl. remove-CSP/X-Frame-Options), `PresetMenu` popover per section, `<datalist>` name autocomplete. 4 new unit tests, 1 new e2e test (CORS preset verified on the wire).
- All green: 30 unit tests, typecheck, build, 3 e2e tests.

Pending / ideas (not committed to):
- No git commits made yet (user has not asked to commit).
- Possible follow-ups: per-header comments, profile duplication, keyboard shortcuts, options page.
