# HopChase

A redirect-chain inspector for Chrome (Manifest V3). Land on a page via `301 → 302 → 200` and HopChase shows you every hop — status, headers, latency — flags the SEO problems automatically, lets you trace any URL without navigating to it, and exports the whole chain as JSON, CSV or HAR.

A modernized take on "Redirect Path"-style extensions: full main-frame chain reconstruction (including meta-refresh and JS redirects), automatic issue detection, an on-demand tracer, history, and per-hop copy-as-curl.

## Features

- **Full chain for every navigation** — server redirects (301/302/307/308) correlated by `webRequest` request id, plus client-side redirects (meta refresh / JS) linked via `webNavigation`'s `client_redirect` transition qualifier. Per-hop status line, request/response headers (searchable), IP, cache flag, and latency so you can see which hop costs you the milliseconds.
- **SEO issues flagged automatically** — chains longer than 2 hops, 302/307 where a permanent redirect may be intended, redirect loops, HTTPS→HTTP downgrades, HTTP→HTTPS upgrade hops, chains ending in 4xx/5xx, client-side redirects, and canonical URLs that disagree with the final URL.
- **On-demand tracer** — paste a URL and trace its server-side redirect chain from the extension's service worker, without navigating. Traces run cookieless with `credentials: 'omit'`, so cookie/login-dependent chains can differ from a real visit; meta/JS redirects are not followed (no page is loaded).
- **Export** — JSON (versioned envelope), CSV (RFC 4180), HAR 1.2 (importable into DevTools), and per-hop copy-as-curl with the captured request headers.
- **History** — navigations that redirected (or carry issues) are kept in a ring buffer (default 50) in `chrome.storage.local`, so you can compare before/after a migration.
- **Badge** — the toolbar icon shows the redirect count for the current tab, red `!` when the chain has an error-severity issue.

## Architecture

```
src/core/          pure, chrome-free: types, event normalization, chain reducer,
                   issue rules, trace assembly, exporters — all unit tests live here
src/background/    MV3 service worker: chrome listeners → normalize → reduce →
                   persist; badge; doc-info injection; tracer fetch
src/storage/       thin wrappers over chrome.storage (session: live chains + traces,
                   local: history + settings)
src/popup/         React popup (Current | Tracer | History), per-component SCSS
```

- The service worker observes `webRequest` (observational listeners are fully allowed in MV3 — only *blocking* webRequest was removed) and feeds normalized plain-data events to a pure reducer. Unit tests replay event literals; there are no chrome mocks.
- Chain state lives in `chrome.storage.session`: it survives service-worker death (workers are killed after ~30s idle) but clears on browser restart — exactly the lifetime a "current chain" should have.
- The tracer cannot use `fetch(url, { redirect: 'manual' })` — that returns an *opaqueredirect* response with no status and no headers, by spec. Instead the worker fetches with `redirect: 'follow'` carrying a marker header, and the existing webRequest pipeline observes its own request (`tabId: -1`).

## Development

```bash
pnpm install        # from the monorepo root
pnpm hopchase dev   # Vite dev server (load dist/ unpacked once, HMR for the popup)
pnpm hopchase build
pnpm hopchase test  # vitest run (51 unit tests over src/core)
pnpm hopchase e2e   # builds, then Playwright drives real Chromium against a local redirect server
pnpm hopchase icons # re-render icon PNGs from public/icons/icon.svg
```

Load the extension from `plugins/hopchase/extension/dist` via `chrome://extensions` → Developer mode → Load unpacked.

## Known limits

- Requests on `chrome://` pages, the Chrome Web Store, and other extensions' pages are invisible to the `webRequest` API.
- Subresource chains (canonical checks on tracking pixels, CDN hops) are not tracked yet — the settings flag and reducer keying exist, the listeners/UI don't.
- Tracer chains reflect a cookieless `fetch`, not a real navigation (`sec-fetch-*` differs); Chrome caps follows at ~20 redirects.
