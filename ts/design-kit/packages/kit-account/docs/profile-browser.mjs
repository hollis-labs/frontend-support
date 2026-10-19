import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
const results = []
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(process.env.FIXTURE_URL || 'http://127.0.0.1:18753')
    const profile = page.getByRole('form', { name: 'Profile' })
    const name = page.getByLabel('Display name', { exact: true })
    const theme = page.getByLabel('Preferred theme', { exact: true })
    const fontSize = await name.evaluate((el) => getComputedStyle(el).fontSize)
    assert.equal(fontSize, '13px', 'named text-control emits in a packed consumer, including desktop Input override')
    await name.fill('Edited profile')
    assert.equal(await page.getByLabel('Current identity').innerText(), 'Local identity\nFixture app\nLOCAL')
    await page.getByRole('button', { name: 'Fail next saves', exact: true }).click()
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    assert.equal(await name.isDisabled(), true)
    await profile.getByRole('alert').waitFor()
    assert.equal(await name.inputValue(), 'Edited profile', 'failed save preserves draft')
    await page.getByRole('button', { name: 'Use successful saves', exact: true }).click()
    await page.getByRole('button', { name: 'Save profile', exact: true }).click()
    await profile.getByRole('status').waitFor()
    assert.equal(await profile.getByRole('alert').count(), 0)
    await theme.fill('High contrast')
    await page.getByRole('button', { name: 'Save preferences', exact: true }).click()
    assert.equal(await theme.isDisabled(), true)
    await page.getByRole('button', { name: 'Save preferences', exact: true }).waitFor()
    assert.equal(await theme.inputValue(), 'High contrast')
    await name.fill('   ')
    assert.equal(await page.getByRole('button', { name: 'Save profile', exact: true }).isDisabled(), true)
    await name.fill('Edited profile')
    const bounds = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert.ok(bounds.scroll <= bounds.viewport, 'no horizontal viewport overflow')
    assert.deepEqual(errors, [])
    if (width === 390 && process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH })
    results.push({ width, fontSize, profileDraftRetainedOnFailure: true, busyFieldsDisabled: true, hostSuccess: true, hostPreferences: true, identityUnchangedByProfileEdit: true, blankSaveBlocked: true, bounds, pageErrors: errors })
    await page.close()
  }
  const receipt = { fixture: 'packages/kit-account/demo/profile.tsx', package: 'packed private kit-account 0.0.0 + base 0.1.1', results }
  if (process.argv[2]) await writeFile(process.argv[2], `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} finally { await browser.close() }
