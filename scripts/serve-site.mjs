// Static server for the assembled _site/ tree (run `pnpm sites:build` first).
// Exists because the path-based structure needs one root server — per-site
// `astro preview` can't exercise cross-site links. Port 4330: outside the
// 4321-4326 dev-server range.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_site');
const port = 4330;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('serve-site: _site/index.html not found — run `pnpm sites:build` first');
  process.exit(1);
}

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.normalize(path.join(root, urlPath));
    if (!file.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { location: urlPath + '/' }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${urlPath}`);
      return;
    }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`serve-site: port ${port} is already in use (a previous preview still running?)`);
    console.error(`serve-site: free it with: lsof -ti :${port} | xargs kill`);
    process.exit(1);
  }
  throw err;
});

// pnpm/mise wrap this process; exit cleanly when they forward a signal so no
// orphaned server keeps holding the port.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => process.exit(0));
}

server.listen(port, () => console.log(`serving _site/ at http://localhost:${port}/`));
