# Focaccia — Project Notes

Chrome extension (Manifest V3), branded **Focaccia** (slogan: "Closed for focus"): site blocklist with master on/off switch + Pomodoro timer. See [README.md](README.md) for features, install, and architecture.

## Conventions

- Lives in the browser-plugins monorepo (2026-07-22) as `plugins/focaccia/extension` and `plugins/focaccia/site` (Astro promo site, static, no deployment wiring yet; design tokens hand-copied from `blocked.css` into `site/src/styles/theme.css`). Node/pnpm are pinned in the monorepo root `mise.toml`; run scripts from inside a package or via `pnpm focaccia <script>` from the root. Always `pnpm install` from the root.
- TypeScript (strict) bundled with esbuild via `pnpm build` (in `extension/`) → `extension/dist`; `pnpm typecheck` before committing.
- Unit tests with Vitest (`pnpm test` = `vitest run`; `pnpm test:watch` for watch mode), colocated as `src/**/*.test.ts`, written in Gherkin style (`Feature`/`Scenario` describes, `Given … When … Then …` test names). Logic under test must be pure — chrome-API modules stay thin and delegate (`rules.ts`, `pomodoro-logic.ts`, `dial-view.ts`).
- E2E with Playwright (`pnpm test:e2e`, specs in `extension/e2e/*.e2e.ts`, same Gherkin naming): disposable Chromium loads the built dist via `--load-extension`, a local server plays `blocked.test` via `--host-resolver-rules`, and service-worker state is asserted with `worker.evaluate`. Vitest excludes `e2e/**` (see `vitest.config.ts`); Playwright runs `workers: 1` because each test owns the fixed site port.
- No framework: each popup section is a module exposing `init()` + `render(state)`; state lives in `chrome.storage` and the popup re-renders on `storage.onChanged` (declarative, one-way flow).
- Styles in plain `.css` files, one per section (`src/popup/css/`), BEM-style class names, no inline styles.
- Blocking is done only with `declarativeNetRequest` dynamic rules, always re-derived in full from storage (`syncBlockingRules`), never edited incrementally.
- Pomodoro timing lives in the background worker on `chrome.alarms` (survives service-worker suspension); the popup only displays state and sends commands.
- Design language: enamel kitchen-timer — cream/tomato palette, `ui-rounded` display type, dial with 60 ticks. Blocked page is a hanging "Closed for focus" sign. Icon = dimpled focaccia loaf on the enamel-red tile (`make-icons.mjs`). pearpages appears as an author credit only (popup + site footers link to pearpages.com; both show the 16px pear icon, resolved from `@browser-plugins/assets` — the popup copy lands in `dist/popup/` via `build.mjs`'s `import.meta.resolve`, no local file) — an indigo blog-theme restyle was tried on 2026-07-20 and deliberately reverted; do not reintroduce it.
- Node and pnpm are pinned in the monorepo root `mise.toml` (node 24, pnpm 11). pnpm 11 blocks dependency build scripts by default; approved ones live under `allowBuilds` in the root `pnpm-workspace.yaml`.

## Session log

### 2026-07-23 — shared assets package
- Pear icon + plugin icons deduped monorepo-wide into `@browser-plugins/assets`: extension `build.mjs` resolves the pear from the package (local `src/popup/pearpages-icon.png` deleted); the site's favicon is now the imported 48px icon passed to Layout's `favicon` prop, and `public/plugins/` + `public/pearpages-icon.png` + `public/favicon.png` are gone. Only `public/focaccia-icon.png` (unique 128px hero) remains site-local.

### 2026-07-22 (deployment prep) — site refactored onto site-kit
- `site/` now uses `@browser-plugins/site-kit` like the other plugin sites: Layout (head/canonical/favicon), InstallSteps (`distPath="plugins/focaccia/extension/dist"` — fixes the stale `apps/extension/dist`), `OtherPlugins current="focaccia"` (cross-links all siblings + orchard home), AuthorCard. `theme.css` gained the `--sk-*` hook mapping (accent = `--red-deep`, radius 16px) and its stale `apps/extension/...` comment path was fixed. Assets go through `withBase()` (site deploys under `/focaccia/`); `public/plugins/` added with all five sibling icons. The awning, hanging-sign hero, and SVG feature cards are unchanged — kitchen-timer brand intact, light-only stays. Deployment wiring is monorepo-wide — see root CLAUDE.md → Deployment.

### 2026-07-22 — pear icon in popup credit
- Monorepo-wide consistency pass: the popup's existing "Made by pearpages" footer gained the 16px pear icon (`.credit__icon`; asset `src/popup/pearpages-icon.png`, new `staticFiles` entry in `scripts/build.mjs`). `.credit` became a centered flex row. All other plugins' popups got the same credit.

### 2026-07-20 — Focaccia rename; indigo restyle tried and reverted
- Renamed the project to **Focaccia** everywhere ("Closed for focus" stays as the slogan/sign line): packages `focaccia`/`@focaccia/*`, manifest name + `default_title`, HTML titles, popup h1, README, site copy, e2e tmpdir prefix. Zero test churn (72 unit + 7 e2e green).
- A full restyle to the pearpages.com indigo design system (extension + site) was built, then **reverted at the user's request** via `git reset --soft` — the cream/tomato kitchen-timer look stays. What survived the revert: the new **loaf icon** (dimpled focaccia squircle, recolored to the enamel-red tile; dimples skipped at 16px), the matching popup `header__mark` SVG, the site favicon (`public/favicon.png`, copy of `icon48.png`; the hero sign also shows `public/focaccia-icon.png`, copy of `icon128.png`), inline SVG feature-card icons on the site (`--red-deep`, `currentColor`), and "Made by pearpages/Pere Pages → pearpages.com" author credits in the popup and site footers (the site footer also shows the small pearpages pear icon, `public/pearpages-icon.png`, copied from the blog's `static/img/favicon.png`).
- Screenshot tip learned: Astro's built `dist` uses root-absolute asset paths, so screenshots need an HTTP server — `file://` renders unstyled.

