// Axe accessibility sweep over the assembled _site/ tree (run `pnpm sites:build` first).
// Serves _site/ on an in-process server, then runs @axe-core/playwright against every
// page in light and dark mode. Exits non-zero if any violation is found.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const port = 4331; // one above serve-site's 4330 so the two can coexist

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('a11y-check: _site/index.html not found — run `pnpm sites:build` first');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${urlPath}`);
    return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(port, resolve));

const pages = ['/', '/begone/', '/cookiejar/', '/focaccia/', '/headerforge/', '/hopchase/'];
const schemes = ['light', 'dark'];
let failures = 0;

const browser = await chromium.launch();
for (const scheme of schemes) {
  const context = await browser.newContext({ colorScheme: scheme });
  const page = await context.newPage();
  for (const p of pages) {
    await page.goto(`http://localhost:${port}${p}`, { waitUntil: 'networkidle' });
    // figure[role="img"] subtrees are decorative art (presentational descendants);
    // axe still contrast-checks their text, which is a false positive by spec.
    const { violations } = await new AxeBuilder({ page }).exclude('figure[role="img"]').analyze();
    if (violations.length === 0) {
      console.log(`ok   ${scheme.padEnd(5)} ${p}`);
      continue;
    }
    failures += violations.length;
    console.error(`FAIL ${scheme.padEnd(5)} ${p}`);
    for (const v of violations) {
      console.error(`  [${v.impact}] ${v.id}: ${v.help}`);
      for (const node of v.nodes.slice(0, 5)) console.error(`    ${node.target.join(' ')}`);
    }
  }
  await context.close();
}
await browser.close();
server.close();

if (failures > 0) {
  console.error(`a11y-check: ${failures} violation(s)`);
  process.exit(1);
}
console.log('a11y-check: all pages clean');
