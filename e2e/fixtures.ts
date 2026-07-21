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

  constructor(
    public page: Page,
    public extensionId: string,
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

interface Fixtures {
  context: BrowserContext;
  extensionId: string;
  jar: Jar;
}

export const test = base.extend<Fixtures>({
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
  jar: async ({ page, extensionId }, use) => {
    await use(new Jar(page, extensionId));
  },
});

export const { Given, When, Then } = createBdd(test);
