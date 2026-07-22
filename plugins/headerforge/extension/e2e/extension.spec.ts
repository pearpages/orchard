import { expect, test } from './fixtures'

test('modifies request and response headers end to end', async ({
  context,
  page,
  serviceWorker,
  extensionId,
  echoServer,
}) => {
  const getRulesJson = () =>
    serviceWorker.evaluate(async () =>
      JSON.stringify(await chrome.declarativeNetRequest.getDynamicRules()),
    )

  // The popup page is a plain extension page we can drive directly.
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)

  const requestSection = page.locator('.header-section', {
    has: page.getByRole('heading', { name: 'Request headers' }),
  })
  const responseSection = page.locator('.header-section', {
    has: page.getByRole('heading', { name: 'Response headers' }),
  })

  // The default profile starts with one blank request-header row.
  await requestSection.getByPlaceholder('Name').fill('x-e2e-test')
  await requestSection.getByPlaceholder('Value').fill('hello-42')

  // Add a response-header rule that strips the server's x-canary header.
  await responseSection.getByRole('button', { name: '+ Add' }).click()
  await responseSection.getByPlaceholder('Name').fill('x-canary')
  await responseSection.locator('.header-row__operation-select').selectOption('remove')

  // Saves are debounced in the popup and the service worker; poll until applied.
  await expect.poll(getRulesJson).toContain('x-e2e-test')
  await expect.poll(getRulesJson).toContain('x-canary')

  // Verify on the wire against the echo server.
  const target = await context.newPage()
  const response = await target.goto(echoServer.url)
  expect(response).not.toBeNull()
  const echoedHeaders = JSON.parse(await response!.text()) as Record<string, string>
  expect(echoedHeaders['x-e2e-test']).toBe('hello-42')
  expect(response!.headers()['x-canary']).toBeUndefined()

  // Badge shows the number of active headers across enabled profiles.
  await expect
    .poll(() => serviceWorker.evaluate(() => chrome.action.getBadgeText({})))
    .toBe('2')

  // Toggling the request header off must tear its rule down again.
  // The real checkbox is visually hidden; click the styled track inside its label.
  await requestSection.locator('.toggle__track').first().click()
  await expect.poll(getRulesJson).not.toContain('x-e2e-test')

  const secondResponse = await target.goto(echoServer.url)
  const secondHeaders = JSON.parse(await secondResponse!.text()) as Record<string, string>
  expect(secondHeaders['x-e2e-test']).toBeUndefined()
})

test('adds a working header via the response presets menu', async ({
  context,
  page,
  serviceWorker,
  extensionId,
  echoServer,
}) => {
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)

  const responseSection = page.locator('.header-section', {
    has: page.getByRole('heading', { name: 'Response headers' }),
  })
  await responseSection.getByRole('button', { name: 'Presets' }).click()
  await responseSection.getByRole('menuitem', { name: 'Allow all origins (CORS)' }).click()

  // The preset row arrives prefilled and enabled; wait for its rule.
  await expect
    .poll(() =>
      serviceWorker.evaluate(async () =>
        JSON.stringify(await chrome.declarativeNetRequest.getDynamicRules()),
      ),
    )
    .toContain('Access-Control-Allow-Origin')

  const target = await context.newPage()
  const response = await target.goto(echoServer.url)
  expect(response!.headers()['access-control-allow-origin']).toBe('*')
})

test('applies headers only to URLs matching the profile filters', async ({
  context,
  page,
  serviceWorker,
  extensionId,
  echoServer,
}) => {
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`)

  const requestSection = page.locator('.header-section', {
    has: page.getByRole('heading', { name: 'Request headers' }),
  })
  await requestSection.getByPlaceholder('Name').fill('x-filtered')
  await requestSection.getByPlaceholder('Value').fill('only-matching')

  const filterSection = page.locator('.url-filter-section')
  await filterSection.getByRole('button', { name: '+ Add' }).click()
  await filterSection.getByRole('textbox').fill('/match-me')

  await expect
    .poll(() =>
      serviceWorker.evaluate(async () =>
        JSON.stringify(await chrome.declarativeNetRequest.getDynamicRules()),
      ),
    )
    .toContain('/match-me')

  const target = await context.newPage()

  const matching = await target.goto(`${echoServer.url}match-me`)
  const matchingHeaders = JSON.parse(await matching!.text()) as Record<string, string>
  expect(matchingHeaders['x-filtered']).toBe('only-matching')

  const nonMatching = await target.goto(`${echoServer.url}other-path`)
  const nonMatchingHeaders = JSON.parse(await nonMatching!.text()) as Record<string, string>
  expect(nonMatchingHeaders['x-filtered']).toBeUndefined()
})
