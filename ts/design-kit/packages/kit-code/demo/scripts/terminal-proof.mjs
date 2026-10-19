/**
 * Real-browser proof for `/terminal`. Manual evidence, not run by CI.
 *
 *   npm run demo:build -w @hollis-labs/kit-code
 *   PROOF_OUTPUT=<scratch dir> PLAYWRIGHT_MODULE=<path to playwright-core> [CHROMIUM=<browser binary>] \
 *     node packages/kit-code/demo/scripts/terminal-proof.mjs
 *
 * The built demo is served from an in-process server bound to 127.0.0.1 only.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const output = process.env.PROOF_OUTPUT
if (!output) throw Error('Set PROOF_OUTPUT to a scratch output directory')
await mkdir(output, { recursive: true })

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist')
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.map': 'application/json' }
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://x')
  const file = path.join(dist, url.pathname === '/' ? 'index.html' : url.pathname)
  if (!file.startsWith(dist)) return void response.writeHead(403).end()
  if (url.pathname === '/favicon.ico') return void response.writeHead(204).end()
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const baseURL = `http://127.0.0.1:${server.address().port}/`

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM, headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } })
  await page.addInitScript(() => {
    window.copied = null
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { window.copied = text } }, configurable: true })
  })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })

  const open = async (extra = {}) => {
    const url = new URL(baseURL)
    url.searchParams.set('view', 'terminal')
    for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value)
    await page.goto(url.href)
    await page.locator('[data-terminal-demo]').waitFor()
  }

  await open()
  const themes = await page.locator('#theme option').evaluateAll((options) => options.map((option) => option.value))
  const results = []
  for (const theme of themes) {
    for (const mode of ['light', 'dark']) {
      await open({ theme, mode })
      const styles = await page.locator('[data-sample]').evaluate((root) => {
        const colour = (selector) => getComputedStyle(root.querySelector(selector)).color
        const background = (selector) => getComputedStyle(root.querySelector(selector)).backgroundColor
        return {
          text: getComputedStyle(root.querySelector('pre')).color,
          red: colour('.ansi-red-fg'),
          green: colour('.ansi-green-fg'),
          yellow: colour('.ansi-yellow-fg'),
          blue: colour('.ansi-blue-fg'),
          magenta: colour('.ansi-magenta-fg'),
          dim: getComputedStyle(root.querySelector('.ansi-dim')).opacity,
          bold: getComputedStyle(root.querySelector('.ansi-bold')).fontWeight,
          greenBackground: background('.ansi-green-bg'),
          container: background('pre'),
          radius: getComputedStyle(root).borderTopLeftRadius,
          inlineStyles: root.querySelectorAll('pre [style]').length,
        }
      })
      assert.equal(styles.inlineStyles, 0)
      assert.notEqual(styles.red, styles.text)
      assert.notEqual(styles.red, styles.green)
      assert.notEqual(styles.yellow, styles.text)
      assert.notEqual(styles.greenBackground, 'rgba(0, 0, 0, 0)')
      assert.notEqual(styles.radius, '0px')
      assert.equal(styles.dim, '0.7')
      assert.ok(Number(styles.bold) >= 600)
      // 256-colour above 15 and true colour keep the plain text colour.
      const plain = await page.locator('[data-sample]').evaluate((root) => {
        const span = [...root.querySelectorAll('pre span')].find((s) => s.textContent.includes('256-colour'))
        return { text: getComputedStyle(root.querySelector('pre')).color, span: getComputedStyle(span).color }
      })
      assert.equal(plain.span, plain.text)
      await page.screenshot({ path: path.join(output, `${theme}-${mode}.png`), fullPage: true })
      results.push({ theme, mode, styles })
    }
  }

  // ---- hostile output, in the default theme
  await open()
  const hostile = await page.locator('[data-hostile]').evaluate((root) => ({
    elements: root.querySelectorAll('script, img, a, iframe, object, embed').length,
    handlers: [...root.querySelectorAll('*')].flatMap((e) => [...e.attributes].filter((a) => a.name.startsWith('on')).map((a) => a.name)),
    text: root.querySelector('pre').textContent,
  }))
  assert.equal(hostile.elements, 0)
  assert.deepEqual(hostile.handlers, [])
  assert.ok(hostile.text.includes('<script>window.pwned = 1</script>'))
  assert.ok(hostile.text.includes('click me') && hostile.text.includes('text after a window-title sequence'))
  assert.ok(!hostile.text.includes('javascript:window.pwned=3') && !hostile.text.includes('hijacked title') && !hostile.text.includes('\x1b'))
  assert.equal(await page.evaluate(() => window.pwned), undefined)
  await page.locator('[data-hostile]').getByRole('button', { name: 'Copy terminal output' }).click()
  await page.locator('[data-hostile]').getByRole('button', { name: 'Copied' }).waitFor()
  const copiedHostile = await page.evaluate(() => window.copied)
  assert.ok(!copiedHostile.includes('\x1b') && !copiedHostile.includes('javascript:window.pwned=3') && copiedHostile.includes('click me'))

  // ---- copy takes the visible text of the sample, and clear is the host's
  await page.locator('[data-sample]').getByRole('button', { name: 'Copy terminal output' }).click()
  await page.locator('[data-sample]').getByRole('button', { name: 'Copied' }).waitFor()
  const copiedSample = await page.evaluate(() => window.copied)
  assert.ok(copiedSample.startsWith('$ npm test\nRunning 4 suites\n✓ parser accepts valid input (12ms)'))
  assert.ok(!copiedSample.includes('\x1b'))
  await page.locator('[data-sample]').getByRole('button', { name: 'Clear terminal output' }).click()
  assert.equal(await page.locator('[data-terminal-status]').textContent(), 'Cleared by host')
  assert.equal((await page.locator('[data-sample] pre').textContent()).trim(), '')

  // ---- streaming status and reduced motion
  await open()
  await page.getByRole('button', { name: 'Start streaming' }).click()
  assert.equal(await page.locator('[data-sample]').getByRole('status').textContent(), 'Streaming')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  assert.equal(await page.locator('[data-sample] pre span[aria-hidden="true"]').evaluate((el) => getComputedStyle(el).animationName), 'none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  assert.notEqual(await page.locator('[data-sample] pre span[aria-hidden="true"]').evaluate((el) => getComputedStyle(el).animationName), 'none')

  // ---- bounded rendering and keyboard scrolling
  const bounded = {}
  for (const [label, button] of [['lines', 'Load 40,000 lines'], ['colourChanges', 'Load 6 MB of colour changes']]) {
    await open()
    await page.getByRole('button', { name: button }).click()
    await page.locator('[data-large]').waitFor()
    await page.waitForFunction(() => /Rendered in \d+ ms/.test(document.querySelector('[data-render-ms]').textContent))
    const facts = await page.locator('[data-large]').evaluate((root) => ({
      truncated: root.querySelector('[role="log"]').getAttribute('data-truncated'),
      notice: root.querySelector('[data-slot="terminal-truncated"]').textContent,
      shown: root.querySelector('pre').textContent.length,
      spans: root.querySelectorAll('pre span').length,
    }))
    const ms = Number((await page.locator('[data-render-ms]').textContent()).match(/\d+/)[0])
    assert.equal(facts.truncated, 'true')
    assert.ok(facts.shown <= 65536)
    assert.ok(ms < 3000, `${label} rendered in ${ms} ms`)
    bounded[label] = { ...facts, renderMs: ms }
  }
  const log = page.locator('[data-large] [role="log"]')
  await log.focus()
  const bottom = await log.evaluate((el) => el.scrollTop)
  await page.keyboard.press('Home')
  // Chromium animates keyboard scrolling; wait for it to arrive.
  const top = await log.evaluate((el) => new Promise((resolve) => {
    const settle = () => (el.scrollTop === 0 ? resolve(0) : requestAnimationFrame(settle))
    settle()
    setTimeout(() => resolve(el.scrollTop), 3000)
  }))
  assert.ok(bottom > 0 && top === 0, `the scroll region scrolls from the keyboard (bottom ${bottom}, after Home ${top}, focused: ${await page.evaluate(() => document.activeElement?.getAttribute('role'))})`)
  bounded.keyboard = { bottom, afterHome: top }

  assert.deepEqual(errors, [])
  await writeFile(path.join(output, 'browser.json'), JSON.stringify({ browser: browser.version(), results, hostile: { ...hostile, text: undefined, copiedHasNoEscape: true }, bounded, errors }, null, 2))
  console.log(`PASS: ${results.length} theme/mode screenshots; colour roles, 256/true-colour fallback, no inline styles; hostile output inert and copied as plain text; clear; streaming + reduced motion; bounded render (40,000 lines ${bounded.lines.renderMs} ms, 6 MB of colour changes ${bounded.colourChanges.renderMs} ms); keyboard scrolling`)
} finally {
  await browser.close()
  server.close()
}
