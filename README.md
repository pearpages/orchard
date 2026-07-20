# Site Blocker

A Chrome extension that keeps you off distracting sites — with a one-click kill switch and a built-in Pomodoro timer.

## Features

- **Blocklist** — add as many sites as you want from the popup form. Input is forgiving: paste `https://www.youtube.com/watch?v=…` and it is normalized to `youtube.com`. Subdomains are blocked too (`m.youtube.com`, `music.youtube.com`).
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

## Development

```bash
npm run typecheck   # strict TypeScript, no emit
npm run build       # bundle with esbuild into dist/
```

The popup can be opened as a plain page (`dist/popup/popup.html`) in any browser while working on
styles — a tiny in-memory mock ([dev-mock.ts](src/popup/dev-mock.ts)) stands in for the `chrome.*` APIs.

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
│   ├── blocklist.ts      form + list
│   ├── timer.ts          dial, controls, durations
│   └── css/              base / header / blocklist / pomodoro
└── blocked/              The "Closed for focus" page
```

Everything renders declaratively: state lives in `chrome.storage`, every UI module exposes a
`render(state)` function, and the popup re-renders whenever storage changes — the same flow whether
the change came from this popup, another window, or the background worker.

Icons are rasterized at build time by [scripts/make-icons.mjs](scripts/make-icons.mjs) (pure Node, no image dependencies).
