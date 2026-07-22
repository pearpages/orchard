# orchard

pearpages' grove of Chrome extensions — picked fresh from the orchard.

A pnpm-workspace monorepo of Chrome extensions (Manifest V3), each with an optional Astro promo site.

## Plugins

| Plugin | What it does | Stack |
| --- | --- | --- |
| [CookieJar](plugins/cookiejar/extension/README.md) | Cookie manager for developers: view/edit/protect/export cookies, storage inspector, JWT decoder, timeline, deep clean, AI explainer | React + Vite + crxjs |
| [Focaccia](plugins/focaccia/README.md) | Site blocklist with master switch + Pomodoro timer ("Closed for focus") | Vanilla TS + esbuild |
| [HeaderForge](plugins/headerforge/extension/README.md) | Request/response header modifier with profiles, URL filters and presets | React + Vite + crxjs |
| [HopChase](plugins/hopchase/extension/README.md) | Redirect-chain inspector: per-hop status/headers/latency, SEO issue flags, URL tracer, JSON/CSV/HAR export | React + Vite + crxjs |

## Layout

```
packages/config/          # @browser-plugins/config — shared tsconfig + playwright base
packages/site-kit/        # @browser-plugins/site-kit — shared Astro components + plugin registry for the sites
plugins/<name>/extension  # the MV3 extension
plugins/<name>/site       # Astro promo site (cookiejar, focaccia, headerforge have one)
```

## Commands

Node and pnpm are pinned in `mise.toml`. Always `pnpm install` from the root.

```bash
pnpm build          # build every package
pnpm test           # unit tests, all plugins (serial)
pnpm test:e2e       # Playwright e2e, all plugins (serial)
pnpm typecheck      # tsc across packages

# Per plugin (forwards any script):
pnpm cookiejar test
pnpm focaccia build
pnpm headerforge test:e2e
pnpm hopchase test
```
