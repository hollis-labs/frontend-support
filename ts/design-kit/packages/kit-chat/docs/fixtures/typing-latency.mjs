import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '../..')
const output = await mkdtemp(path.join(tmpdir(), 'kit-chat-perf-'))
const entry = path.join(root, 'docs/fixtures/typing-latency.tsx')
await build({ entryPoints: [entry], outfile: path.join(output, 'fixture.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' } })
await writeFile(path.join(output, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font:14px sans-serif}textarea{width:95%;height:60px}</style></head><body><div id="root"></div><script src="fixture.js"></script></body></html>')

const budget = { p95Ms: Number(process.env.P95_BUDGET_MS ?? 100), extraRowRenders: 0 }
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/google-chrome' })
const results = []
try {
  for (const mode of ['unbatched', 'batched']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const url = `${pathToFileURL(path.join(output, 'index.html')).href}?items=2000&mode=${mode}`
    await page.goto(url)
    await page.getByTestId('ready').waitFor()
    await page.waitForFunction(() => window.__typingPerf.rowRenders >= 2000)
    await page.evaluate(() => { window.__typingPerf.beforeTypingRows = window.__typingPerf.rowRenders })
    await page.getByRole('textbox', { name: 'Draft' }).focus()
    await page.keyboard.type('The quick brown fox types while the agent streams.', { delay: 20 })
    await page.waitForFunction(() => window.__typingPerf.latency.length >= 49 && window.__typingPerf.streamDone)
    const data = await page.evaluate(() => window.__typingPerf)
    const sorted = [...data.latency].sort((a, b) => a - b)
    const percentile = (p) => Number(sorted[Math.ceil(p * sorted.length) - 1].toFixed(2))
    const result = { mode, items: 2000, keystrokes: sorted.length, p50Ms: percentile(0.5), p95Ms: percentile(0.95), rowRenders: data.rowRenders, beforeTypingRows: data.beforeTypingRows, afterTypingRows: data.afterTypingRows, extraRowRenders: data.afterTypingRows - data.beforeTypingRows, bindingPublications: data.commits, pageErrors: errors }
    results.push(result)
    assert.deepEqual(errors, [], 'browser errors')
    if (mode === 'batched') {
      assert.ok(result.p95Ms <= budget.p95Ms, `p95 ${result.p95Ms}ms exceeded ${budget.p95Ms}ms budget`)
      assert.equal(result.extraRowRenders, budget.extraRowRenders, 'typing rerendered transcript rows')
    }
    await page.close()
  }
  assert.ok(results[1].bindingPublications < results[0].bindingPublications, 'batching did not reduce binding publications')
  const receipt = { fixture: 'kit-chat/docs/fixtures/typing-latency.tsx', budget, results }
  if (process.argv[2]) await writeFile(process.argv[2], `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} finally {
  await browser.close()
}
