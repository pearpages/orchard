# HopChase — project notes for Claude

Redirect-chain inspector (MV3). See extension/README.md for user-facing docs and architecture.

## Conventions & key decisions

- Same stack and layout as headerforge (the template): React 19 + Vite 8 + crxjs 2.7 + TS 7, per-component `.scss` with block-element classNames, no inline styles/CSS-in-JS, CSS custom props in `base.scss` (`:root` + `prefers-color-scheme: dark`), SCSS vars for static tokens only. Vite dev port **5174** (headerforge holds 5173).
- `src/core/` must stay **pure and chrome-free**. The service worker converts raw `chrome.webRequest`/`webNavigation` details into plain-data `ChainEvent`s (`core/normalize.ts` uses structural types, no chrome import) and feeds `core/chain-reducer.ts::reduce`. All unit tests replay event literals; no chrome mocks exist or should be needed.
- **Storage is the only state bus** (`chrome.storage.onChanged`): live `TrackerState` + traces in `storage.session` (survives SW death, clears on restart — intended), history ring buffer + settings in `storage.local`. **One deliberate exception**: the popup sends a single `chrome.runtime.sendMessage({ type: 'trace', url })` to trigger a trace (clean start semantics + id handshake); results still flow back via storage only. Do not add more messaging.
- Client-redirect linking: a new navigation on a settled tab is parked as a **candidate** until `webNavigation.onCommitted` decides — `client_redirect` qualifier ⇒ merge into the chain (bridge hop labeled `meta`/`js`/`client` from injected doc-info), otherwise promote. The qualifier CREATES links; the 15s gap window only VETOES them. A candidate that errors with `net::ERR_ABORTED` is dropped; any other error promotes it (a redirect loop never commits, so it would otherwise be lost).
- **`onBeforeRequest` re-fires for every redirect hop with the same requestId** (empirically confirmed) — the reducer must treat a repeated `request-started` for a known requestId as a no-op, both for tab and background chains. This bit once: background chains were overwritten per hop.
- Tracer: `fetch(redirect: 'manual')` is useless (opaqueredirect hides status/headers by spec — don't "simplify" back to it). The SW fetches with `redirect: 'follow'` + an `x-hopchase-trace` marker header and observes its own request via webRequest (`tabId -1`, type `xmlhttprequest`); `core/trace.ts::absorbChainIntoTrace` folds settled background chains into the TraceResult (trace stays `pending` while its last hop is 3xx). After the fetch settles, the SW waits ~500ms and force-finalizes anything still pending.
- SW rules: all listeners registered synchronously at top level; **no timers for persistence** (they die with the worker) — state is saved after each processQueue batch; hydration is a single-consumer queue (`processQueue`) that loads session state before reducing; pending traces + active background chains from a previous worker lifetime are failed/pruned on hydrate.
- History drain filter: only chains with `hops.length > 1` or issues land in history — single-hop 200s are noise.
- e2e: fixtures ping the service worker (`worker.evaluate(() => true)`) before any navigation — the Playwright `serviceworker` event fires on *creation*, before the module (and its listener registration) finishes evaluating; without the ping the first webRequest events are silently lost. Redirect server teardown needs `closeAllConnections()`. Popup specs open `src/popup/index.html?tab=<id>` (the `?tab=` override exists because a popup opened as a tab IS the active tab).
- Icon workflow: edit `public/icons/icon.svg`, run `pnpm icons`. Never hand-edit the PNGs.

## Session log

### 2026-07-22 — initial build (complete)

Built from scratch following the headerforge template: scaffold (Vite 8 + crxjs + React 19), pure core (types / normalize / chain-reducer / issues / trace / 4 exporters), storage wrappers, service worker (event pipeline, session persistence, badge, doc-info injection via `chrome.scripting`, tracer), full popup (Current/Tracer/History tabs, ChainView with expandable searchable headers, issue panel with hop deep-links, export bar, copy-as-curl). 51 unit tests + 5 Playwright e2e (server chain, loop, meta refresh, tracer, canonical mismatch) against a local redirect server. Screenshot-checked light + dark. Monorepo wiring: root package.json filter script, README row, root CLAUDE.md.

Pending / ideas (not committed to):
- Promo site (`plugins/hopchase/site`) + site-kit registry entry (`packages/site-kit/src/plugins.ts` union + array + icon PNGs into every site's `public/plugins/`).
- Subresource chain tracking (settings flag `trackSubresources` and reducer keying exist; listeners + UI don't).
- DevTools panel for a full-width table view; settings UI (history limit is data-only today).
- No git commits made yet.
