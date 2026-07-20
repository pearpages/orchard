import { createServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';

export const BLOCKED_SITE = 'blocked.test';
const SITE_PORT = 4823;

interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  siteUrl: string;
}

/**
 * Boots a disposable Chromium with the built extension loaded via
 * --load-extension (the programmatic "Load unpacked") into a throwaway
 * profile, plus a local HTTP server reachable as http://blocked.test:<port>/
 * so no real network is involved. Everything is torn down after each test.
 */
export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const distDir = join(process.cwd(), 'dist');
    const profileDir = mkdtempSync(join(tmpdir(), 'site-blocker-e2e-'));
    const server = await startSiteServer();
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: 'chromium',
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        `--host-resolver-rules=MAP ${BLOCKED_SITE} 127.0.0.1`,
      ],
    });
    await use(context);
    await context.close();
    server.close();
    rmSync(profileDir, { recursive: true, force: true });
  },

  serviceWorker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },

  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host);
  },

  siteUrl: async ({}, use) => {
    await use(`http://${BLOCKED_SITE}:${SITE_PORT}/`);
  },
});

export const expect = test.expect;

export async function openPopup(context: BrowserContext, extensionId: string): Promise<Page> {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/popup.html`);
  return popup;
}

/** Waits until the background worker has synced this many dynamic rules. */
export async function expectRuleCount(serviceWorker: Worker, count: number): Promise<void> {
  await expect
    .poll(() =>
      serviceWorker.evaluate(() =>
        chrome.declarativeNetRequest.getDynamicRules().then((rules) => rules.length),
      ),
    )
    .toBe(count);
}

function startSiteServer(): Promise<Server> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><title>Local test site</title><h1>Local test site</h1>');
  });
  return new Promise((resolve) => server.listen(SITE_PORT, '127.0.0.1', () => resolve(server)));
}
