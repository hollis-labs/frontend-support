// Assemble equal viewport crops for human review; no pixel/count assertions.
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const [before, after, output] = process.argv.slice(2)
if (!output) throw new Error('Usage: pair.mjs BEFORE AFTER OUTPUT')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME })
try {
  for (const name of readdirSync(before).filter(name => name.endsWith('.png'))) {
    const width = Number(name.split('-')[1])
    const page = await browser.newPage({ viewport: { width: width * 2, height: 1130 } })
    const images = [before, after].map(dir => readFileSync(join(dir, name)).toString('base64'))
    await page.setContent(`<style>body{margin:0;display:flex;font:16px sans-serif}figure{margin:0;width:${width}px}figcaption{height:30px;background:#fff;color:#000}img{display:block;width:${width}px;height:1100px}</style><figure><figcaption>BEFORE</figcaption><img src="data:image/png;base64,${images[0]}"></figure><figure><figcaption>AFTER (proposed A)</figcaption><img src="data:image/png;base64,${images[1]}"></figure>`)
    await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())))
    await page.screenshot({ path: join(output, name) })
    await page.close()
  }
} finally { await browser.close() }
