# Site Blocker

A Chrome extension that keeps you off distracting sites — with a one-click kill switch and a built-in Pomodoro timer.

## Features

- **Blocklist** — add as many sites as you want from the popup form. Input is forgiving: paste `https://www.youtube.com/watch?v=…` and it is normalized to `youtube.com`. Subdomains are blocked too (`m.youtube.com`, `music.youtube.com`).
- **Tabs that remember where you were** — the popup is split into a **Blocklist** tab and a **Pomodoro** tab. Whichever tab you leave open is the one you land on next time; the first open defaults to the Blocklist.
- **One-click on/off** — the toolbar popup has a master switch. Flip it off and every rule is lifted instantly; flip it back on and the whole list is enforced again. The header turns gray while blocking is off so the state is obvious at a glance.
- **Blocked page** — visiting a blocked site lands on a friendly "Closed for focus" sign instead of an error, showing which domain was stopped.
- **Pomodoro timer** — a kitchen-timer dial in the popup. Start a focus or break session, pause/resume, or reset. Focus and break lengths are configurable (defaults: 25/5). Sessions alternate automatically and fire a **desktop notification** when each one ends. The toolbar badge shows the minutes remaining (red for focus, green for break), so you see the countdown without opening the popup.
- **Synced settings** — the blocklist, the on/off state, and timer durations live in `chrome.storage.sync`, so they follow your Chrome profile. Nothing leaves your browser; there is no tracking of any kind.

## Install

```bash
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/` folder.

## How blocking works

Blocking is fully declarative: the extension never watches your traffic. The blocklist is compiled into
[`chrome.declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
dynamic rules — one redirect rule per site — and Chrome's network layer enforces them natively.
Toggling the switch or editing the list just re-derives the rule set from storage.

| Permission | Why |
| --- | --- |
| `declarativeNetRequest` + host permissions | Register the redirect rules Chrome enforces |
| `storage` | Blocklist + settings (`sync`), timer state (`local`) |
| `alarms` | Wake the service worker when a session ends |
| `notifications` | Session-end alerts |

## How we develop and test

```bash
npm run typecheck   # strict TypeScript, no emit
npm test -- --run   # unit tests (Vitest, Gherkin-style)
npm run test:e2e    # end-to-end in a disposable Chromium (Playwright)
npm run build       # bundle with esbuild into dist/
```

One-time setup for the e2e suite: `npx playwright install chromium`.

### The development workflow

**Features are built BDD-style.** New behavior starts as failing specs — `Feature` / `Scenario`
describe blocks with `Given … When … Then …` test names — and the implementation follows until
they pass (the tab feature in [tabs.test.ts](src/popup/tabs.test.ts) is a good example). The same
Gherkin naming is used at every level, unit to e2e, so the test output reads as a living
specification of the extension.

**The code is shaped for testability.** Modules that talk to `chrome.*` APIs stay thin and delegate
every decision to pure functions: rule derivation in [rules.ts](src/background/rules.ts), session
flow and badge in [pomodoro-logic.ts](src/background/pomodoro-logic.ts), the dial view model in
[dial-view.ts](src/shared/dial-view.ts), tab resolution in [tabs.ts](src/shared/tabs.ts). The pure
parts are tested without any browser; the thin wrappers are covered by the e2e suite.

**Styling is iterated on a plain page.** `dist/popup/popup.html` opens in any browser —
[dev-mock.ts](src/popup/dev-mock.ts) installs an in-memory stand-in for the few `chrome.*` APIs the
popup touches (and is a no-op inside the real extension), so CSS work needs no extension reload
loop.

**Building is one command.** esbuild bundles the three entry points (background worker, popup,
blocked page) into `dist/`, static HTML/CSS is copied, and the icons are rasterized on the fly by
[scripts/make-icons.mjs](scripts/make-icons.mjs) (pure Node, no image dependencies).

### The three verification layers

From fastest to most real — none of them requires installing the extension by hand:

1. **Unit tests** (`npm test -- --run`, Vitest, colocated as `src/**/*.test.ts`) — the pure logic
   with no browser at all: declarative rule derivation including which URLs actually match the
   generated regexes, site normalization, clock formatting, badge behavior, the dial view model,
   and tab persistence. The tab DOM specs run in jsdom **against the real `popup.html` markup**
   (read from disk), so the tab/panel contract cannot silently drift from the shipped HTML.
2. **Mocked popup preview** — the plain-page popup described above, used for visual work; it
   exercises the real modules and render flow, just not the real extension APIs.
3. **End-to-end** (`npm run test:e2e`, Playwright, specs in [e2e/](e2e/)) — Playwright launches a
   **disposable Chromium** with `--load-extension=dist`, the programmatic equivalent of "Load
   unpacked", into a throwaway profile that is deleted after each test; your own Chrome is never
   touched. A fresh build runs in global setup, so the suite always tests current code. The specs
   drive the real popup page and assert real behavior:
   - the MV3 service worker registers;
   - the `declarativeNetRequest` redirect actually fires — a local `blocked.test` site (mapped to
     127.0.0.1 with `--host-resolver-rules`, so no real network is used) lands on the
     "Closed for focus" page;
   - the master switch lifts the rules and restores them;
   - tabs survive a real popup close/reopen;
   - the toolbar badge shows `25m` / `⏸` / empty, read straight from the service worker via
     `chrome.action.getBadgeText`.

   To avoid timing flakes, specs wait on `chrome.declarativeNetRequest.getDynamicRules()` inside
   the worker before navigating instead of sleeping.

Deliberately not automated: OS-level notification display and waiting out a full session end
(that's an alarm-length wait; the phase-transition logic is unit-tested instead). Those two are
verified by eye in a real Chrome.

### Structure

```
src/
├── manifest.json         Manifest V3
├── shared/               Types + storage/messaging/normalization helpers
├── background/           Service worker
│   ├── blocking.ts       storage → declarativeNetRequest rule sync
│   └── pomodoro.ts       alarms, notifications, badge
├── popup/                Toolbar popup (one module + one CSS file per section)
│   ├── toggle.ts         master switch
│   ├── tabs.ts           Blocklist/Pomodoro tabs (last tab persisted)
│   ├── blocklist.ts      form + list
│   ├── timer.ts          dial, controls, durations
│   └── css/              base / header / tabs / blocklist / pomodoro
└── blocked/              The "Closed for focus" page
```

Everything renders declaratively: state lives in `chrome.storage`, every UI module exposes a
`render(state)` function, and the popup re-renders whenever storage changes — the same flow whether
the change came from this popup, another window, or the background worker.

Icons are rasterized at build time by [scripts/make-icons.mjs](scripts/make-icons.mjs) (pure Node, no image dependencies).
