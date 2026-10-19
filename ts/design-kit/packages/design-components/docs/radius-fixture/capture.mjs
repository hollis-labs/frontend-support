// Review evidence only; deliberately not a CI count/source-agreement gate.
import { mkdirSync, writeFileSync } from 'node:fs'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = process.env.RADIUS_OUTPUT
if (!output) throw new Error('Set RADIUS_OUTPUT to an evidence directory')
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME })
const results = []
try {
  for (const width of [1440, 390]) for (const [theme, mode] of [['sysop-p4-white', 'dark'], ['dir-b', 'light']]) {
    for (const surface of (process.env.RADIUS_SURFACES?.split(',') || ['matrix', 'matrixDashboard', 'gallery', 'accountAccess', 'chatHistory', 'settings', 'settingsWizard', 'settingsConservative', 'observe', 'observeError', 'observeTachyon', 'observeTachyonError', 'chatCards', 'chatCardsLocked', 'chatCardsError', 'chatComposer', 'chatComposerBusy', 'chatComposerDisabled', 'chatComposerSuggestions', 'chatStream', 'chatStreamStalled', 'chatStreamError', 'chatMarkdown'])) {
      const page = await browser.newPage({ viewport: { width, height: 1100 }, reducedMotion: 'reduce' })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${process.env.RADIUS_URL || 'http://127.0.0.1:5204'}/?surface=${surface}&theme=${theme}&mode=${mode}`)
      await page.waitForSelector('#root > *')
      await page.waitForTimeout(800)
      if (surface.startsWith('observeTachyon')) await page.getByLabel('App', { exact: true }).selectOption('tachyon')
      if (surface.endsWith('Error') && surface.startsWith('observe')) await page.getByLabel('Observation', { exact: true }).selectOption('refresh-error')
      if (surface === 'settingsWizard') await page.getByRole('button', { name: 'Resume Nanite secret step' }).click()
      if (surface === 'settingsConservative') await page.getByLabel('Show conservative restart without targets').check()
      if (surface === 'chatCardsError') {
        for (const name of ['Submit', 'Approve', 'Choose']) for (const button of await page.getByRole('button', { name, exact: true }).all()) await button.click()
      }
      if (surface === 'chatComposerSuggestions') { await page.locator('textarea').fill('/he'); await page.locator('textarea').press('End') }
      if (surface === 'chatHistory') await page.getByRole('button', { name: 'Load older messages' }).scrollIntoViewIfNeeded()
      await page.addStyleTag({ content: '* { transition: none !important; animation: none !important; }' })
      const rows = await page.evaluate(() => [...document.querySelectorAll('button,input,textarea,[class*="rounded"],[data-slot=card],[data-slot=envelope]')].map((el, index) => {
        const s = getComputedStyle(el)
        return { index, tag: el.tagName, context: el.closest('[data-review]')?.getAttribute('data-review'), label: el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ').slice(0, 90) || el.getAttribute('placeholder') || el.getAttribute('data-slot'), classes: el.className, radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius], visible: el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 }
      }))
      // Fixed crop shared by BEFORE and AFTER; gallery buttons are its first row.
      await page.screenshot({ path: `${output}/${surface}-${width}-${theme}-${mode}.png`, fullPage: false })
      results.push({ surface, width, theme, mode, rows, errors })
      writeFileSync(`${output}/computed.json`, JSON.stringify(results, null, 2) + '\n')
      await page.close()
    }
  }
} finally { await browser.close() }
writeFileSync(`${output}/computed.json`, JSON.stringify(results, null, 2) + '\n')
if (results.some(result => result.errors.length)) throw new Error('Browser errors: inspect computed.json')
console.log(`Captured ${results.length} states with zero browser errors`)
