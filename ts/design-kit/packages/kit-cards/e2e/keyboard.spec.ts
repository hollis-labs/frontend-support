import { expect, test, type Page } from '@playwright/test'

/** Keyboard and assistive-tech pass: focus order, no default focus, announce, focus return. */

const open = async (page: Page, id: string) => {
  await page.goto(`/?case=${encodeURIComponent(id)}`)
  await page.locator('main[data-case]').waitFor()
}
const focused = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null
  return a ? `${a.tagName.toLowerCase()}|${(a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40)}` : 'none'
})

test('nothing is focused on load, and Tab reaches actions in reading order', async ({ page }) => {
  await open(page, 'approval:pending')
  expect(await focused(page)).toMatch(/^body/)
  const seen: string[] = []
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab')
    seen.push(await focused(page))
  }
  expect(seen).toEqual(['button|Approve', 'button|Deny', 'button|Dismiss'])
})

test('medium risk: Enter on Approve asks for confirmation instead of answering', async ({ page }) => {
  await open(page, 'approval:pending')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Confirm: Approve?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirm Approve' })).toBeVisible()
  // Back returns to the action row; nothing was answered.
  await page.getByRole('button', { name: 'Back' }).press('Enter')
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible()
})

test('answering announces politely and returns focus to the receipt', async ({ page }) => {
  await open(page, 'approval-live:interactive')
  await page.getByRole('button', { name: 'Approve' }).focus()
  await page.keyboard.press('Enter')
  const footer = page.locator('[data-slot="resolved-footer"]')
  await expect(footer).toBeVisible()
  await expect(footer).toHaveAttribute('role', 'status') // implicit aria-live=polite
  await expect(footer).toBeFocused()
  // No actionable control remains.
  expect(await page.locator('button:not([disabled])').count()).toBe(0)
})

test('a card that mounts terminal does not steal focus', async ({ page }) => {
  await open(page, 'approval:resolved')
  expect(await focused(page)).toMatch(/^body/)
})

test('high risk: typed phrase gates approval from the keyboard', async ({ page }) => {
  await open(page, 'approval-high:pending')
  await expect(page.getByRole('button', { name: 'Delete collection' })).toBeDisabled()
  await page.getByRole('textbox').focus()
  await page.keyboard.type('delete sample-archive')
  await expect(page.getByRole('button', { name: 'Delete collection' })).toBeEnabled()
  // The destructive action is never the default-focused element.
  expect(await focused(page)).toMatch(/^input/)
})

test('choice: radios are one tab stop and arrow keys move the selection', async ({ page }) => {
  await open(page, 'choice:pending')
  await page.getByRole('radio', { name: /Canary/ }).focus() // the fixture's recorded choice
  await page.keyboard.press('ArrowDown')
  const checked = await page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>('input[type=radio]')].findIndex((r) => r.checked))
  expect(checked).toBe(2)
})

test('form: a failed submit moves focus to the error summary, links focus the control', async ({ page }) => {
  await open(page, 'form:pending')
  await page.getByLabel(/Display name/).fill('')
  await page.getByLabel(/Region/).selectOption('')
  await page.getByRole('button', { name: 'Submit' }).press('Enter')
  const summary = page.locator('[data-slot="form-error-summary"]')
  await expect(summary).toBeFocused()
  await expect(summary).toHaveAttribute('role', 'alert')
  await summary.getByRole('link').first().press('Enter')
  expect(await focused(page)).toMatch(/^(input|select|textarea)/)
})

test('form: the secret field is masked', async ({ page }) => {
  await open(page, 'form:pending')
  await expect(page.getByLabel(/API key/)).toHaveAttribute('type', 'password')
})

test('stale card alerts and keeps the reload action reachable by keyboard', async ({ page }) => {
  await open(page, 'approval:stale')
  await expect(page.getByRole('alert')).toContainText('changed')
  await page.keyboard.press('Tab')
  expect(await focused(page)).toBe('button|Reload, keep my answers')
})

test('reduced motion is respected: no running animation on a card', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await open(page, 'approval:submitting')
  const animated = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)
  expect(animated).toBe(0)
  await ctx.close()
})
