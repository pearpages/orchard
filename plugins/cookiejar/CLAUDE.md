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

### 2026-07-21 (v2.1) — Global Cookie Manager gap-closing
Compared against Global Cookie Manager (web research) and implemented the three gaps it still had on us:
- **CSV export/import + EditThisCookie interop**: `serializeCookiesCsv`/`parseCsv`/`parseImportAuto` in `src/lib/importExport.ts` (hand-rolled RFC-4180, per-row errors); ImportDialog auto-detects JSON vs CSV and accepts `.csv`; toolbar now has "Export JSON" + "Export CSV". ETC arrays already parsed via `draftFromRaw` (incl. `sameSite: null` quirk) — covered by tests.
- **Remember last search / UI state**: `src/lib/uiState.ts` (`uiState` key in chrome.storage.local: managerQuery/managerView/selectedDomain); Manager restores on mount (hash deep links win over stored view) and saves debounced 300 ms — guard against saving before the initial load resolves.
- **Pagination**: Manager renders 50 domain groups + "Show N more domains"; DomainGroup caps at 100 rows + "Show all N cookies"; caps reset on filter change.

**Done:** 101 unit tests, 17 e2e scenarios, build green. Remaining known deltas vs GCM: none feature-wise; CookieJar is still unpublished (load-unpacked only).

### 2026-07-21 (v2.2) — Cookie Editor parity (CLI interop)
Added Netscape `cookies.txt` export/import (`serializeNetscape`/`parseNetscape` in importExport.ts; `#HttpOnly_` curl convention, `0` expiry = session; `parseImportAuto` now detects JSON → Netscape → CSV), plus per-domain **Copy Cookie header** and **Copy cURL command** (single-quote shell escaping). New shared `ExportMenu` dropdown replaces the flat export buttons (toolbar: JSON/CSV/cookies.txt; domain header: JSON/cookies.txt/copy-header/copy-cURL as `role="menuitem"` — e2e clicks menu items by exact name after opening the menu). ImportDialog accepts `.txt`.

**Done:** 108 unit tests, 18 e2e scenarios; verified real `curl 8.7.1 -b cookies.txt` consumes our export (echo-server test — beware: node `execSync` + in-process server deadlocks, run curl from a separate shell). User's goal: uninstall both Cookie Editor and Global Cookie Manager — CookieJar now covers both fully.

### 2026-07-21 (v2.3) — AI "Explain this cookie"
Added an AI explainer in the expanded cookie row (`src/lib/ai/` + `AiPanel`/`AiSettingsDialog`). Backends: Chrome built-in AI (Gemini Nano Prompt API, on-device) preferred, Claude API fallback (BYOK). New conventions:
- **PRIVACY INVARIANT (load-bearing, tested):** only cookie *metadata* is sent to any AI backend — never the raw value. `src/lib/ai/context.ts::buildCookieContext` describes the value (length, format guess, JWT alg + claim *names* + timing) but `tests/lib/aiContext.test.ts` asserts the raw value and JWT claim *values* never appear. Don't add the value to the context.
- **BYOK key** lives in `chrome.storage.local` key `aiSettings` (`src/lib/ai/settings.ts`); default model `claude-opus-4-8`. Never log or transmit it anywhere but the Anthropic API.
- **`@anthropic-ai/sdk` is lazy-imported** inside `claudeAi.ts` (`await import(...)`) so its ~155 kB chunk (`dist/assets/sdk-*.js`) only loads when Claude is actually used — keeps popup/manager startup light. Uses `dangerouslyAllowBrowser: true` (extension page = user's own env, own key).
- On-device wrapper (`chromeAi.ts`) feature-detects the `LanguageModel` global; every failure → 'unavailable'. Orchestrator (`ai.ts`) falls back on-device→Claude mid-call if a key exists, throws `AiUnavailableError` when neither is configured (UI shows setup).

**Done:** 126 unit tests, 19 e2e scenarios, build green (SDK chunk confirmed split/lazy). AI panel + settings verified via screenshots. StorageRow AI = future (cookie-only for now).

### 2026-07-21 (v2.3.1) — on-device AI availability fix
Bug: `chromeAi.builtInAvailability()` mapped Gemini Nano's `"downloadable"` state to unusable and the orchestrator only acts on `"available"`, so a capable-but-not-downloaded machine got stuck showing "not available" with no way forward. Chrome on-device AI needs Chrome 138+ on Win10+/macOS13+/Linux, 4 GB+ VRAM GPU, ~22 GB disk, `chrome://flags/#prompt-api-for-gemini-nano` enabled, AND the model downloaded (extensions get the API without an origin trial, but flag+download still apply).
Fix: added `builtInStatus() → {state, reason: 'ready'|'downloadable'|'no-api'|'unavailable'}` and `downloadBuiltIn(onProgress)` (calls `LanguageModel.create({monitor})` from a user gesture) in `src/lib/ai/chromeAi.ts`. `AiSettingsDialog` now shows state-specific guidance: a **Download on-device model** button with % when downloadable, the flag/version instructions when no-api, the hardware requirements when unavailable, ready ✓ when available. Messaging everywhere reinforces "add a Claude API key" as the reliable cross-machine path. Console check for diagnosis: `await LanguageModel?.availability()`.

**Done:** 137 unit tests (new chromeAi.test.ts + AiSettingsDialog.test.tsx), 19 e2e, build green. Downloadable-state dialog verified via screenshot.
