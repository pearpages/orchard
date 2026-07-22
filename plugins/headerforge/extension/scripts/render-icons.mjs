// Renders public/icons/icon.svg to the PNG sizes the manifest needs,
// using the Chromium that Playwright already installed.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), '../public/icons')
const svg = readFileSync(join(iconsDir, 'icon.svg'), 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()
for (const size of [16, 48, 128]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  )
  const png = await page.screenshot({ omitBackground: true })
  writeFileSync(join(iconsDir, `icon-${size}.png`), png)
  console.log(`icon-${size}.png`)
}
await browser.close()
