import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { DockResizeHandle, DockTabStrip, ManifestShell, buildShellModel, type DockTab, type FrontendManifest, type ManifestShellProps } from '../src'
import { admin, manifest, pages, views } from './fixtures'

const tab = (key: string, label: string) => ({ module: 'console', kind: 'dock.tab', key, label, view: 'inspector', region: 'shell.right' })
const bottomManifest: FrontendManifest = {
  ...manifest,
  items: [...manifest.items, tab('logs', 'Logs'),
    { module: 'console', kind: 'slot', key: 'logs-toggle', label: 'Logs', region: 'shell.header', opens: 'logs' }],
}
const attrs = { 'shell.right': { anchor: 'bottom' as const, heightPx: { min: 100, default: 200, max: 400 } } }
const mount = (over: Partial<ManifestShellProps> = {}) =>
  render(<ManifestShell manifest={bottomManifest} admin={admin} apiBase="/api" path="/" onNavigate={() => {}} views={views} pages={pages} isNarrow={false} dockAttributes={attrs} {...over} />)
const dlg = (name: string) => screen.getByRole('dialog', { name })
const handle = () => screen.getByRole('separator')
const pointer = (el: Element, type: string, clientY: number) => fireEvent(el, Object.assign(new MouseEvent(type, { bubbles: true, clientY }), { pointerId: 1 }))

describe('bottom anchor attributes', () => {
  it('resolves defaults, and a bottom dock is exclusive unless told otherwise', () => {
    const a = buildShellModel(bottomManifest, { admin, dockAttributes: { 'shell.right': { anchor: 'bottom' } } }).docks[0]!.attributes
    expect(a.anchor).toBe('bottom'); expect(a.exclusive).toBe(true); expect(a.heightPx).toEqual({ min: 120, default: 240, max: 640 })
  })
  it('refuses heightPx on a side dock and an inverted range', () => {
    for (const bad of [{ heightPx: { min: 100, default: 200 } }, { anchor: 'bottom' as const, heightPx: { min: 300, default: 200 } }]) {
      const m = buildShellModel(bottomManifest, { admin, dockAttributes: { 'shell.right': bad } })
      expect(m.diagnostics.map(d => d.code)).toContain('invalid-dock-attributes')
    }
  })
})

describe('bottom dock in the shell', () => {
  it('opens at its default height with a resize separator', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    expect(dlg('Inspector').getAttribute('data-presentation')).toBe('bottom')
    expect(dlg('Inspector').style.height).toBe('200px')
    expect(handle().getAttribute('aria-valuenow')).toBe('200')
  })
  it('pointer drag up grows it, is remembered, and release below the minimum closes with focus back on the trigger', async () => {
    const mem = new Map<string, string>()
    const storage = { read: (k: string) => mem.get(k) ?? null, write: (k: string, v: string) => { mem.set(k, v) }, remove: (k: string) => { mem.delete(k) } }
    mount({ dockStorage: storage })
    const trigger = screen.getByRole('button', { name: 'Inspector' })
    trigger.focus(); fireEvent.click(trigger)
    pointer(handle(), 'pointerdown', 500); pointer(handle(), 'pointermove', 450); pointer(handle(), 'pointerup', 450)
    expect(dlg('Inspector').style.height).toBe('250px')
    expect([...mem.values()]).toEqual(['250'])
    pointer(handle(), 'pointerdown', 500); pointer(handle(), 'pointermove', 100); pointer(handle(), 'pointerup', 100)
    expect(dlg('Inspector').style.height).toBe('400px')
    pointer(handle(), 'pointerdown', 500); pointer(handle(), 'pointermove', 900); pointer(handle(), 'pointerup', 900)
    expect(screen.queryByRole('dialog', { name: 'Inspector' })).toBeNull()
    await act(async () => { await Promise.resolve() })
    expect(document.activeElement).toBe(trigger)
  })
  it('keyboard: arrows resize, Home/End jump, ArrowDown below the minimum closes', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    fireEvent.keyDown(handle(), { key: 'ArrowUp' })
    expect(dlg('Inspector').style.height).toBe('224px')
    fireEvent.keyDown(handle(), { key: 'Home' })
    expect(dlg('Inspector').style.height).toBe('100px')
    fireEvent.keyDown(handle(), { key: 'End' })
    expect(dlg('Inspector').style.height).toBe('400px')
    fireEvent.keyDown(handle(), { key: 'Home' })
    fireEvent.keyDown(handle(), { key: 'ArrowDown' })
    expect(screen.queryByRole('dialog', { name: 'Inspector' })).toBeNull()
  })
  it('double-click closes; Esc closes with focus back on the trigger', async () => {
    mount()
    const trigger = screen.getByRole('button', { name: 'Inspector' })
    trigger.focus(); fireEvent.click(trigger)
    fireEvent.doubleClick(handle())
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(trigger)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await act(async () => { await Promise.resolve() })
    expect(document.activeElement).toBe(trigger)
  })
  it('the region tab strip switches tabs', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    const strip = within(dlg('Inspector')).getByRole('tablist')
    fireEvent.click(within(strip).getByRole('tab', { name: 'Logs' }))
    expect(screen.queryByRole('dialog', { name: 'Inspector' })).toBeNull()
    expect(within(dlg('Logs')).getByRole('tab', { name: 'Logs' }).getAttribute('aria-selected')).toBe('true')
  })
  it('390px: renders the bottom sheet, with no resize handle', () => {
    mount({ isNarrow: true })
    fireEvent.click(screen.getByRole('button', { name: 'Inspector' }))
    expect(dlg('Inspector').getAttribute('data-presentation')).toBe('bottom-sheet')
    expect(screen.queryByRole('separator')).toBeNull()
  })
})

