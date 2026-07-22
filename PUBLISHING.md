# Chrome Web Store — submission plan

Goal: publish all five orchard extensions to the Chrome Web Store. Audit date: 2026-07-22.

**Bottom line:** the extensions themselves are store-ready — all MV3, no remote code, no analytics, 128px icons present, clean builds to `plugins/<name>/extension/dist/`. What's missing is everything around the code: packaging, privacy policies, screenshots, listing copy, `homepage_url`, and the developer account.

**Rollout decision:** staged. **Wave 1** = begone, focaccia, headerforge (simple permissions → fastest review). **Wave 2** = cookiejar, hopchase (sensitive APIs → heavier disclosures, slower review), submitted after Wave 1 clears. CookieJar's AI feature ships as-is, fully disclosed.

## Current state per extension

| | Version | Permissions | Host access | Transmits data? |
|---|---|---|---|---|
| begone | 1.0.0 | storage | content script on `<all_urls>` | No |
| focaccia | 1.0.0 | storage, declarativeNetRequest, alarms, notifications | `<all_urls>` | No |
| headerforge | 0.1.0 | declarativeNetRequest, storage | `<all_urls>` | No |
| cookiejar | 0.1.0 | cookies, storage, scripting, browsingData | `<all_urls>` | Only opt-in AI: cookie **metadata** (never values) to Anthropic with user's own key, or on-device Gemini Nano (no network). Invariant tested in `tests/lib/aiContext.test.ts`. |
| hopchase | 0.1.0 | webRequest, webNavigation, storage, tabs, scripting | `<all_urls>` | No third-party. Tracer fetches only the user-typed URL, `credentials: 'omit'`. |

## Blocking gaps found

1. **No zip/packaging step** anywhere — CWS uploads are zips of the dist contents.
2. **No privacy policy** — mandatory: every extension has `<all_urls>`-level access; cookiejar/hopchase use sensitive APIs.
3. **No screenshots** (explicitly parked) — CWS requires ≥1 at 1280×800 (or 640×400).
4. **No `homepage_url`** in any manifest; promo sites wired for `orchard.pearpages.com/<slug>/` but **not deployed yet** (go-live steps in root CLAUDE.md → Deployment).
5. **HopChase manifest description is 144 chars** — over the 132-char limit; CWS will reject the upload.
6. HeaderForge + HopChase lack a 32px icon (minor; both have `icon.svg` + `scripts/render-icons.mjs`).
7. No listing copy, permission justifications, or data-usage answers drafted.
8. No CWS developer account.

## Part A — repo work

### A1. Packaging script
- [ ] New root `scripts/package.mjs`: for each `plugins/*/extension`, zip the **contents** of `dist/` (manifest.json at zip root, no wrapping folder, exclude `.DS_Store`) into `artifacts/<name>-<version>.zip` (version read from `dist/manifest.json`).
- [ ] Root script `"package": "pnpm -r build && node scripts/package.mjs"`; add `artifacts/` to `.gitignore`.

### A2. Manifest fixes
- [ ] hopchase (`manifest.config.ts`): trim description to ≤132 chars — e.g. "Redirect chain inspector: per-hop status, headers and latency for every navigation, SEO issue flags, and on-demand URL tracing." (127).
- [ ] Add `homepage_url: 'https://orchard.pearpages.com/<slug>/'` to all five manifests (begone `manifest.json`, focaccia `src/manifest.json`, the rest `manifest.config.ts`).
- [ ] headerforge + hopchase: render + declare a 32px icon.
- [ ] Bump headerforge → 1.0.0 (Wave 1). Bump cookiejar + hopchase → 1.0.0 when Wave 2 ships.

