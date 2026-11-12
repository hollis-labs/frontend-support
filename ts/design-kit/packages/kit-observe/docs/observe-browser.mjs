import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core')
const output = resolve(process.env.PROOF_OUTPUT ?? 'packages/kit-observe/docs')
mkdirSync(resolve(output, 'screenshots'), { recursive: true })
mkdirSync(resolve(output, 'receipts'), { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
const results = []
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1100 }, reducedMotion: 'reduce' })
    const url = process.env.PROOF_URL ?? 'http://127.0.0.1:5202'
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin })
    const page = await context.newPage()
    const errors = [], remoteSchemas = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (request.url().includes('invalid.example')) remoteSchemas.push(request.url()) })
    await page.goto(url)
    const unknown = page.getByRole('region', { name: 'Unknown health control', exact: true })
    await unknown.waitFor()
    const unknownHealthy = await unknown.getByText('healthy', { exact: true }).count()
    if (process.env.NEGATIVE_EXPECTED === 'unknown') {
      assert.equal(unknownHealthy, 1, 'Negative control did not produce the detectable false healthy result')
      results.push({ width, negativeUnknownIsDetected: true })
      await context.close()
      continue
    }
    assert.equal(unknownHealthy, 0, 'Unknown health must never render healthy')
    assert.equal(await unknown.getByText('unknown', { exact: true }).count(), 2)
    const statHeading = page.getByRole('region', { name: 'Manifest stats', exact: true }).getByRole('heading', { level: 2 })
    const statHeadingStyle = await statHeading.evaluate(heading => {
      const style = getComputedStyle(heading)
      return { fontSize: style.fontSize, fontWeight: style.fontWeight }
    })
    assert.deepEqual(statHeadingStyle, { fontSize: '13px', fontWeight: '600' }, 'StatCollection heading must use the control size and semibold weight')
    const zero = page.getByRole('region', { name: 'Real zero', exact: true })
    assert.equal(await zero.getByText('0', { exact: true }).count(), 1)
    assert.equal(await zero.getByText('count · cumulative counter').count(), 1)
    assert.equal(await page.getByRole('region', { name: 'Missing sample', exact: true }).locator('span.font-mono').innerText(), 'Missing sample')
    assert.equal(await page.getByRole('region', { name: 'Pending stat', exact: true }).getByText('0', { exact: true }).count(), 0)
    const series = page.getByRole('region', { name: 'Execution duration', exact: true })
    assert.equal(await series.getByRole('table').getByText('No sample', { exact: true }).count(), 1)
    assert.match(await series.getByRole('alert').innerText(), /truncated/)
    assert.match(await page.getByRole('region', { name: 'Empty successful series', exact: true }).innerText(), /No samples in requested range/)
    const unsupportedDiagnostic = page.getByRole('region', { name: 'Unsupported schema control', exact: true })
    assert.match(await unsupportedDiagnostic.getByRole('alert').innerText(), /Unsupported diagnostic schema/i)
    assert.equal(await unsupportedDiagnostic.getByRole('region').count(), 0)
    assert.match(await page.getByRole('region', { name: 'Invalid diagnostic control', exact: true }).getByRole('alert').innerText(), /validation failed/i)
    const diagnostic = page.getByRole('region', { name: 'Embedding runtime state', exact: true })
    const data = diagnostic.getByRole('region', { name: 'Embedding runtime state data', exact: true })
    assert.match(await data.innerText(), /<b>idle<\/b>/)
    assert.equal(await data.locator('b').count(), 0, 'Diagnostic strings must remain text')
    await data.getByRole('button', { name: 'Copy Embedding runtime state data' }).click()
    await data.getByRole('button', { name: 'Copied' }).waitFor()
    const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()))
    assert.equal(copied.embedding_status, '<b>idle</b> — plain text')
    const summary = diagnostic.locator('summary')
    await summary.focus()
    await summary.press('Enter')
    assert.equal(await diagnostic.locator('details').getAttribute('open'), '')
    await summary.press('Enter')
    const styles = await page.evaluate(() => {
      const probe = document.createElement('span')
      const line = document.querySelector('[aria-label="Manifest diagnostics"] .recharts-line-curve')
      const main = document.querySelector('main')
      main.append(probe)
      probe.className = 'text-primary'
      const primary = getComputedStyle(probe).color
      probe.className = 'text-label'
      const labelSize = getComputedStyle(probe).fontSize
      probe.className = 'border-border-subtle border'
      const border = getComputedStyle(probe).borderTopColor
      probe.remove()
      const heading = document.querySelector('section h3')
      const panel = heading.closest('section')
      return { labelSize, headingSize: getComputedStyle(heading).fontSize, border, panelBorder: getComputedStyle(panel).borderTopColor,
        bodyOverflow: getComputedStyle(document.body).overflowY, lineStroke: getComputedStyle(line).stroke, primary, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth }
    })
    assert.equal(styles.headingSize, styles.labelSize)
    assert.equal(styles.panelBorder, styles.border)
    assert.equal(styles.lineStroke, styles.primary)
    assert.ok(styles.scrollWidth <= styles.viewport, 'No horizontal viewport overflow')
    assert.notEqual(styles.bodyOverflow, 'hidden', 'The standalone demo must allow document scrolling')
    assert.equal(await unknown.getByRole('status').getAttribute('aria-live'), 'polite')
    const health = page.getByRole('region', { name: 'Process health', exact: true })
    const observation = page.getByLabel('Observation', { exact: true })
    const freshTime = await health.locator('time').getAttribute('datetime')
    await observation.selectOption('loading')
    assert.match(await health.getByRole('status').innerText(), /Loading/i)
    assert.equal(await health.getAttribute('aria-busy'), 'true')
    assert.equal(await health.getByText('degraded', { exact: true }).count(), 0)
    assert.equal(await diagnostic.getByRole('region').count(), 0)
    await observation.selectOption('refreshing')
    assert.match(await health.getByRole('status').innerText(), /Refreshing/i)
    assert.equal(await health.locator('time').getAttribute('datetime'), freshTime)
    assert.equal(await health.getByText('degraded', { exact: true }).count(), 1)
    await observation.selectOption('stale')
    assert.match(await health.getByRole('status').innerText(), /Stale/i)
    assert.match(await health.innerText(), /630s ago/)
    assert.doesNotMatch(await health.getByRole('status').innerText(), /630s ago/, 'Age ticks must not trigger live announcements')
    await observation.selectOption('refresh-error')
    assert.match(await health.getByRole('alert').innerText(), /Refresh failed/i)
    assert.equal(await health.locator('time').getAttribute('datetime'), freshTime)
    assert.equal(await health.getByText('degraded', { exact: true }).count(), 1)
    await health.getByRole('button', { name: 'Retry Process health' }).click()
    assert.equal(await observation.inputValue(), 'observed')
    await observation.selectOption('first-error')
    assert.match(await health.getByRole('alert').innerText(), /Observation unavailable/i)
    assert.equal(await health.getByText('degraded', { exact: true }).count(), 0)
    assert.equal(await series.getByRole('table').count(), 0)
    await observation.selectOption('unsupported')
    assert.match(await health.getByRole('status').innerText(), /Unsupported/i)
    assert.equal(await series.getByRole('table').count(), 0)
    await observation.selectOption('paused')
    assert.match(await health.getByRole('status').innerText(), /Paused/i)
    await observation.selectOption('observed')
    await page.screenshot({ path: resolve(output, `screenshots/nanite-${width}.png`), fullPage: true })
    await page.getByLabel('App', { exact: true }).selectOption('tachyon')
    assert.match(await page.getByRole('region', { name: 'Historical series', exact: true }).innerText(), /Unsupported/i)
    assert.equal(await page.getByRole('region', { name: 'Historical series', exact: true }).getByRole('table').count(), 0)
    assert.equal(await page.getByRole('region', { name: 'Loaded plugins', exact: true }).getByText('0', { exact: true }).count(), 1)
    assert.match(await page.getByRole('region', { name: 'Plugin state data', exact: true }).innerText(), /unknown/)
    await page.screenshot({ path: resolve(output, `screenshots/tachyon-${width}.png`), fullPage: true })
    assert.deepEqual(errors, [])
    assert.deepEqual(remoteSchemas, [])
    results.push({ width, unknownNeverHealthy: true, zeroMissingPendingDistinct: true, perResourceFreshness: true,
      loadingRefreshStaleFailureUnsupportedPaused: true, hostRetry: true, emptyVersusUnsupportedSeries: true,
      diagnosticPlainTextCopyAndKeyboardSchema: true, hostValidationVisible: true, statusAria: true, statHeadingStyle, styles,
      pageErrors: errors, remoteSchemaRequests: remoteSchemas })
    await context.close()
  }
} finally { await browser.close() }
const receipt = process.env.NEGATIVE_EXPECTED ? 'negative-unknown' : 'observe-browser'
writeFileSync(resolve(output, `receipts/${receipt}.json`), JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify(results, null, 2))
