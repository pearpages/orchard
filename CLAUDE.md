# Site Blocker — Project Notes

Chrome extension (Manifest V3): site blocklist with master on/off switch + Pomodoro timer. See [README.md](README.md) for features, install, and architecture.

## Conventions

- TypeScript (strict) bundled with esbuild via `npm run build` → `dist/`; `npm run typecheck` before committing.
- No framework: each popup section is a module exposing `init()` + `render(state)`; state lives in `chrome.storage` and the popup re-renders on `storage.onChanged` (declarative, one-way flow).
- Styles in plain `.css` files, one per section (`src/popup/css/`), BEM-style class names, no inline styles.
- Blocking is done only with `declarativeNetRequest` dynamic rules, always re-derived in full from storage (`syncBlockingRules`), never edited incrementally.
- Pomodoro timing lives in the background worker on `chrome.alarms` (survives service-worker suspension); the popup only displays state and sends commands.
- Design language: enamel kitchen-timer — cream/tomato palette, `ui-rounded` display type, dial with 60 ticks. Blocked page is a hanging "Closed for focus" sign.
- Node is pinned via `mise.toml` (node 24).

## Session log

### 2026-07-20 — Initial build
- Full extension implemented and verified: build + typecheck pass, popup and blocked page visually checked in browser (on/off states, list add/remove/error, running dial).
- Icons generated at build time by a dependency-free PNG rasterizer (`scripts/make-icons.mjs`).

## TODOs

### Pending
- [ ] Load `dist/` in real Chrome and verify end-to-end: redirect rules, badge countdown, notifications (needs the actual extension runtime; not testable from the dev preview).
- [ ] Optional ideas parked: integrate Pomodoro with blocking (force-block during focus), long-break cycles, per-site schedules, export/import of the blocklist.

### Done
- [x] Popup (toggle, blocklist form, Pomodoro dial), background worker, blocked page, README (2026-07-20)
