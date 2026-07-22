// Builds the extension into dist/: bundles the TypeScript entry points with
// esbuild and copies static assets.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = join(root, 'src');
const dist = join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await build({
  entryPoints: {
    content_script: join(src, 'content_script.ts'),
    popup: join(src, 'popup.ts'),
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  outdir: dist,
  sourcemap: false,
  logLevel: 'info',
});

// Static assets live at the package root (flat layout, single popup page).
const staticFiles = [
  ['manifest.json', 'manifest.json'],
  ['popup.html', 'popup.html'],
  ['popup.css', 'popup.css'],
  ['pearpages-icon.png', 'pearpages-icon.png'],
  ['icons', 'icons'],
];

for (const [from, to] of staticFiles) {
  cpSync(join(root, from), join(dist, to), { recursive: true });
}

console.log('Built to dist/ — load it via chrome://extensions → Load unpacked.');
