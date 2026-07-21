# 🍪 CookieJar

A friendly cookie manager for developers, built as a Chrome extension (Manifest V3). See, search, edit, protect, export and delete cookies across **every domain** in the browser — handy when debugging auth flows (auth0, SSO) where cookies from other domains matter.

## Features

- **Popup** — quick view of the current site's cookies (including parent-domain and sibling-subdomain cookies), instant search, one-click delete with undo.
- **Manager** (full tab, also the extension's Options page) — all cookies grouped by domain with a sidebar, global search with `domain:` / `name:` prefixes, collapsible groups.
- **Edit & create** — drawer editor with live validation for the tricky rules (`__Host-` / `__Secure-` prefixes, SameSite=None ⇒ Secure, host-only vs domain cookies, session vs persistent).
- **Protect & pin** — shield individual cookies or whole domains so bulk deletes skip them; pin your important domains (e.g. your auth0 tenant) to the top.
- **Export / import JSON** — save and restore cookie sets (auth states) between sessions; lossless round-trip including CHIPS-partitioned cookies.
- **Safe destructive actions** — single deletes are instant with an Undo toast; domain deletes ask for confirmation; "Delete all" requires typing `DELETE`. Protected cookies are always kept and reported ("2 protected kept").
- **Dark mode** via `prefers-color-scheme`, keyboard shortcuts (`/` focuses search, `Esc` closes dialogs).

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
├── lib/          # framework-free core — all chrome.cookies gotchas live in cookies.ts
├── hooks/        # useCookies (live via onChanged), useProtection, useToast, useCookieActions
├── components/   # shared UI: each folder = Component.tsx + component.scss (BEM)
├── popup/        # toolbar popup (current site)
├── manager/      # full-tab manager (all domains)
└── background/   # minimal service worker
```

Key invariant: a cookie's identity is `cookieKey()` (`storeId|domain|path|name|partitionKey`) — used for React keys, protection entries and delete targets. `chrome.cookies.set/remove` need a URL, not a domain; `cookieUrl()` reconstructs it. Styling is SCSS files with BEM class names only — no inline styles or CSS-in-JS.
