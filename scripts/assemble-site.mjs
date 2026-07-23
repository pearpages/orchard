// Assembles the deployable path-based site tree into _site/:
// sites/home/dist at the root, each plugins/*/site/dist under /<slug>/.
// Shared by `pnpm sites:build` locally and .github/workflows/deploy-sites.yml.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const out = path.join(root, '_site');

function fail(message) {
  console.error(`assemble-site: ${message}`);
  process.exit(1);
}

const homeDist = path.join(root, 'sites/home/dist');
if (!fs.existsSync(path.join(homeDist, 'index.html'))) {
  fail(`missing ${path.relative(root, homeDist)}/index.html — run the site builds first`);
}

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(homeDist, out, { recursive: true });
console.log('/         <- sites/home/dist');

// slug = the plugins/ child dir name, matching each site's astro `base`
const pluginsDir = path.join(root, 'plugins');
for (const name of fs.readdirSync(pluginsDir).sort()) {
  const site = path.join(pluginsDir, name, 'site');
  if (!fs.existsSync(site)) continue;
  const dist = path.join(site, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    fail(`plugins/${name}/site exists but has no dist/index.html — run the site builds first`);
  }
  fs.cpSync(dist, path.join(out, name), { recursive: true });
  console.log(`/${name}/ <- plugins/${name}/site/dist`);
}