### 2026-07-20 — Monorepo: pnpm + apps/extension + apps/site
- Three commits, tree green at each: (1) migrated npm → pnpm (`pnpm import` preserved resolutions; `allowBuilds: esbuild` needed in `pnpm-workspace.yaml`); (2) `git mv` of the whole extension into `apps/extension` — zero source edits, since `pnpm --filter` runs scripts with cwd = package dir, all `process.cwd()`-bound test paths kept working; history follows via `git log --follow`; (3) new `apps/site`: hand-rolled minimal Astro 7 scaffold (`^7.1.1`, node ≥22 ok), kitchen-timer landing page (awning, hanging sign, three feature cards, load-unpacked install steps), verified by `pnpm build:site` + Playwright screenshot.
- Test invocation changed everywhere: `pnpm test --run` (root and in-package) replaces `npm test -- --run`.

### 2026-07-20 — Celebration tab on phase end (BDD)
- User wanted an in-browser announcement (system banner too missable). Chosen over a page-injected toast to avoid `scripting` + all-sites permissions: the worker now opens `phase-end/phase-end.html?finished=…&minutes=…` via `chrome.tabs.create` (no new permissions) alongside the system notification.
- New page follows the blocked-page pattern: hanging sign ("Break time!" green-themed / "Focus time!"), pure `shared/phase-end-view.ts` view model, thin `phase-end/page.ts` (`initPhaseEnd(search)` so jsdom tests can drive it), "Carry on" button closes the tab. Build script gained the entry + static copies.
- e2e scenario extended: after the fast-forwarded alarm it asserts the celebration tab URL + sign text, the notification, and the auto-started break. 72 unit + 7 e2e green.

### 2026-07-20 — Pomodoro end notification: proven by e2e, banner is OS-side
- User saw no desktop notification; the code already existed (`pomodoro.ts` → `chrome.notifications.create` on the end alarm). New e2e proves it: start focus, re-arm `pomodoro-end` with `when: Date.now()` (unpacked extensions skip the 30s alarm minimum), poll `chrome.notifications.getAll()` → 1, dial flips to Break. So a missing banner is macOS settings (Chrome allowed in System Settings → Notifications, Focus/DND off), not the extension.
- BDD extraction: pure `phaseEndNotification(finished)` in `pomodoro-logic.ts` with Gherkin specs; `notifyPhaseEnd` is now a thin spread and logs `create` rejections instead of failing silently. 61 unit + 7 e2e green.

