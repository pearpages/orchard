import type { Worker } from '@playwright/test'
import { expect, test } from './fixtures'
import type { TrackerState } from '../src/core/types'

function getTrackerState(serviceWorker: Worker): Promise<TrackerState | null> {
  return serviceWorker.evaluate(async () => {
    const result = await chrome.storage.session.get('hopchase:tracker')
    return (result['hopchase:tracker'] as TrackerState | undefined) ?? null
  })
}

async function waitForChain(
  serviceWorker: Worker,
  predicate: (state: TrackerState) => number | null,
  timeoutMs = 15_000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const state = await getTrackerState(serviceWorker)
    const tabId = state ? predicate(state) : null
    if (tabId != null) return tabId
    if (Date.now() > deadline) throw new Error('Timed out waiting for tracker state')
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

/** The tabId whose current chain satisfies the predicate. */
function findTab(
  state: TrackerState,
  predicate: (chain: TrackerState['tabs'][number]['chain']) => boolean,
): number | null {
  for (const [tabId, tab] of Object.entries(state.tabs)) {
    if (predicate(tab.chain)) return Number(tabId)
  }
  return null
}

test('records a server 301→302→200 chain and renders it in the popup', async ({
  context,
  serviceWorker,
  extensionId,
  redirectServer,
}) => {
  const page = await context.newPage()
  await page.goto(`${redirectServer.url}chain/a`)

  const tabId = await waitForChain(serviceWorker, (state) =>
    findTab(state, (chain) => chain.status === 'settled' && chain.hops.length === 3),
  )

  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html?tab=${tabId}`)
  await expect(popup.locator('.hop-row')).toHaveCount(3)
  await expect(popup.locator('.hop-row .status-badge').nth(0)).toHaveText('301')
  await expect(popup.locator('.hop-row .status-badge').nth(1)).toHaveText('302')
  await expect(popup.locator('.hop-row .status-badge').nth(2)).toHaveText('200')
  await expect(popup.locator('.chain-view__count')).toHaveText('2 redirects')
})

test('flags a redirect loop as an error', async ({ context, serviceWorker, extensionId, redirectServer }) => {
  const page = await context.newPage()
  await page.goto(`${redirectServer.url}loop/1`).catch(() => {
    // net::ERR_TOO_MANY_REDIRECTS aborts the navigation; that is the point.
  })

  const tabId = await waitForChain(serviceWorker, (state) =>
    findTab(state, (chain) => chain.status === 'error' && chain.hops[0]?.url.includes('/loop/')),
  )

  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html?tab=${tabId}`)
  await expect(popup.locator('.issue-panel__row--error').first()).toContainText(/redirect loop|too many redirects/i)
  await expect(popup.locator('.status-badge--err').first()).toBeVisible()
})

test('links a meta refresh into the chain as a client-side redirect', async ({
  context,
  serviceWorker,
  extensionId,
  redirectServer,
}) => {
  const page = await context.newPage()
  await page.goto(`${redirectServer.url}meta`)
  await page.waitForURL('**/final')

  const tabId = await waitForChain(serviceWorker, (state) =>
    findTab(
      state,
      (chain) =>
        chain.status === 'settled' &&
        chain.hops.length >= 2 &&
        chain.finalUrl != null &&
        chain.finalUrl.endsWith('/final'),
    ),
  )

  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html?tab=${tabId}`)
  await expect(popup.locator('.hop-row')).toHaveCount(2)
  await expect(popup.locator('.issue-panel__row--warning').first()).toContainText('client-side')
})

test('traces a pasted URL from the popup without navigating', async ({
  context,
  extensionId,
  redirectServer,
}) => {
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`)
  await popup.locator('.tabs__tab', { hasText: 'Tracer' }).click()
  await popup.locator('.tracer-tab__input').fill(`${redirectServer.url}chain/a`)
  await popup.locator('.tracer-tab__submit').click()

  await expect(popup.locator('.hop-row')).toHaveCount(3, { timeout: 15_000 })
  await expect(popup.locator('.hop-row .status-badge').nth(0)).toHaveText('301')
  await expect(popup.locator('.hop-row .status-badge').nth(2)).toHaveText('200')
})

test('flags a canonical URL that disagrees with the final URL', async ({
  context,
  serviceWorker,
  extensionId,
  redirectServer,
}) => {
  const page = await context.newPage()
  await page.goto(`${redirectServer.url}chain/a`)

  const tabId = await waitForChain(serviceWorker, (state) =>
    findTab(state, (chain) => chain.status === 'settled' && chain.canonicalUrl != null),
  )

  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html?tab=${tabId}`)
  await expect(popup.locator('.issue-panel__row--warning').first()).toContainText('canonical')
})
