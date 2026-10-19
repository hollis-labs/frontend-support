// Manual review capture; not a CI/count gate. Run against the built demo.
// PLAYWRIGHT_MODULE points to an installed Playwright ESM module.
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const out = fileURLToPath(new URL('./evidence/', import.meta.url))
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] })
const records = []
for (const width of [1280, 390]) {
  for (const app of ['nanite', 'tachyon', 'tether']) {
    for (const section of ['dashboard', 'settings', 'status', 'diagnostics']) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${process.env.DEMO_URL ?? 'http://127.0.0.1:5205'}/?app=${app}&page=${section}`)
      await page.waitForTimeout(500)
      const styles = await page.evaluate(() => {
        const cs = el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return { tag: el.tagName, label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 90), fontSize: s.fontSize, color: s.color, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius, width: r.width, height: r.height, overflowY: s.overflowY } }
        return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, tokenControl: getComputedStyle(document.documentElement).getPropertyValue('--radius-control').trim(), tokenPanel: getComputedStyle(document.documentElement).getPropertyValue('--radius-panel').trim(), root: cs(document.querySelector('#root')), nav: [...document.querySelectorAll('nav')].map(cs), controls: [...document.querySelectorAll('input,button,select')].map(cs), panels: [...document.querySelectorAll('.rounded-panel')].map(cs), scrollOwners: [...document.querySelectorAll('div')].filter(el => ['auto','scroll'].includes(getComputedStyle(el).overflowY)).map(el => ({...cs(el), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight})), messages: [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent) }
      })
      const image = `${app}-${section}-${width}.png`
      await page.screenshot({ path: `${out}${image}` })
      const scroll = await page.evaluate(() => {
        const owner = [...document.querySelectorAll('div')].find(el => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 2 && el.contains(document.querySelector('main')?.firstElementChild?.lastElementChild ?? null))
          ?? [...document.querySelectorAll('div')].find(el => getComputedStyle(el).overflowY === 'auto' && el.scrollHeight > el.clientHeight + 2 && el.closest('main'))
        if (!owner) return undefined
        owner.scrollTop = owner.scrollHeight
        return { scrollTop: owner.scrollTop, clientHeight: owner.clientHeight, scrollHeight: owner.scrollHeight }
      })
      if (scroll) await page.screenshot({ path: `${out}${app}-${section}-${width}-bottom.png` })
      records.push({ app, section, width, image, styles, errors, scroll })
      await page.close()
    }
  }
  for (const state of ['setup', 'refresh', 'group', 'first']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    await page.goto(`${process.env.DEMO_URL ?? 'http://127.0.0.1:5205'}/?app=nanite&page=settings&${state === 'setup' ? 'mode=setup' : `failure=${state}`}`)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}nanite-${state}-${width}.png` })
    records.push({ app: 'nanite', section: state, width, image: `nanite-${state}-${width}.png`, text: await page.locator('main').innerText(), inputs: await page.locator('input').evaluateAll(inputs => inputs.map(el => ({ label: el.id, disabled: el.matches(':disabled') }))) })
    await page.close()
  }
}
await browser.close()
await writeFile(`${out}computed-styles.json`, `${JSON.stringify(records, null, 2)}\n`)
console.log(`Captured ${records.length} local fixture states. Inspect computed-styles.json and matched screenshots.`)