describe('DockTabStrip', () => {
  const tabs: DockTab[] = [
    { id: 'a', label: 'Documents', active: true },
    { id: 'b', label: 'A very long tab label', active: false, runningPip: true, closeable: true, pinnable: true, pinned: false },
  ]
  it('selects, closes, pins; truncates long labels; shows the running pip', () => {
    const onSelect = vi.fn(), onClose = vi.fn(), onTogglePin = vi.fn()
    render(<DockTabStrip tabs={tabs} onSelect={onSelect} onClose={onClose} onTogglePin={onTogglePin} />)
    expect(screen.getByRole('tab', { name: /A very long t…/ }).getAttribute('title')).toBe('A very long tab label')
    expect(screen.getByRole('img', { name: 'Running' })).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: /A very long/ })); expect(onSelect).toHaveBeenCalledWith('b')
    fireEvent.click(screen.getByRole('button', { name: 'Close A very long tab label' })); expect(onClose).toHaveBeenCalledWith('b')
    fireEvent.click(screen.getByRole('button', { name: 'Pin A very long tab label' })); expect(onTogglePin).toHaveBeenCalledWith('b')
    expect(screen.getByRole('tab', { name: 'Documents' }).getAttribute('aria-selected')).toBe('true')
  })
  it('hides close and pin without their handlers; arrows move focus between tabs', () => {
    render(<DockTabStrip tabs={tabs} onSelect={() => {}} />)
    expect(screen.queryByRole('button', { name: /Close|Pin/ })).toBeNull()
    screen.getByRole('tab', { name: 'Documents' }).focus()
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /A very long/ }))
  })
})

describe('DockResizeHandle', () => {
  it('reports unclamped-below-max drag values and collapses only on release below min', () => {
    const onResize = vi.fn(), onCollapse = vi.fn()
    function Host() { const [h] = useState(200); return <DockResizeHandle height={h} min={100} max={400} onResize={onResize} onCollapse={onCollapse} onToggle={() => {}} /> }
    render(<Host />)
    const el = screen.getByRole('separator')
    pointer(el, 'pointerdown', 300); pointer(el, 'pointermove', 380)
    expect(onResize).toHaveBeenLastCalledWith(120); expect(onCollapse).not.toHaveBeenCalled()
    pointer(el, 'pointerup', 380); expect(onCollapse).not.toHaveBeenCalled()
  })
})
