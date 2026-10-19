// Feature proof only; run against `npm run demo -- --port 5201`.
// PLAYWRIGHT_MODULE and CHROMIUM_PATH allow an isolated browser installation.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core')
const output = resolve(process.env.PROOF_OUTPUT ?? 'packages/kit-dashboard/docs/screenshots/timestamp-samples')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
const results = []
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1200 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.clock.setFixedTime(new Date('2026-10-01T12:00:00Z'))
    await page.goto(process.env.PROOF_URL ?? 'http://127.0.0.1:5201/samples.html')
    await page.locator('[data-testid=samples] .recharts-line-dot').first().waitFor()
    await page.waitForTimeout(2100) // Existing chart animation must settle for byte comparisons.
    const geometry = await page.locator('[data-testid=samples]').evaluate(el => {
      const svg = el.querySelector('svg')
      const plot = svg.querySelector('clipPath rect')
      const attr = (node, key) => Number(node.getAttribute(key))
      const dots = [...svg.querySelectorAll('.recharts-line-dot')].map(dot => ({
        x: attr(dot, 'cx'), y: attr(dot, 'cy'), fill: getComputedStyle(dot).fill,
      }))
      const zero = [...svg.querySelectorAll('.recharts-yAxis-tick-labels text')].find(t => t.textContent === '0')
      const path = svg.querySelector('.recharts-line-curve')
      const primary = document.createElement('span')
      primary.className = 'text-primary'
      el.append(primary)
      const color = getComputedStyle(primary).color
      primary.remove()
      return {
        dots, path: path?.getAttribute('d') ?? '', zeroY: zero ? attr(zero, 'y') : null,
        plot: { x: attr(plot, 'x'), y: attr(plot, 'y'), width: attr(plot, 'width'), height: attr(plot, 'height') },
        stroke: path ? getComputedStyle(path).stroke : null, primary: color,
        caption: el.querySelector('figcaption').textContent,
        rows: [...el.querySelectorAll('tbody tr')].map(row => row.textContent),
        hiddenChartTabStops: el.querySelectorAll('[aria-hidden=true] [tabindex="0"]').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    const near = (a, b) => Math.abs(a - b) < 0.01
    const xs = Array.from({ length: 5 }, (_, index) => geometry.plot.x + geometry.plot.width * index / 4)
    const segments = geometry.path.split('M').filter(Boolean).map(segment =>
      [...segment.matchAll(/(?:^|[ML])(-?[\d.]+),(-?[\d.]+)/g)].map(match => Number(match[1])))
    const gap = !geometry.dots.some(dot => near(dot.x, xs[2])) &&
      !segments.some(segment => Math.min(...segment) < xs[2] && Math.max(...segment) > xs[2])
    const zero = geometry.dots.some(dot => near(dot.x, xs[3]) && near(dot.y, geometry.zeroY))
    const gauge = geometry.dots.length === 4 && [2, 4, null, 0, 3].every((value, index) =>
      value === null || geometry.dots.some(dot => near(dot.x, xs[index]) &&
        near(dot.y, geometry.plot.y + geometry.plot.height * (1 - value / 4))))
    const checks = { gap, zero, gauge }
    if (process.env.NEGATIVE_EXPECTED) {
      assert.equal(checks[process.env.NEGATIVE_EXPECTED], false, 'Negative control did not fail its geometry assertion')
    } else {
      assert.ok(gap, 'Null sample must have no mark and no segment across its x')
      assert.ok(zero, 'Finite zero must have a mark at the zero baseline')
      assert.ok(gauge, 'Same-day gauge values must remain separate exact samples')
      assert.equal(geometry.stroke, geometry.primary, 'Line must resolve the named primary token')
      assert.ok(geometry.dots.every(dot => dot.fill === geometry.primary), 'Dots must resolve the named primary token')
      assert.ok(geometry.rows[2].endsWith('No sample'), 'Text alternative must include null rows')
      assert.equal(geometry.hiddenChartTabStops, 0)
      assert.equal(geometry.overflow, false)
      const legacy = await page.locator('[data-testid^=legacy-]').evaluateAll(elements => elements.map(el => el.innerHTML))
      const legacyFile = resolve(output, `legacy-${width}.json`)
      if (process.env.PROOF_BASELINE === '1') writeFileSync(legacyFile, JSON.stringify(legacy, null, 2) + '\n')
      else assert.deepEqual(legacy, JSON.parse(readFileSync(legacyFile)), 'Existing day chart markup must be byte-identical')
      await page.screenshot({ path: resolve(output, `samples-${width}.png`), fullPage: true })
    }
    assert.deepEqual(errors, [])
    results.push({ width, reducedMotion: 'reduce', checks, geometry, expectedFailure: process.env.NEGATIVE_EXPECTED || null })
    await page.close()
  }
} finally {
  await browser.close()
}
const name = process.env.NEGATIVE_EXPECTED ? `negative-${process.env.NEGATIVE_EXPECTED}` : process.env.PROOF_BASELINE === '1' ? 'before' : 'after'
writeFileSync(resolve(output, `${name}.json`), JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify(results.map(({ width, checks, expectedFailure }) => ({ width, checks, expectedFailure }))))