### A3. Privacy policy pages (on the promo sites)
- [ ] One `src/pages/privacy.astro` per plugin site (shared text-page layout via site-kit) → `orchard.pearpages.com/<slug>/privacy/`; link from each site footer.
- [ ] Content per plugin (truthful per code audit):
  - **begone** — selectors in `chrome.storage.sync` only; nothing collected or transmitted.
  - **focaccia** — blocklist/timer settings local; blocking via DNR; nothing transmitted.
  - **headerforge** — header profiles local; headers modified in-browser via DNR; nothing transmitted.
  - **cookiejar** — cookies read/edited locally; nothing transmitted by default; opt-in AI sends cookie metadata only (never values) to on-device model or Anthropic with the user's own key; `browsingData` only for user-initiated deep clean.
  - **hopchase** — request/navigation events observed locally to build redirect chains; history in `chrome.storage`; tracer fetches only the user-supplied URL with credentials omitted.

### A4. Store-listing copy, checked into repo
- [ ] `plugins/<name>/store-listing.md` per extension with copy-paste dashboard material:
  - Summary (= manifest description) + detailed description (seed from README).
  - Category: begone/focaccia → Workflow & Planning (or Productivity); cookiejar/headerforge/hopchase → Developer Tools.
  - **Single-purpose statement** (e.g. focaccia: "helps the user focus by blocking chosen sites; the timer drives the blocking" — one purpose).
  - **Per-permission justifications**:
    - begone: `storage` (save rules); `<all_urls>` content script (rules may target any site the user chooses).
    - focaccia: DNR + `<all_urls>` (block user-chosen sites anywhere); `alarms` (Pomodoro phases); `notifications` (phase-end alerts).
    - headerforge: DNR + `<all_urls>` (apply user-defined header rules to user-filtered URLs).
    - cookiejar: `cookies` + `<all_urls>` (core purpose — view/edit cookies on any site); `browsingData` (user-initiated deep clean); `scripting` (storage inspector).
    - hopchase: `webRequest` + `webNavigation` + `<all_urls>` (observe redirect hops); `tabs` (attribute chains to tabs).
  - **Data-usage form**: Wave 1 = collects nothing. cookiejar = discloses opt-in AI metadata transmission. hopchase = nothing leaves the browser.
  - **Remote code declaration: No** for all five (cookiejar bundles `@anthropic-ai/sdk` locally — bundled ≠ remote).

## Part B — manual steps (you)

1. **Deploy the sites first** (so `homepage_url` + privacy URLs resolve): the go-live steps already in root CLAUDE.md → Deployment (push, Pages source = GitHub Actions, custom domain, GoDaddy CNAME).
2. **Developer account**: [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole) — one-time **$5** fee, verify publisher email, **2-Step Verification required** on the Google account, set publisher name, complete the **EU DSA trader/non-trader declaration** (non-trader for a free hobby project — EU users just see a notice).
3. **Screenshots**: ≥1 per extension at **1280×800** (3–5 recommended). Reuse the existing Playwright `--load-extension` screenshot tooling to compose popup-over-demo-page shots. Promo tile (440×280) optional — skip for launch.
4. **Per listing** (Wave 1 first): upload `artifacts/<name>-<version>.zip` → listing tab (description, category, screenshots, homepage URL) → privacy tab (single purpose, permission justifications, data-usage checkboxes, privacy policy URL) → submit.
5. **Review expectations**: `<all_urls>` puts everything into in-depth review — typically days, sometimes weeks. Reviewer questions get answered from the `store-listing.md` justification bank.
6. **Wave 2** after Wave 1 approves: bump versions, package, submit cookiejar + hopchase.
7. Note: store installs get new extension IDs — dev `chrome.storage` data from unpacked installs won't carry over (expected).

## Verification (after Part A)

- `pnpm package` → 5 zips in `artifacts/`; `unzip -l` each: manifest at root, no `__MACOSX`/`.DS_Store`, no wrapper dir.
- Unzip one to a scratch dir and load via `--load-extension` — proves the zip is loadable exactly as the store unpacks it.
- hopchase dist manifest description ≤132 chars; all five manifests have `homepage_url`; headerforge/hopchase dist icons include 32px.
- `pnpm build` / `pnpm typecheck` / `pnpm test` green (baseline 137+72+30+53); site builds green and each `/<slug>/privacy/` renders in the local workflow-assembly rehearsal.
