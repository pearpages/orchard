# Site Blocker — Project Notes

Chrome extension (Manifest V3): site blocklist with master on/off switch + Pomodoro timer. See [README.md](README.md) for features, install, and architecture.

## Conventions

- TypeScript (strict) bundled with esbuild via `npm run build` → `dist/`; `npm run typecheck` before committing.
- Unit tests with Vitest, run as `npm test -- --run`, colocated as `src/**/*.test.ts`, written in Gherkin style (`Feature`/`Scenario` describes, `Given … When … Then …` test names). Logic under test must be pure — chrome-API modules stay thin and delegate (`rules.ts`, `pomodoro-logic.ts`, `dial-view.ts`).
- E2E with Playwright (`npm run test:e2e`, specs in `e2e/*.e2e.ts`, same Gherkin naming): disposable Chromium loads `dist/` via `--load-extension`, a local server plays `blocked.test` via `--host-resolver-rules`, and service-worker state is asserted with `worker.evaluate`. Vitest excludes `e2e/**` (see `vitest.config.ts`); Playwright runs `workers: 1` because each test owns the fixed site port.
- No framework: each popup section is a module exposing `init()` + `render(state)`; state lives in `chrome.storage` and the popup re-renders on `storage.onChanged` (declarative, one-way flow).
- Styles in plain `.css` files, one per section (`src/popup/css/`), BEM-style class names, no inline styles.
- Blocking is done only with `declarativeNetRequest` dynamic rules, always re-derived in full from storage (`syncBlockingRules`), never edited incrementally.
- Pomodoro timing lives in the background worker on `chrome.alarms` (survives service-worker suspension); the popup only displays state and sends commands.
- Design language: enamel kitchen-timer — cream/tomato palette, `ui-rounded` display type, dial with 60 ticks. Blocked page is a hanging "Closed for focus" sign.
- Node is pinned via `mise.toml` (node 24).

## Session log

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
- [ ] Verify the notification *banner* by eye once in real Chrome — the e2e now proves Chrome receives the notification (`getAll` = 1); only the OS-level rendering remains manual (macOS: System Settings → Notifications → Chrome allowed, Focus/DND off).
- [ ] Optional ideas parked: integrate Pomodoro with blocking (force-block during focus), long-break cycles, per-site schedules, export/import of the blocklist.

### Done
- [x] Celebration tab when a phase ends — in-browser announcement alongside the system notification (2026-07-20)
- [x] Site count badge on the Blocklist tab — list scroll hid the total (2026-07-20)
- [x] End-to-end verification without manual install: redirect rules, switch, tabs, badge (Playwright, 2026-07-20)
- [x] Popup (toggle, blocklist form, Pomodoro dial), background worker, blocked page, README (2026-07-20)
