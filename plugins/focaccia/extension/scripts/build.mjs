// Builds the extension into dist/: bundles the TypeScript entry points with
// esbuild, copies static assets, and generates the icons.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { writeIcons } from './make-icons.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: {
    background: join(src, 'background/index.ts'),
    'popup/popup': join(src, 'popup/index.ts'),
    'blocked/blocked': join(src, 'blocked/index.ts'),
    'phase-end/phase-end': join(src, 'phase-end/index.ts'),
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: dist,
  sourcemap: false,
  logLevel: 'info',
});

const staticFiles = [
  ['manifest.json', 'manifest.json'],
  ['popup/popup.html', 'popup/popup.html'],
  ['popup/css', 'popup/css'],
  ['blocked/blocked.html', 'blocked/blocked.html'],
  ['blocked/blocked.css', 'blocked/blocked.css'],
  ['phase-end/phase-end.html', 'phase-end/phase-end.html'],
  ['phase-end/phase-end.css', 'phase-end/phase-end.css'],
];

for (const [from, to] of staticFiles) {
  cpSync(join(src, from), join(dist, to), { recursive: true });
}

// Shared assets resolved from the workspace package.
const pearIcon = fileURLToPath(import.meta.resolve('@browser-plugins/assets/pearpages-icon.png'));
cpSync(pearIcon, join(dist, 'popup/pearpages-icon.png'));

writeIcons(join(dist, 'icons'));

console.log('Built to dist/ — load it via chrome://extensions → Load unpacked.');
