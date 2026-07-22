# Begone

> Banishes unwanted elements the instant they appear.

Begone ships with no rules of its own. Click the toolbar icon and add the CSS selectors of elements you want removed; they are stored in `chrome.storage.sync` and applied on every page, live — including elements that appear later.

For example, to get rid of cookie banners or newsletter popups you could add:

```
.cookie-banner
#newsletter-popup
```

Any valid CSS selector works — one per entry.

> I dedicate this plugin to my friend `Christophe`

## Installation

1. From the monorepo root: `pnpm install`, then `pnpm begone build` (outputs to `plugins/begone/extension/dist/`).
2. Open **chrome://extensions** and enable **Developer mode** (top-right).
3. Click **Load unpacked** → choose `plugins/begone/extension/dist/`.
4. After edits: rebuild, then press **⟳ Reload**.

**Note**: unpacked extension IDs are path-derived — keep loading from the same `dist/` path or Chrome treats it as a new extension and your stored selectors won't carry over.