### 2026-07-20 — Blocklist count badge on the tab (BDD)
- The site list scrolls after ~4 items, so the total was invisible; the Blocklist tab button now shows a pill badge with the live site count (hidden at 0).
- Specs first: pure `siteCountBadge` view model in `shared/tabs.ts`, jsdom DOM specs in `popup/blocklist.test.ts` (fresh dynamic import per test — `blocklist.ts` grabs refs at module load), badge updated from `renderBlocklist`. One new e2e scenario tracks the badge through add/remove.
- Gotcha the e2e caught: an author `display` rule beats the UA `[hidden]{display:none}`, so `.tabs__count[hidden]` needs an explicit `display:none`. 59 unit + 6 e2e green.

### 2026-07-20 — README: development & testing story
- Rewrote the README's Development section as "How we develop and test": BDD workflow, testability architecture (pure logic + thin chrome wrappers), plain-page style iteration via dev-mock, and the three verification layers (unit / mocked preview / disposable-Chromium e2e).

### 2026-07-20 — Playwright e2e (install-free verification)
- Added a 5-scenario Playwright suite proving the real extension behavior without manual install: service worker registers, DNR redirect fires on a real navigation, master switch lifts/restores rules, tabs persist across popup close/reopen, badge shows 25m/⏸/empty via `chrome.action.getBadgeText` in the worker.
- Infra: `e2e/fixtures.ts` (persistent context + temp profile + local `blocked.test` server), `e2e/global-setup.ts` (fresh build), `playwright.config.ts`, `vitest.config.ts` exclusion. All green: 51 unit + 5 e2e.

### 2026-07-20 — Popup tabs (BDD)
- Split the popup into Blocklist / Pomodoro tabs; last open tab persists in `chrome.storage.local` (`activeTab`), default is Blocklist, corrupt values fall back safely.
- Built BDD-style: specs written first (red), then `shared/tabs.ts` (pure resolveTab), `popup/tabs.ts` (init/render), storage helpers, markup + `css/tabs.css` (green). 51 tests total.
- DOM specs run in jsdom against the real `popup.html` markup (read from disk), so the `data-tab`/`data-panel` contract is enforced by tests.

### 2026-07-20 — Gherkin unit tests
- Added Vitest with 38 Gherkin-style tests across 5 suites (site normalization, blocking rules incl. URL-match cases, clock, badge, dial view).
- Refactored for testability: pure `background/rules.ts` (rule derivation), `background/pomodoro-logic.ts` (next phase + badge), `shared/dial-view.ts` (dial view model); `blocking.ts`/`pomodoro.ts`/`timer.ts` now delegate.
- Clarified for the user that the project already is a Chrome extension (MV3); the browser preview was only a styling aid.

### 2026-07-20 — Initial build
- Full extension implemented and verified: build + typecheck pass, popup and blocked page visually checked in browser (on/off states, list add/remove/error, running dial).
- Icons generated at build time by a dependency-free PNG rasterizer (`scripts/make-icons.mjs`).

## TODOs

### Pending
- [ ] Re-load the unpacked extension from the new monorepo path `plugins/focaccia/extension/dist` (manual; the path-derived extension ID changes, so old dev `chrome.storage` data won't carry over). Supersedes the old "rename ~/Desktop/site-blocker" TODO — the project now lives in the browser-plugins monorepo (2026-07-22).
- [ ] Verify the notification *banner* by eye once in real Chrome — the e2e now proves Chrome receives the notification (`getAll` = 1); only the OS-level rendering remains manual (macOS: System Settings → Notifications → Chrome allowed, Focus/DND off).
- [ ] Optional ideas parked: integrate Pomodoro with blocking (force-block during focus), long-break cycles, per-site schedules, export/import of the blocklist.

### Done
- [x] Focaccia rename + enamel loaf icon + pearpages author credits; indigo restyle reverted, kitchen-timer style kept (2026-07-20)
- [x] Monorepo conversion: pnpm workspaces, extension moved to apps/extension, Astro promo site in apps/site (2026-07-20)
- [x] Celebration tab when a phase ends — in-browser announcement alongside the system notification (2026-07-20)
- [x] Site count badge on the Blocklist tab — list scroll hid the total (2026-07-20)
- [x] End-to-end verification without manual install: redirect rules, switch, tabs, badge (Playwright, 2026-07-20)
- [x] Popup (toggle, blocklist form, Pomodoro dial), background worker, blocked page, README (2026-07-20)
