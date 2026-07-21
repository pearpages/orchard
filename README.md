# 🍪 CookieJar

A friendly cookie manager for developers, built as a Chrome extension (Manifest V3). See, search, edit, protect, export and delete cookies across **every domain** in the browser — handy when debugging auth flows (auth0, SSO) where cookies from other domains matter.

## Features

- **Popup** — quick view of the current site's cookies (including parent-domain and sibling-subdomain cookies), instant search, one-click delete with undo.
- **Manager** (full tab, also the extension's Options page) — all cookies grouped by domain with a sidebar, global search with `domain:` / `name:` prefixes, collapsible groups.
- **Edit & create** — drawer editor with live validation for the tricky rules (`__Host-` / `__Secure-` prefixes, SameSite=None ⇒ Secure, host-only vs domain cookies, session vs persistent).
- **Protect & pin** — shield individual cookies or whole domains so bulk deletes skip them; pin your important domains (e.g. your auth0 tenant) to the top.
- **Export / import** — JSON (lossless round-trip including CHIPS-partitioned cookies) and **CSV** (spreadsheets, other tools); import auto-detects JSON vs CSV and accepts **EditThisCookie** exports as-is.
- **Safe destructive actions** — single deletes are instant with an Undo toast; domain deletes ask for confirmation; "Delete all" requires typing `DELETE`. Protected cookies are always kept and reported ("2 protected kept").
- **Dark mode** via `prefers-color-scheme`, keyboard shortcuts (`/` focuses search, `Esc` closes dialogs), **remembered search & view** across manager opens, and incremental rendering ("Show more") so even huge cookie jars stay snappy.
- **Storage inspector** — localStorage + sessionStorage of every open tab, grouped by origin in the Manager (sessionStorage listed per tab, since it's tab-scoped); view/edit/delete/add keys, export per origin, clear with undo. The popup shows the current tab's storage. *(Chrome offers no API to read another origin's web storage without a tab — open tabs are the honest maximum.)*
- **JWT / token decoder** — values containing a JWT (even URL-encoded or inside JSON wrappers) get a badge and an inline decoded panel: claims, `exp` countdown, expired highlighting. Base64-JSON blobs are decoded too. Works in cookie rows and storage rows.
- **Timeline** — every cookie change in the browser (set/removed/overwritten/expired, which domain, when) recorded by the service worker into session memory; filterable, pausable. Plus **snapshot → run your flow → diff**: see exactly which cookies an auth flow added, removed or changed.
- **Deep clean** — wipe localStorage, IndexedDB, service workers and cache storage for a domain browser-wide via `chrome.browsingData` (works without an open tab), with optional cookie deletion that still respects protection.

## Development

Requires Node ≥ 20 (a `.node-version` file is included for mise/asdf/fnm).

```bash
npm install
npm run dev      # dev server with HMR (load dist/ as unpacked extension)
npm run build    # type-check + production build into dist/
```

**Load in Chrome:** `chrome://extensions` → enable *Developer mode* → *Load unpacked* → select the `dist/` folder. (After `npm run dev`, keep the dev server running; the extension pages hot-reload.)

## Testing

```bash
npm test -- --run   # unit tests (Vitest + Testing Library, chrome API mocked)
npm run test:e2e    # Gherkin e2e (Playwright + playwright-bdd, real Chromium with the built extension)
HEADED=1 npx playwright test   # watch the e2e run in a headed browser (after npm run build && npx bddgen)
```

E2E scenarios live in `e2e/features/*.feature` (Given/When/Then), step definitions in `e2e/steps/`. The suite launches a persistent Chromium context with the extension loaded, discovers the extension id from its service worker, and drives the real manager page.

## Architecture

```
src/
├── lib/          # framework-free core — cookies.ts (chrome.cookies gotchas), pageStorage.ts
│                 # (chrome.scripting injection), timeline.ts / snapshot.ts (storage.session),
│                 # deepClean.ts (browsingData), token.ts (JWT decoding, pure)
├── hooks/        # useCookies (live via onChanged), useProtection, useTabStorage, useTimeline…
├── components/   # shared UI: each folder = Component.tsx + component.scss (BEM)
├── popup/        # toolbar popup (current site: cookies + storage tabs)
├── manager/      # full-tab manager (Cookies | Storage | Timeline views)
└── background/   # service worker: records cookie changes for the Timeline
```

Key invariant: a cookie's identity is `cookieKey()` (`storeId|domain|path|name|partitionKey`) — used for React keys, protection entries and delete targets. `chrome.cookies.set/remove` need a URL, not a domain; `cookieUrl()` reconstructs it. Styling is SCSS files with BEM class names only — no inline styles or CSS-in-JS.
