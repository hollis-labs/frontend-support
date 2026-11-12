import { afterEach, describe, expect, it, vi } from 'vitest'
import { EscapeStack } from '../lib/escape-stack'

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks() })

describe('registered lower overlay ownership', () => {
  it('closes newer dialog first, then original live menu; unrelated visible and retired roots veto', () => {
    const stack = new EscapeStack()
    const menu = document.createElement('div'), dialog = document.createElement('div')
    menu.setAttribute('role', 'menu'); dialog.setAttribute('role', 'dialog')
    document.body.append(menu, dialog)
    for (const root of [menu, dialog]) vi.spyOn(root, 'getClientRects').mockReturnValue([{ width: 10 }] as unknown as DOMRectList)
    let live = true
    const menuClose = vi.fn(() => 'closed' as const), dialogClose = vi.fn(() => 'closed' as const)
    stack.register({ id: 'menu', active: true, accessible: true, live: () => live, rootElement: menu, activationSeq: 1, onEscape: menuClose })
    stack.register({ id: 'dialog', active: true, accessible: true, live: () => true, rootElement: dialog, activationSeq: 2, onEscape: dialogClose })
    const escape = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    const unrelated = document.createElement('div'); unrelated.setAttribute('role', 'listbox'); document.body.append(unrelated)
    vi.spyOn(unrelated, 'getClientRects').mockReturnValue([{ width: 10 }] as unknown as DOMRectList)
    expect(stack.handleKeyDown(escape())).toBe(false)
    expect(dialogClose).not.toHaveBeenCalled()
    unrelated.remove()
    live = false
    expect(stack.handleKeyDown(escape())).toBe(false)
    expect(dialogClose).not.toHaveBeenCalled()
    live = true
    expect(stack.handleKeyDown(escape())).toBe(true)
    expect(dialogClose).toHaveBeenCalledOnce(); expect(menuClose).not.toHaveBeenCalled()
    stack.unregister('dialog'); dialog.remove()
    expect(stack.handleKeyDown(escape())).toBe(true)
    expect(menuClose).toHaveBeenCalledOnce()
    menu.remove()
    expect(stack.getActiveLayers()).toEqual([])
    stack.reset()
  })
})
