import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '../..')
const output = await mkdtemp(path.join(tmpdir(), 'kit-chat-virtual-'))
await build({ entryPoints: [path.join(root, 'docs/fixtures/typing-latency.tsx')], outfile: path.join(output, 'fixture.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' } })
await writeFile(path.join(output, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:14px sans-serif}textarea{width:95%;height:60px}</style></head><body><div id="root"></div><script src="fixture.js"></script></body></html>')

const budget = { p95Ms: 100, maxMountedRows: 100, maxAnchorShiftPx: 4, extraHistoryRenders: 0 }
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${pathToFileURL(path.join(output, 'index.html')).href}?items=10000&mode=batched&virtual=true`)
  await page.getByTestId('ready').waitFor()
  const viewport = page.getByRole('region', { name: 'Conversation' })
  await page.waitForFunction(() => document.querySelectorAll('[data-chat-item-id]').length > 0)
  await viewport.evaluate((element) => { element.scrollTop = element.scrollHeight / 2 })
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const anchor = await viewport.evaluate((element) => {
    const top = element.getBoundingClientRect().top
    const row = [...element.querySelectorAll('[data-chat-item-id]')].find((item) => item.getBoundingClientRect().bottom > top)
    return { id: row.dataset.chatItemId, top: row.getBoundingClientRect().top }
  })
  await page.getByRole('button', { name: 'Load older messages' }).click()
  await page.waitForFunction(() => document.querySelector('main')?.getAttribute('data-older-count') === '100')
  await page.waitForFunction((id) => [...document.querySelectorAll('[data-chat-item-id]')].some((row) => row.getAttribute('data-chat-item-id') === id), anchor.id)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const afterTop = await viewport.evaluate((element, id) => {
    const row = [...element.querySelectorAll('[data-chat-item-id]')].find((item) => item.dataset.chatItemId === id)
    return row?.getBoundingClientRect().top ?? null
  }, anchor.id)
  assert.notEqual(afterTop, null, 'visible anchor was evicted after prepend')
  const anchorShiftPx = Number((afterTop - anchor.top).toFixed(2))
  const mountedRows = await page.locator('[data-chat-item-id]').count()
  await page.evaluate(() => { window.__typingPerf.beforeTypingRows = window.__typingPerf.rowRenders })
  await page.getByRole('textbox', { name: 'Draft' }).focus()
  await page.keyboard.type('The quick brown fox types while the agent streams.', { delay: 20 })
  await page.waitForFunction(() => window.__typingPerf.latency.length >= 49 && window.__typingPerf.streamDone)
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const data = await page.evaluate(() => window.__typingPerf)
  const sorted = [...data.latency].sort((a, b) => a - b)
  const percentile = (p) => Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(2))
  const result = { items: 10000, keystrokes: sorted.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), mountedRows, anchorShiftPx, historyRendersBeforeTyping: data.beforeTypingRows, historyRendersAfterTyping: data.afterTypingRows, extraHistoryRenders: data.afterTypingRows - data.beforeTypingRows, pageErrors: errors }
  assert.deepEqual(errors, [], 'browser errors')
  assert.ok(result.mountedRows <= budget.maxMountedRows, 'too many DOM rows mounted')
  assert.ok(Math.abs(result.anchorShiftPx) <= budget.maxAnchorShiftPx, 'prepend shifted scroll anchor')
  assert.ok(result.p95Ms <= budget.p95Ms, 'typing latency exceeded budget')
  assert.equal(result.extraHistoryRenders, budget.extraHistoryRenders, 'typing rerendered history rows')
  const receipt = { fixture: 'kit-chat/docs/fixtures/typing-latency.tsx', budget, result }
  if (process.argv[2]) await writeFile(process.argv[2], `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} finally { await browser.close() }
