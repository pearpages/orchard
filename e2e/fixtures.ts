import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test'
import { startEchoServer, type EchoServer } from './echo-server'

const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')

interface ExtensionFixtures {
  context: BrowserContext
  serviceWorker: Worker
  extensionId: string
  echoServer: EchoServer
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${distPath}`, `--load-extension=${distPath}`],
    })
    await use(context)
    await context.close()
  },
  serviceWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers()
    if (!worker) worker = await context.waitForEvent('serviceworker')
    await use(worker)
  },
  extensionId: async ({ serviceWorker }, use) => {
    await use(new URL(serviceWorker.url()).host)
  },
  // eslint-disable-next-line no-empty-pattern
  echoServer: async ({}, use) => {
    const server = await startEchoServer()
    await use(server)
    await server.close()
  },
})

export const expect = test.expect
