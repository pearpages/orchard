// Renders the 1200×630 og:image card for each site and writes it to that site's
// src/assets/og.png (committed; ESM-imported by index.astro, hashed at build).
// Manual tool — rerun `pnpm sites:og` and commit after changing copy in
// packages/site-kit/src/plugin-data.ts, a site palette, or an icon.
// Palette hexes below mirror each site's src/styles/theme.css light tokens.
// Playwright comes from packages/config (browsers installed locally); CI never runs this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { pluginData, homeCard } from '../packages/site-kit/src/plugin-data.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/config/package.json'));
const { chromium } = require('@playwright/test');

function fail(message) {
  console.error(`generate-og: ${message}`);
  process.exit(1);
}

const THEMES = {
  home: { bg: '#fbfaf7', ink: '#26251f', muted: '#706c5a', accent: '#4a8f3c', rule: '#e8e5dc' },
  begone: { bg: '#fbfbfa', ink: '#242220', muted: '#6f6f6f', accent: '#c0392b', rule: '#eaeaea' },
  cookiejar: { bg: '#faf7f2', ink: '#2d2a24', muted: '#736a58', accent: '#c07a2d', rule: '#e8e1d6' },
  focaccia: { bg: '#fffdf4', ink: '#33261f', muted: '#70614e', accent: '#d9482b', rule: '#e3d5b2' },
  headerforge: {
    bg: '#ffffff',
    ink: '#1c2128',
    muted: '#5d6675',
    accent: '#3b6ef6',
    rule: '#dde2ea',
    // The only dual-accent site: request blue / response teal.
    bar: 'linear-gradient(90deg, #3b6ef6 50%, #0d9488 50%)',
  },
  hopchase: { bg: '#f5f7fb', ink: '#1c2128', muted: '#5d6675', accent: '#3b6ef6', rule: '#dde2ea' },
};

// Native ≥128px icon sources (the shared assets package only has 48px copies).
const ICONS = {
  home: 'packages/assets/pearpages-icon.png', // 64px, shown at 112px
  begone: 'plugins/begone/extension/icons/icon128.png',
  cookiejar: 'plugins/cookiejar/extension/public/icons/icon128.png',
  focaccia: 'plugins/focaccia/site/public/focaccia-icon.png',
  headerforge: 'plugins/headerforge/extension/public/icons/icon-128.png',
  hopchase: 'plugins/hopchase/extension/public/icons/icon-128.png',
};

const cards = [
  {
    slug: 'home',
    out: 'sites/home/src/assets/og.png',
    name: homeCard.name,
    tagline: homeCard.tagline,
    description: homeCard.blurb,
    slugPath: '',
    iconSize: 112,
  },
  ...pluginData.map((p) => ({
    slug: p.slug,
    out: `plugins/${p.slug}/site/src/assets/og.png`,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    slugPath: `/${p.slug}/`,
    iconSize: 128,
  })),
];

for (const card of cards) {
  if (!fs.existsSync(path.join(root, ICONS[card.slug]))) {
    fail(`missing icon ${ICONS[card.slug]}`);
  }
}

const dataUri = (p) => `data:image/png;base64,${fs.readFileSync(path.join(root, p)).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cardHtml(card, theme) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; display: flex; flex-direction: column;
         background: ${theme.bg}; color: ${theme.ink}; padding: 84px 80px 0;
         font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  .bar { position: fixed; inset: 0 0 auto 0; height: 14px; background: ${theme.bar ?? theme.accent}; }
  .head { display: flex; align-items: center; gap: 36px; }
  .icon { width: ${card.iconSize}px; height: ${card.iconSize}px; }
  .name { font-size: 92px; font-weight: 800; letter-spacing: -0.02em; }
  .tagline { margin-top: 48px; font-size: 43px; font-weight: 650; line-height: 1.25; color: ${theme.accent};
             display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .desc { margin-top: 22px; font-size: 30px; line-height: 1.45; color: ${theme.muted}; max-width: 1000px;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .footer { margin-top: auto; padding: 26px 0 38px; border-top: 2px solid ${theme.rule};
            font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
            font-size: 27px; color: ${theme.muted}; }
  .footer b { color: ${theme.accent}; font-weight: 600; }
</style></head><body>
  <div class="bar"></div>
  <div class="head"><img class="icon" src="${dataUri(ICONS[card.slug])}" alt=""><div class="name">${esc(card.name)}</div></div>
  <div class="tagline">${esc(card.tagline)}</div>
  <div class="desc">${esc(card.description)}</div>
  <div class="footer">orchard.pearpages.com<b>${card.slugPath}</b></div>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
for (const card of cards) {
  await page.setContent(cardHtml(card, THEMES[card.slug]), { waitUntil: 'load' });
  await page.evaluate(() =>
    Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode())]),
  );
  const outPath = path.join(root, card.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await page.screenshot({ path: outPath });
  console.log(`${card.out} <- ${card.name}`);
}
await browser.close();
