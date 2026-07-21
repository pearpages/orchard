import http from 'node:http';
import path from 'node:path';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import { createBdd, test as base } from 'playwright-bdd';

const DIST = path.resolve(process.cwd(), 'dist');

export interface SeedCookie {
  name: string;
  domain: string;
  value?: string;
  path?: string;
  secure?: boolean;
  sameSite?: 'no_restriction' | 'lax' | 'strict' | 'unspecified';
  expirationDate?: number;
}

/** Per-scenario helper around the extension pages and the chrome.cookies API. */
export class Jar {
  downloadPath: string | null = null;
  /** Last tab opened via openTab (the static test page). */
  testPage: Page | null = null;

  constructor(
    public page: Page,
    public extensionId: string,
    public context: BrowserContext,
  ) {}

  managerUrl(): string {
    return `chrome-extension://${this.extensionId}/src/manager/index.html`;
  }

  popupUrl(): string {
    return `chrome-extension://${this.extensionId}/src/popup/index.html`;
  }

  async openManager(): Promise<void> {
    await this.page.goto(this.managerUrl());
  }

  async openManagerView(view: 'cookies' | 'storage' | 'timeline'): Promise<void> {
    await this.page.goto(`${this.managerUrl()}#view=${view}`);
  }

  async openTab(url: string): Promise<Page> {
    const tab = await this.context.newPage();
    await tab.goto(url);
    this.testPage = tab;
    return tab;
  }

  /** Runs fn inside an extension page so chrome.cookies is available. */
  private async inExtension<T, A>(fn: (arg: A) => Promise<T>, arg: A): Promise<T> {
    if (!this.page.url().startsWith('chrome-extension://')) {
      await this.page.goto(this.managerUrl());
    }
    return this.page.evaluate(fn as (arg: unknown) => Promise<T>, arg as unknown);
  }

  async seed(cookies: SeedCookie[]): Promise<void> {
    await this.inExtension(async (seeds: SeedCookie[]) => {
      for (const seed of seeds) {
        const bare = seed.domain.startsWith('.') ? seed.domain.slice(1) : seed.domain;
        const scheme = seed.secure ? 'https' : 'http';
        await chrome.cookies.set({
          url: `${scheme}://${bare}${seed.path ?? '/'}`,
          name: seed.name,
          value: seed.value ?? 'value',
          ...(seed.domain.startsWith('.') ? { domain: seed.domain } : {}),
          path: seed.path ?? '/',
          secure: seed.secure ?? false,
          sameSite: seed.sameSite ?? 'lax',
          ...(seed.expirationDate ? { expirationDate: seed.expirationDate } : {}),
        });
      }
    }, cookies);
  }

  async removeCookie(name: string, domain: string): Promise<void> {
    await this.inExtension(
      async (arg: { name: string; domain: string }) => {
        await chrome.cookies.remove({ url: `http://${arg.domain}/`, name: arg.name });
      },
      { name, domain },
    );
  }

  async cookiesForDomain(
    domain: string,
  ): Promise<{ name: string; domain: string; value: string; sameSite: string }[]> {
    return this.inExtension(async (d: string) => {
      const cookies = await chrome.cookies.getAll({ domain: d });
      return cookies.map((c) => ({ name: c.name, domain: c.domain, value: c.value, sameSite: c.sameSite }));
    }, domain);
  }

  async clearAll(): Promise<void> {
    await this.inExtension(async (_: null) => {
      const cookies = await chrome.cookies.getAll({ partitionKey: {} });
      for (const c of cookies) {
        const bare = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
        await chrome.cookies.remove({
          url: `${c.secure ? 'https' : 'http'}://${bare}${c.path}`,
          name: c.name,
          storeId: c.storeId,
          ...(c.partitionKey ? { partitionKey: c.partitionKey } : {}),
        });
      }
    }, null);
  }
}

export interface StaticServer {
  /** Page that seeds localStorage/sessionStorage; accepts ?lk=&lv= overrides. */
  url: string;
  host: string;
}

interface Fixtures {
  context: BrowserContext;
  extensionId: string;
  jar: Jar;
}

interface WorkerFixtures {
  staticServer: StaticServer;
}

const TEST_PAGE = `<!doctype html>
<html><head><title>CJ Test Page</title></head><body>
<h1>CookieJar test page</h1>
<script>
  const params = new URLSearchParams(location.search);
  localStorage.setItem(params.get('lk') ?? 'greeting', params.get('lv') ?? 'hello');
  sessionStorage.setItem('tabToken', 't-1');
</script>
</body></html>`;

export const test = base.extend<Fixtures, WorkerFixtures>({
  staticServer: [
    async ({}, use) => {
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(TEST_PAGE);
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      if (typeof address !== 'object' || address === null) throw new Error('no server address');
      const host = `127.0.0.1:${address.port}`;
      await use({ url: `http://${host}/`, host });
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    },
    { scope: 'worker' },
  ],
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: !process.env.HEADED,
      args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    });
    await use(context);
    await context.close();
  },
  page: async ({ context }, use) => {
    await use(await context.newPage());
  },
  extensionId: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    await use(new URL(worker.url()).host);
  },
  jar: async ({ page, extensionId, context }, use) => {
    await use(new Jar(page, extensionId, context));
  },
});

export const { Given, When, Then } = createBdd(test);
