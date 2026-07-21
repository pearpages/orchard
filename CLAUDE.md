# CookieJar — project conventions

Chrome extension (MV3) cookie manager for developers. React 19 + TypeScript + Vite 8 + @crxjs/vite-plugin. See README.md for features and commands.

## Conventions (team decisions)

- **Styling**: SCSS files only, imported per component (`Component.tsx` + `component.scss`), BEM class names (`.cookie-row__action--danger`). No inline styles, CSS-in-JS or style objects. Design tokens live in `src/styles/_variables.scss` as CSS custom properties (`--cj-*`); dark mode is `prefers-color-scheme` only.
- **Cookie identity**: always use `cookieKey()` from `src/lib/cookies.ts` (`storeId|domain|path|name|partitionKey.topLevelSite`). Never hand-build keys.
- **All chrome.cookies quirks stay in `src/lib/cookies.ts`** (URL reconstruction, host-only = omit `domain`, session = omit `expirationDate`, `__Host-`/`__Secure-` validation, partitionKey passthrough). UI code never calls `chrome.cookies` directly.
- **Destructive UX policy**: single delete = instant + undo toast; domain delete = ConfirmDialog + undo; delete-everything = type `DELETE` + undo. Bulk deletes go through `partitionForBulkDelete()` and must report "n protected kept".
- **Node**: use the version in `.node-version` (installed via mise). `node`/`npm` are not on the default non-interactive PATH — use `export PATH="$HOME/.local/share/mise/installs/node/22.23.1/bin:$PATH"` in scripts.
- **TypeScript**: single `tsconfig.json` (noEmit) covering src/tests/e2e/configs; build script runs `tsc --noEmit && vite build`. Don't reintroduce `tsc -b`/composite — it emits stray `.js` files that break bddgen.
- **Tests**: unit = Vitest (`npm test -- --run`), config in `vitest.config.ts` (kept separate from `vite.config.ts` so the crx plugin doesn't run under vitest). The chrome API mock is `tests/chromeMock.ts`; RTL cleanup is manual in `tests/setup.ts` (globals disabled). E2E = playwright-bdd Gherkin features in `e2e/features/` + steps in `e2e/steps/`; `.features-gen/` is generated, never edit or commit it.
- **E2E gotchas**: extension loads only with `channel: 'chromium'` persistent context; extension id comes from the service worker URL. Row-action buttons are matched with `getByRole('button', { name, exact: true })` — non-exact matches also hit the row summary (its accessible name contains the button labels). Cookie values must not contain `;`.
- **@types/chrome 0.2.x**: `SameSiteStatus` is an enum; use `chrome.cookies.Cookie['sameSite']` for the string-union type. `browsingData.RemovalOptions.origins` is typed as a non-empty tuple — cast after a length guard.
- **`src/lib/pageStorage.ts` owns `chrome.scripting`** — injected funcs must be self-contained (they're stringified) with JSON-serializable args; pre-filter with `isInjectableTab` and try/catch every injection. localStorage mutations target the origin's first tab; sessionStorage mutations target a specific tab.
- **`src/lib/timeline.ts` owns the `chrome.storage.session` keys** (`timeline`, `timelinePaused`, plus `snapshot` in snapshot.ts). The SW's onChanged listener registers synchronously at top level and serializes ring-buffer writes through a promise chain.
- **Deep clean never sends `cookies: true` to `browsingData.remove`** — it would wipe registrable domains and bypass protection; cookies go through `partitionForBulkDelete` + `removeCookies`. browsingData origins are exact (no wildcards) — `buildOriginList` collects hosts from the cookie jar and open tabs.
- **Manager views** switch via `#view=cookies|storage|timeline` — read at mount AND on `hashchange` (goto on an open page only fires hashchange, no reload).

## Session log

### 2026-07-21 — initial build
Built the whole extension from an empty repo: core lib + hooks, popup + manager UI, protection/pinning, import/export, ConfirmDialog/Toast-undo flows, dark mode, icons (generated PNGs in `public/icons/`).

**Done:** 47 unit tests passing (`npm test -- --run`), 9 Gherkin e2e scenarios passing (`npm run test:e2e`), production build loads as unpacked extension. UI verified via screenshots (light/dark, editor drawer, popup).

**Pending / ideas for next sessions:**
- Manual QA in real Chrome (load `dist/`, browse real sites, verify popup on a live tab).
- Popup e2e coverage (needs a real active tab; consider a `?url=` test override or fixture tab).
- Undo currently restores cookies best-effort; no undo for re-imported partitioned failures.
- Possible features: badge count on the toolbar icon, PSL-accurate registrable-domain grouping (current heuristic is suffix matching), tab storage included in snapshots, storage import.
- No git commits made yet (user hasn't asked); repo is untracked files only.

### 2026-07-21 (later) — v2: storage, JWT, timeline, deep clean
Added the four v2 features: **Storage inspector** (localStorage/sessionStorage of all open tabs via chrome.scripting, grouped by origin, edit/delete/add/export/clear with undo; popup gets a Storage tab), **JWT/token decoder** (`src/lib/token.ts` + TokenPanel, badges in cookie and storage rows), **Timeline + snapshot/diff** (SW records cookies.onChanged into storage.session ring buffer; pause, filter, clear; snapshot→diff view), **Deep clean** (browsingData per-origin wipe with checkbox dialog, protection-respecting optional cookie delete). Manager gained sidebar navigation (Cookies | Storage | Timeline, deep-linkable via `#view=`). Permissions added: `scripting`, `browsingData`.

**Done:** 90 unit tests, 15 Gherkin e2e scenarios (new: storage.feature, jwt.feature, timeline.feature, deep-clean.feature; e2e fixtures gained a worker-scoped static HTTP server on 127.0.0.1). Screenshots verified light+dark for all new views.
