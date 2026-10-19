import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'

// Run against the demo/history.tsx fixture copied into a packed Vite consumer.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true })
const results = []
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(process.env.FIXTURE_URL || 'http://127.0.0.1:18752')
    await page.getByTestId('count').filter({ hasText: 'Items: 20' }).waitFor()
    const viewport = page.getByRole('region', { name: 'Conversation' }).first()
    const jump = page.locator('[data-slot="chat-stream-jump"]').first()
    assert.equal(await jump.isVisible(), false, 'initial latest window is pinned')
    assert.equal(await page.getByTestId('short-stream').locator('[data-slot="chat-stream-jump"]').isVisible(), false)
    const countRequests = async () => Number((await page.getByTestId('requests').innerText()).split(': ')[1])
    const anchorTop = () => page.getByTestId('m70').evaluate((el) => el.getBoundingClientRect().top)
    const box = await viewport.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -10000)
    await page.waitForFunction(() => document.querySelector('[role="region"]').scrollTop === 0)
    await page.waitForTimeout(250)
    assert.equal(await jump.isVisible(), true, 'scrolling up reveals Jump')
    const before = await anchorTop()
    const requestsBefore = await countRequests()
    await page.getByRole('button', { name: 'Load twice', exact: true }).click()
    await page.getByText('Loading older messages…', { exact: true }).waitFor()
    await page.getByTestId('count').filter({ hasText: 'Items: 40' }).waitFor()
    await page.waitForTimeout(250)
    const after = await anchorTop()
    const delta = after - before
    assert.equal(await countRequests(), requestsBefore + 1, 'rapid requests are coalesced')
    assert.equal(await page.locator('[data-slot="chat-stream-item"]').count(), 42, '40 history rows plus two short-stream rows')
    if (process.env.NEGATIVE_CONTROL) {
      assert.ok(Math.abs(delta) > 100, 'unfixed history control blocks prepend detection')
      results.push({ width, before, after, delta, negativeControl: true })
      await page.close()
      continue
    }
    assert.ok(Math.abs(delta) <= 1, `prepend moved the anchor by ${delta}px`)
    assert.equal(await jump.isVisible(), true, 'prepend leaves the reader scrolled up')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 180)
    await page.waitForTimeout(250)
    const visibleAnchor = await viewport.evaluate((el) => {
      const top = el.getBoundingClientRect().top
      const row = [...el.querySelectorAll('[data-slot="chat-stream-item"]')].find((row) => row.getBoundingClientRect().bottom > top)
      return { id: row.dataset.messageId, top: row.getBoundingClientRect().top }
    })
    await page.getByRole('button', { name: 'Load twice', exact: true }).click()
    await page.getByTestId('count').filter({ hasText: 'Items: 60' }).waitFor()
    await page.waitForTimeout(250)
    const middleDelta = await page.getByTestId(visibleAnchor.id).evaluate((el) => el.getBoundingClientRect().top) - visibleAnchor.top
    assert.ok(Math.abs(middleDelta) <= 1, 'prepend preserves a partially visible middle row')

    const beforeAppend = await anchorTop()
    await page.getByRole('button', { name: 'Append live', exact: true }).click()
    await page.getByTestId('count').filter({ hasText: 'Items: 61' }).waitFor()
    await page.waitForTimeout(250)
    assert.ok(Math.abs(await anchorTop() - beforeAppend) <= 1, 'live append does not steal the view')
    await jump.click()
    await page.waitForFunction(() => document.querySelector('[data-slot="chat-stream-jump"]').dataset.active === 'false')
    assert.equal(await jump.isVisible(), false, 'Jump returns to latest and hides')
    await page.getByRole('button', { name: 'Append live', exact: true }).click()
    await page.getByTestId('count').filter({ hasText: 'Items: 62' }).waitFor()
    await page.waitForTimeout(250)
    assert.equal(await jump.isVisible(), false, 'live append follows after Jump')

    await page.getByRole('button', { name: 'Fail next page', exact: true }).click()
    await page.getByRole('button', { name: 'Load twice', exact: true }).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await page.getByTestId('count').innerText(), 'Items: 62', 'failure retains history')
    await page.getByRole('button', { name: 'Retry loading history', exact: true }).click()
    await page.getByTestId('count').filter({ hasText: 'Items: 82' }).waitFor()
    assert.equal(await page.getByRole('alert').count(), 0)
    while (await page.getByTestId('count').innerText() !== 'Items: 92') {
      await page.getByRole('button', { name: 'Load twice', exact: true }).click()
      await page.getByText('Loading older messages…', { exact: true }).waitFor()
      await page.getByText('Loading older messages…', { exact: true }).waitFor({ state: 'hidden' })
    }
    assert.equal(await page.locator('[data-slot="chat-stream-history"]').count(), 0, 'end cursor removes the control')
    const exhaustedRequests = await countRequests()
    await page.getByRole('button', { name: 'Load twice', exact: true }).click()
    assert.equal(await countRequests(), exhaustedRequests, 'end cursor issues no request')

    await page.getByRole('button', { name: 'Switch session', exact: true }).click()
    await page.getByTestId('count').filter({ hasText: 'Items: 20' }).waitFor()
    await page.getByRole('button', { name: 'Load twice', exact: true }).click()
    await page.getByText('Loading older messages…', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Switch session', exact: true }).click()
    await page.getByTestId('count').filter({ hasText: 'Items: 20' }).waitFor()
    await page.waitForTimeout(450)
    assert.equal(await page.getByTestId('count').innerText(), 'Items: 20', 'old session response never lands')
    assert.equal(await jump.isVisible(), false, 'new session starts at latest')
    assert.deepEqual(errors, [])
    results.push({ width, before, after, delta, middleDelta, latestWindow: 20, loadedAfterOverlap: 40, exhaustedItemsWithLive: 92, requestsCoalesced: true, retry: true, sessionCancellation: true, jump: 'hidden at latest, visible above, hides after jump, follows subsequent append', pageErrors: errors })
    if (width === 390 && process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH })
    await page.close()
  }
  const receipt = { fixture: 'packages/kit-chat/demo/history.tsx', nativeScrollAnchoring: 'disabled', results }
  if (process.argv[2]) await writeFile(process.argv[2], `${JSON.stringify(receipt, null, 2)}\n`)
  console.log(JSON.stringify(receipt, null, 2))
} finally { await browser.close() }
