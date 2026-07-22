# HeaderForge

A ModHeader-style Chrome extension (Manifest V3): modify HTTP **request and response headers**, organized in **profiles**, scoped by **URL filters**, with JSON **export/import** and a badge showing the active header count.

Built with React + TypeScript + Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin), using `chrome.declarativeNetRequest` dynamic rules (the MV3 replacement for blocking `webRequest`).

## Features

- **Request headers** — set / remove / append, with a per-header on/off toggle
- **Response headers** — same operations (e.g. strip or add CORS headers)
- **Profiles** — multiple named profiles; *all enabled profiles apply at once*; earlier profiles win conflicts
- **URL filters** — per profile, "URL contains" substrings (DNR `urlFilter` syntax like `||example.com^` passes through) or RE2 regexes, validated live via `isRegexSupported`
- **Presets** — a Presets menu per section adds common headers prefilled (Bearer token, JSON content type, CORS allow-all, strip CSP, …), and the name field autocompletes from well-known header names
- **Export / Import** — JSON file with validation on import
- **Badge** — active header count on the toolbar icon; `!` signals a rule error
- **System-aware theme** — the popup follows the OS light/dark preference

## Getting started

```bash
pnpm install
pnpm build        # typecheck + production build into dist/
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and pick the `dist/` folder.

For development with popup HMR:

```bash
pnpm dev          # then load dist/ unpacked once; crxjs keeps it updated
```

## Try it against a real server

[https://httpbin.org/headers](https://httpbin.org/headers) echoes back every request header it receives as JSON, which makes it the quickest way to test that your headers are really being applied:

1. Open the HeaderForge popup and add a request header, e.g. `X-Test: hello`.
2. Visit `https://httpbin.org/headers` (or reload it).
3. Your header appears in the JSON response — proof it went out on the wire.

This matters because DevTools **cannot** show you these modifications (see caveats below), so an echo service like httpbin is the honest way to verify. It also works for response-header rules: check the response headers of any site in `curl -i` or watch behavior change (e.g. CORS errors disappearing after adding `Access-Control-Allow-Origin: *`). The e2e suite applies the same idea with a local echo server (`e2e/echo-server.ts`).

## Testing

```bash
pnpm test         # Vitest unit tests (pure core logic, runs once and exits)
pnpm e2e          # builds, then drives a real Chromium with the extension loaded:
                  # sets headers in the popup and verifies them against a local echo server
pnpm icons        # re-renders public/icons/*.png from icon.svg (after editing the icon)
```

## Important caveats

- **DevTools lies about modified headers.** `declarativeNetRequest` changes are applied outside the render process; the Network panel often shows the *original* headers. Verify against a real server (that's exactly what the e2e test does), e.g. `https://httpbin.org/headers`.
- **Append on request headers** only works for a small Chrome whitelist (`Accept`, `Cookie`, `Accept-Language`, …). Response headers can append freely.
- **Regex filters are RE2** — no lookahead or backreferences. The popup validates patterns as you type; if a stored rule still fails, the service worker drops regex rules (keeping the rest working) and shows a `!` badge.
- `modifyHeaders` rules are "unsafe" dynamic rules, capped at **5,000** (one rule per enabled profile per URL filter — far above realistic use). The service worker truncates and shows `!` if exceeded.

## Architecture

```
popup (React)  ──writes──▶  chrome.storage.local  ──onChanged──▶  service worker
                                                                     │
                            pure core: buildRules(state)  ◀──calls───┘
                                                                     ▼
                                            chrome.declarativeNetRequest dynamic rules
                                            (enforced by the browser, survives SW death)
```

- `src/core/` — pure, chrome-free logic (state → DNR rules, serialization). This is what the unit tests cover.
- `src/background/service-worker.ts` — the only place with side effects: rebuilds all dynamic rules atomically on every storage change and updates the badge.
- `src/popup/` — React editor for the stored state; never talks to the service worker directly.
