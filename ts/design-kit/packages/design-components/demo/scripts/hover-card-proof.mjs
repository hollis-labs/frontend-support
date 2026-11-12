import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Optional browser tooling lives outside the package's runtime dependencies.
// PLAYWRIGHT_MODULE can point at a scratch installation's index.mjs.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const baseURL = process.env.PROOF_URL ?? 'http://127.0.0.1:4313/'
const output = process.env.PROOF_OUTPUT
if (!output) throw new Error('Set PROOF_OUTPUT to a scratch output directory')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(baseURL)
  // Regression: an explicit aria-hidden=false must expose preview controls.
  const galleryTrigger = page.getByRole('link', { name: 'Preview gallery' })
  await galleryTrigger.hover()
  const accessiblePopup = page.locator('[data-slot=hover-card-content][aria-hidden=false]')
  await accessiblePopup.waitFor({ state: 'visible' })
  assert.equal(await accessiblePopup.getAttribute('aria-hidden'), 'false')
  assert.equal(await page.getByRole('button', { name: 'Previous preview' }).isVisible(), true)
  assert.equal(await page.getByRole('button', { name: 'Next preview' }).isVisible(), true)
  await page.getByRole('button', { name: 'Next preview' }).focus()
  assert.equal(await page.getByRole('button', { name: 'Next preview' }).evaluate((el) => document.activeElement === el), true)
  await page.mouse.move(0, 0)
  const themes = await page.locator('#theme option').evaluateAll((items) => items.map((item) => item.value))
  const results = []
  for (const theme of themes) {
    for (const mode of ['light', 'dark']) {
      const url = new URL(baseURL)
      url.searchParams.set('theme', theme)
      url.searchParams.set('mode', mode)
      await page.goto(url.href)
      const trigger = page.getByRole('link', { name: 'Preview destination' })
      const popup = page.locator('[data-slot=hover-card-content]')
      assert.equal(await trigger.getAttribute('href'), '#destination')
      await trigger.hover()
      await popup.waitFor({ state: 'visible' })
      assert.equal(await popup.getAttribute('aria-hidden'), 'true')
      assert.equal(await popup.evaluate((el) => !!el.closest('#root')), false, 'popup is portalled')
      await popup.hover()
      assert.equal(await popup.isVisible(), true, 'pointer can travel into the preview')
      const styles = await popup.evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        color: getComputedStyle(el).color,
        radius: getComputedStyle(el).borderTopLeftRadius,
        width: getComputedStyle(el).width,
      }))
      assert.notEqual(styles.background, 'rgba(0, 0, 0, 0)')
      assert.notEqual(styles.color, styles.background)
      assert.notEqual(styles.radius, '0px')
      await popup.evaluate(async (el) => {
        await Promise.all(el.getAnimations().map((animation) => animation.finished))
      })
      await page.screenshot({ path: path.join(output, `${theme}-${mode}.png`), fullPage: true })
      await page.mouse.move(0, 0)
      await popup.waitFor({ state: 'hidden' })
      await trigger.focus()
      await popup.waitFor({ state: 'visible' })
      await page.keyboard.press('Escape')
      await popup.waitFor({ state: 'hidden' })
      assert.equal(await trigger.evaluate((el) => document.activeElement === el), true)
      await page.keyboard.press('Tab')
      assert.equal(await page.locator('[data-slot=hover-card-content]:focus-within').count(), 0)
      results.push({ theme, mode, styles })
    }
  }
  assert.deepEqual(errors, [])
  const receipt = { results, errors, checks: ['explicit aria-hidden=false exposes focusable preview controls', 'link target preserved', 'hover open, pointer transfer, leave close', 'portal and supplementary aria-hidden', 'focus opens, Escape closes without stealing focus', 'no popup tab stop', 'token styles in every theme/mode'] }
  await writeFile(path.join(output, 'browser.json'), JSON.stringify(receipt, null, 2) + '\n')
  console.log(`HoverCard browser proof: PASS (${results.length} theme/mode renders, no page errors).`)
} finally {
  await browser.close()
}
