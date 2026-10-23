import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

/**
 * Card x state x {1280, 390} x {light, dark}: screenshot every fixture and assert on
 * COMPUTED style, not on source class names. Screenshots go to e2e/.out (gitignored);
 * the assertion results are written to e2e/.out/results.json for docs/verification.md.
 *
 * Passing this proves the computed numbers and the absence of overflow. It does NOT
 * prove the cards look right — that is a person's review.
 */

const OUT = path.resolve(import.meta.dirname, '.out')
const VIEWPORTS = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const
const MODES = ['light', 'dark'] as const

interface Row { id: string; vp: string; mode: string; checks: Record<string, string | number | boolean>; failures: string[] }

async function inspect(page: Page, vp: number) {
  return page.evaluate((width) => {
    const probe = (cls: string, prop: string) => {
      const el = document.createElement('span')
      el.className = cls
      el.textContent = 'x'
      document.body.appendChild(el)
      const v = getComputedStyle(el).getPropertyValue(prop)
      el.remove()
      return v
    }
    const root = document.querySelector('main') as HTMLElement
    const env = root.querySelector('[data-slot="envelope"]') as HTMLElement | null
    const title = root.querySelector('[data-slot="envelope-body"] h3') as HTMLElement | null
    const control = root.querySelector('.text-control') as HTMLElement | null
    const interactive = [...root.querySelectorAll<HTMLElement>('button, input:not([type="radio"]):not([type="checkbox"]), select, textarea, label.min-h-11')]
      .filter((el) => el.offsetParent !== null)
    const short = interactive.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => `${el.tagName.toLowerCase()}:${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}:${Math.round(el.getBoundingClientRect().height)}`)
    const docEl = document.documentElement
    return {
      docOverflowX: docEl.scrollWidth > width,
      bodyOverflowX: document.body.scrollWidth > width,
      envelopeRadius: env ? getComputedStyle(env).borderTopLeftRadius : null,
      panelRadius: probe('rounded-panel', 'border-top-left-radius'),
      envelopeBg: env ? getComputedStyle(env).backgroundColor : null,
      elevatedBg: (() => { const el = document.createElement('div'); el.className = 'bg-bg-elevated'; document.body.appendChild(el); const v = getComputedStyle(el).backgroundColor; el.remove(); return v })(),
      titleColor: title ? getComputedStyle(title).color : null,
      fgColor: probe('text-fg', 'color'),
      titleSize: title ? getComputedStyle(title).fontSize : null,
      smSize: probe('text-sm', 'font-size'),
      controlSize: control ? getComputedStyle(control).fontSize : null,
      controlToken: probe('text-control', 'font-size'),
      shortTargets: short,
      hasEnvelope: !!env,
    }
  }, vp)
}

test('matrix', async ({ browser }) => {
  const rows: Row[] = []
  const probePage = await browser.newPage()
  await probePage.goto('/')
  const ids: string[] = await probePage.evaluate(() => (window as unknown as { __CASE_IDS__: string[] }).__CASE_IDS__)
  await probePage.close()
  expect(ids.length).toBeGreaterThan(50)

  for (const vp of VIEWPORTS) {
    for (const mode of MODES) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 600, colorScheme: mode })
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      const dir = path.join(OUT, 'screens', `${mode}-${vp.name}`)
      fs.mkdirSync(dir, { recursive: true })
      for (const id of ids) {
        await page.goto(`/?case=${encodeURIComponent(id)}&mode=${mode}`)
        await page.locator('main[data-case]').waitFor()
        const m = await inspect(page, vp.width)
        const failures: string[] = []
        if (m.docOverflowX || m.bodyOverflowX) failures.push('document scrolls horizontally')
        if (m.hasEnvelope) {
          if (m.envelopeRadius !== m.panelRadius) failures.push(`envelope radius ${m.envelopeRadius} != rounded-panel ${m.panelRadius}`)
          if (m.envelopeBg !== m.elevatedBg) failures.push(`envelope bg ${m.envelopeBg} != bg-elevated ${m.elevatedBg}`)
          if (m.titleColor && m.titleColor !== m.fgColor) failures.push(`title colour ${m.titleColor} != text-fg ${m.fgColor}`)
          if (m.titleSize && m.titleSize !== m.smSize) failures.push(`title size ${m.titleSize} != text-sm ${m.smSize}`)
        }
        if (m.controlSize && m.controlSize !== '13px') failures.push(`body control text is ${m.controlSize}, expected 13px`)
        if (m.controlToken !== '13px') failures.push(`text-control token resolves to ${m.controlToken}`)
        if (vp.width < 600 && m.shortTargets.length) failures.push(`touch targets under 44px: ${m.shortTargets.join(', ')}`)
        await page.screenshot({ path: path.join(dir, `${id.replace(/[:/]/g, '__')}.png`), fullPage: true })
        rows.push({ id, vp: vp.name, mode, checks: { controlSize: m.controlSize ?? 'n/a', titleColor: m.titleColor ?? 'n/a' }, failures })
      }
      expect(errors, 'page errors').toEqual([])
      await context.close()
    }
  }
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ cases: ids.length, rows }, null, 1))
  const bad = rows.filter((r) => r.failures.length)
  expect(bad.map((r) => `${r.id} @${r.vp}/${r.mode}: ${r.failures.join('; ')}`)).toEqual([])
})
