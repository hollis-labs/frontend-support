import { afterEach, describe, expect, it, vi } from 'vitest'
import { focusable, focusFirst } from '../lib/citation-focus'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })
function rect(element: HTMLElement, visible = true) {
  vi.spyOn(element, 'getClientRects').mockReturnValue((visible ? [{ width: 10, height: 10 }] : []) as unknown as DOMRectList)
}
function button(label: string) {
  const element = document.createElement('button')
  element.textContent = label
  rect(element)
  return element
}
describe('internal citation focus handoffs', () => {
  it('excludes CSS-hidden, zero-rect, hidden/inert, disabled and negative-tabindex controls', () => {
    const visible = button('Following host action')
    const display = button('Display hidden'); display.style.display = 'none'
    const visibility = button('Visibility hidden'); visibility.style.visibility = 'hidden'
    const zero = button('No rect'); rect(zero, false)
    const area = button('Zero area'); vi.spyOn(area, 'getClientRects').mockReturnValue([{ width: 0, height: 0 }] as unknown as DOMRectList)
    const hidden = document.createElement('div'); hidden.hidden = true; hidden.append(button('Hidden ancestor'))
    const inert = document.createElement('div'); inert.setAttribute('inert', ''); inert.append(button('Inert ancestor'))
    const disabled = button('Disabled'); disabled.disabled = true; disabled.tabIndex = 0
    const negative = button('Negative tab index'); negative.tabIndex = -1
    document.body.append(display, visibility, zero, area, hidden, inert, disabled, negative, visible)
    expect(focusable(document.body)).toEqual([visible])
    expect(focusFirst(focusable(document.body))).toBe(true)
    expect(document.activeElement).toBe(visible)
  })
  it('uses checkVisibility when available and rect/style fallback when it is absent', () => {
    const modern = button('Modern hidden'); const check = vi.fn().mockReturnValue(false)
    Object.defineProperty(modern, 'checkVisibility', { value: check })
    const fallback = button('Fallback visible')
    Object.defineProperty(fallback, 'checkVisibility', { value: undefined })
    document.body.append(modern, fallback)
    expect(focusable(document.body)).toEqual([fallback])
    expect(check).toHaveBeenCalledWith({ visibilityProperty: true, checkVisibilityCSS: true })
  })
  it('falls through when focus fails and reports success only after the document active element changes', () => {
    const declined = button('Focus declined'), following = button('Following host action')
    const focus = vi.spyOn(declined, 'focus').mockImplementation(() => {})
    document.body.append(declined, following)
    expect(focusFirst(focusable(document.body))).toBe(true)
    expect(focus).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(following)
    expect(focusFirst([declined])).toBe(false)
    expect(focusFirst([])).toBe(false)
  })
})
