import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = process.env.PROOF_OUTPUT
if (!output) throw Error('Set PROOF_OUTPUT to a scratch output directory')
const baseURL = process.env.PROOF_URL ?? 'http://127.0.0.1:4316/'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1200 } })
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async source => { window.copiedSource = source } }, configurable: true }))
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  const initial = new URL(baseURL); initial.searchParams.set('view', 'inspection')
  await page.goto(initial.href)
  await page.getByRole('heading', { name: 'Developer inspection' }).waitFor()
  const themes = await page.locator('#theme option').evaluateAll(options => options.map(x => x.value))
  const results = []
  for (const theme of themes) for (const mode of ['light', 'dark']) {
    const url = new URL(initial); url.searchParams.set('theme', theme); url.searchParams.set('mode', mode)
    await page.goto(url.href)
    await page.getByRole('button', { name: 'parser.ts', exact: true }).waitFor()
    const styles = await page.locator('[data-inspection]').evaluate(el => {
      const root = el.querySelector('[aria-label="Files"]')
      const error = el.querySelector('[aria-label="Error details"] span.text-danger')
      const pass = el.querySelector('[role="img"][aria-label="passed"]')
      return { foreground: getComputedStyle(root).color, background: getComputedStyle(root).backgroundColor, radius: getComputedStyle(root).borderTopLeftRadius, error: getComputedStyle(error).color, pass: getComputedStyle(pass).color }
    })
    assert.notEqual(styles.foreground, styles.background); assert.notEqual(styles.radius, '0px'); assert.notEqual(styles.error, styles.pass)
    assert.equal(await page.locator('button button').count(), 0)
    assert.equal(await page.locator('[data-inspection] script').count(), 0)
    assert.equal(await page.getByRole('progressbar').getAttribute('aria-valuenow'), '75')
    await page.screenshot({ path: path.join(output, `${theme}-${mode}.png`), fullPage: true })
    results.push({ theme, mode, styles })
  }
  await page.getByRole('button', { name: 'Inspect file', exact: true }).click()
  assert.equal(await page.locator('[data-selection]').textContent(), 'Selected: src/parser.ts')
  await page.getByRole('button', { name: 'main.ts', exact: true }).focus(); await page.keyboard.press('Enter')
  assert.equal(await page.locator('[data-selection]').textContent(), 'Selected: src/main.ts')
  const folder = page.getByRole('button', { name: 'Collapse src' })
  await folder.focus(); await page.keyboard.press('Space')
  await page.getByRole('button', { name: 'Expand src' }).waitFor()
  await page.keyboard.press('Space'); await page.getByRole('button', { name: 'Collapse src' }).waitFor()
  await page.getByRole('button', { name: '/src/parser.ts:12:4', exact: true }).click()
  assert.equal(await page.locator('[data-inspection-status]').textContent(), 'Open /src/parser.ts:12:4')
  await page.getByRole('button', { name: 'Copy stack trace' }).click()
  await page.getByText('Copied trace', { exact: true }).waitFor()
  assert.equal(await page.evaluate(() => window.copiedSource), 'TypeError: Expected a string\n    at parse (/src/parser.ts:12:4)\n    at run (/src/main.ts:8:2)\n    at process (node:internal/task_queues:95:5)\nunknown frame <script>alert(1)</script>')
  assert.equal(await page.getByRole('button', { name: 'TypeError: Expected a string' }).getAttribute('aria-expanded'), 'true')
  const suite = page.getByRole('button', { name: 'failed parser.test.ts' })
  await suite.focus(); await page.keyboard.press('Enter')
  assert.equal(await suite.getAttribute('aria-expanded'), 'false')
  await page.keyboard.press('Enter')
  await page.getByText('accepts missing input', { exact: true }).waitFor()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.getByRole('img', { name: 'running' }).locator('svg').evaluate(el => getComputedStyle(el).animationName), 'none')
  assert.deepEqual(errors, [])
  await writeFile(path.join(output, 'browser.json'), JSON.stringify({ results, nativeKeyboard: true, siblingActions: true, exactTraceCopy: true, hostNavigation: true, reducedMotion: true, errors }, null, 2))
  console.log(`PASS: ${results.length} theme/mode screenshots, keyboard disclosures/selection, sibling actions, exact copy, host navigation, reduced motion`)
} finally { await browser.close() }
