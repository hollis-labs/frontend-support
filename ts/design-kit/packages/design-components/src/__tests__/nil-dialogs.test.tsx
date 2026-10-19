import { Activity, StrictMode, useLayoutEffect, useRef, useState } from 'react'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JsonModal } from '../components/json-payload'
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet'
import { OverlaySidebar } from '../components/overlay-sidebar'
import { DetailDialog } from '../components/detail-dialog'
import { FormDialog } from '../components/form-dialog'
import { ConfirmDialog } from '../components/confirm-dialog'
import { InspectionDialog } from '../components/inspection-dialog'
import { CommandDialog } from '../components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from '../components/ui/alert-dialog'
import { SearchPalette } from '../components/search-palette'
import { CycleModeToggle, SearchAddToggle } from '../components/cycle-mode-toggle'
import { DialogOpenContext, useDialogOptions, type DialogOptions } from '../hooks/use-dialog-options'
import { defaultEscapeStack } from '../lib/escape-stack'

afterEach(() => { defaultEscapeStack.reset(); sessionStorage.clear(); vi.restoreAllMocks() })

function Modal({ variant, persist }: { variant: string; persist?: string }) {
  const [open, setOpen] = useState(false)
  const origin = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const focus = { initialFocus: field, returnFocus: { trigger: () => origin.current }, showFullscreenToggle: true, fullscreenSessionKey: persist }
  const body = <input ref={field} aria-label="Draft" defaultValue="Keep me" />
  const props = { open, title: 'Modal', ...focus }
  let modal
  switch (variant) {
    case 'json': modal = <JsonModal {...props} onClose={() => setOpen(false)} raw='{"seed":4421}' initialFocus={undefined} />; break
    case 'sheet': modal = <Sheet open={open} onOpenChange={setOpen}><SheetContent {...focus}><SheetTitle>Modal</SheetTitle>{body}</SheetContent></Sheet>; break
    case 'sidebar': modal = <OverlaySidebar {...props} onOpenChange={setOpen} trigger={<button>Sidebar trigger</button>}>{body}</OverlaySidebar>; break
    case 'detail': modal = <DetailDialog {...props} onClose={() => setOpen(false)}>{body}</DetailDialog>; break
    case 'form': modal = <FormDialog {...props} onClose={() => setOpen(false)} onSubmit={() => {}}>{body}</FormDialog>; break
    case 'confirm': modal = <ConfirmDialog {...props} onOpenChange={setOpen} onConfirm={() => {}} description={body} />; break
    case 'inspection': modal = <InspectionDialog {...props} onOpenChange={setOpen}>{body}</InspectionDialog>; break
    case 'command': modal = <CommandDialog {...props} showCloseButton onOpenChange={setOpen}>{body}</CommandDialog>; break
    case 'alert': modal = <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogContent {...focus}><AlertDialogTitle>Modal</AlertDialogTitle>{body}<button onClick={() => setOpen(false)}>Close</button></AlertDialogContent></AlertDialog>; break
    default: modal = <Dialog open={open} onOpenChange={setOpen}><DialogContent {...focus}><DialogTitle>Modal</DialogTitle>{body}</DialogContent></Dialog>
  }
  return <><button ref={origin} onClick={() => setOpen(true)}>Open</button>{modal}</>
}

describe('optional dialog fullscreen and focus', () => {
  it.each(['detail', 'form', 'confirm', 'inspection', 'command', 'alert', 'dialog', 'sheet', 'sidebar'])('preserves editable DOM and resets %s on reopen', async variant => {
    render(<StrictMode><Modal variant={variant} /></StrictMode>)
    fireEvent.click(screen.getByText('Open'))
    const field = await screen.findByRole('textbox', { name: 'Draft' })
    await waitFor(() => expect(document.activeElement).toBe(field))
    fireEvent.change(field, { target: { value: 'Dirty text' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter fullscreen' }))
    expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(field)
    expect((field as HTMLInputElement).value).toBe('Dirty text')
    expect(screen.getByRole(variant === 'alert' ? 'alertdialog' : 'dialog').getAttribute('data-fullscreen')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Open')))
    fireEvent.click(screen.getByText('Open'))
    await screen.findByRole('button', { name: 'Enter fullscreen' })
  })
  it('persists only with an explicit session key; malformed storage is bounded', async () => {
    sessionStorage.setItem('dialog-test', 'garbage')
    render(<Modal variant="detail" persist="dialog-test" />)
    fireEvent.click(screen.getByText('Open'))
    fireEvent.click(await screen.findByRole('button', { name: 'Enter fullscreen' }))
    expect(sessionStorage.getItem('dialog-test')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByText('Open'))
    await screen.findByRole('button', { name: 'Exit fullscreen' })
  })
})

function Palette({ select, search, accessible = true, generation = 1 }: { select: (id: string) => void; search?: (q: string, source: unknown) => void; accessible?: boolean; generation?: number }) {
  const [open, setOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  return <SearchPalette open={open} onOpenChange={setOpen} query={query} onQueryChange={setQuery} onSearch={search} debounceMs={20}
    options={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]} onSelect={select} sourceGeneration={generation} accessible={accessible}
    filters={[{ id: 'all', label: 'All' }, { id: 'notes', label: 'Notes' }]} filterId={filter} onFilterChange={setFilter} />
}

describe('controlled search palette', () => {
  it('keeps input focus, stops at boundaries, activates and clears before closing', async () => {
    const select = vi.fn()
    render(<Palette select={select} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toContain('two')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toContain('two')
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(select).toHaveBeenCalledWith('two')
    fireEvent.change(input, { target: { value: 'new query' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect((input as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(input, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
  it('composition remains editable but vetoes navigation and Escape; filter arrows wrap', async () => {
    const select = vi.fn()
    render(<Palette select={select} />)
    const input = await screen.findByRole('combobox')
    const old = input.getAttribute('aria-activedescendant')
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: '日本語' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' }); fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.keyDown(input, { key: 'Escape' })
    expect(input.getAttribute('aria-activedescendant')).toBe(old)
    expect((input as HTMLInputElement).value).toBe('日本語')
    expect(select).not.toHaveBeenCalled()
    fireEvent.compositionEnd(input)
    const all = screen.getByRole('radio', { name: 'All' }); all.focus()
    fireEvent.keyDown(all, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Notes' }))
    expect(screen.getByRole('radio', { name: 'Notes' }).getAttribute('aria-checked')).toBe('true')
  })
  it('retires debounced work across access loss and unmount', async () => {
    const search = vi.fn(), select = vi.fn()
    const view = render(<Palette select={select} search={search} />)
    const input = await screen.findByRole('combobox')
    fireEvent.change(input, { target: { value: 'obsolete' } })
    view.rerender(<Palette select={select} search={search} accessible={false} generation={2} />)
    await new Promise(resolve => setTimeout(resolve, 35))
    expect(search).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(select).not.toHaveBeenCalled()
    view.unmount()
  })
  it('cycles caller mode order and offers a keyboard secondary seam', () => {
    const change = vi.fn(), secondary = vi.fn(), inputChange = vi.fn()
    render(<><CycleModeToggle modes={[{ id: 'todo', label: 'Todos' }, { id: 'notes', label: 'Notes' }, { id: 'all', label: 'All' }]} value="todo" onValueChange={change} onSecondaryAction={secondary} />
      <SearchAddToggle value="search" onValueChange={inputChange} /></>)
    const cycle = screen.getByRole('button', { name: /Switch view mode/ })
    fireEvent.click(cycle); expect(change).toHaveBeenCalledWith('notes')
    fireEvent.keyDown(cycle, { key: 'F10', shiftKey: true }); expect(secondary).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /Search mode/ })); expect(inputChange).toHaveBeenCalledWith('add')
  })
})

describe('admitted return cleanup boundaries', () => {
  it('rejects a connected retired opener and admits an explicit fallback after primitive cleanup', async () => {
    function Example() {
      const [open, setOpen] = useState(false)
      const [admitted, setAdmitted] = useState(true)
      const origin = useRef<HTMLButtonElement>(null), fallback = useRef<HTMLButtonElement>(null)
      return <><button ref={origin} onClick={() => setOpen(true)}>Origin</button><button ref={fallback}>Fallback</button>
        <DetailDialog open={open} onClose={() => setOpen(false)} title="Admitted" returnFocus={{ trigger: () => origin.current, isAdmitted: () => admitted, fallbackTarget: () => fallback.current, isFallbackAdmitted: () => true }}>
          <button onClick={() => setAdmitted(false)}>Retire origin</button>
        </DetailDialog></>
    }
    render(<Example />)
    fireEvent.click(screen.getByText('Origin'))
    fireEvent.click(await screen.findByText('Retire origin'))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Fallback')))
  })
  it('denied sessionStorage does not prevent toggling', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    render(<Modal variant="inspection" persist="denied" />)
    fireEvent.click(screen.getByText('Open'))
    fireEvent.click(await screen.findByRole('button', { name: 'Enter fullscreen' }))
    expect(screen.getByRole('button', { name: 'Exit fullscreen' })).toBeTruthy()
  })
})

// Exposed native finalFocus callbacks are activation-bound, including queued work.

describe('return callback retirement', () => {
  it('allows a current admitted close, refuses captured and queued replaced policies and ordinary unmount', () => {
    const target = document.createElement('button'); document.body.append(target)
    const focus = vi.spyOn(target, 'focus')
    const queue: (() => void)[] = []
    const policy = { trigger: target, isAdmitted: () => true }
    const view = renderHook(({ options }) => useDialogOptions(options), { initialProps: { options: { returnFocus: policy } as DialogOptions }, wrapper: ({ children }) => <DialogOpenContext.Provider value={false}>{children}</DialogOpenContext.Provider> })
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb => queue.push(cb))
    const current = view.result.current.finalFocus as () => false
    current(); queue.splice(0).forEach(cb => cb()); expect(focus).toHaveBeenCalledOnce()
    focus.mockClear()
    current()
    view.rerender({ options: { returnFocus: { ...policy, isAdmitted: () => false } } })
    queue.splice(0).forEach(cb => cb()); current(); queue.splice(0).forEach(cb => cb())
    expect(focus).not.toHaveBeenCalled()
    const denied = view.result.current.finalFocus as () => false
    view.rerender({ options: { returnFocus: policy } })
    denied(); queue.splice(0).forEach(cb => cb()); expect(focus).not.toHaveBeenCalled()
    const beforeUnmount = view.result.current.finalFocus as () => false
    beforeUnmount(); view.unmount(); queue.splice(0).forEach(cb => cb())
    expect(focus).not.toHaveBeenCalled()
    target.remove()
  })
  it('refuses an Activity-hidden callback after resuming the same mounted tree', () => {
    const target = document.createElement('button'); document.body.append(target)
    const focus = vi.spyOn(target, 'focus')
    let callback: (() => false) | undefined
    function Probe() {
      const options = useDialogOptions({ returnFocus: { trigger: target } })
      useLayoutEffect(() => { callback = options.finalFocus as () => false })
      return null
    }
    const view = render(<Activity mode="visible"><Probe /></Activity>)
    const beforeHide = callback!
    view.rerender(<Activity mode="hidden"><Probe /></Activity>)
    beforeHide()
    view.rerender(<Activity mode="visible"><Probe /></Activity>)
    beforeHide()
    expect(focus).not.toHaveBeenCalled()
    view.unmount(); target.remove()
  })
})

describe('secondary pointer seam', () => {
  it('respects caller click suppression rather than cycling after a consumed hold', () => {
    const change = vi.fn()
    render(<CycleModeToggle modes={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} value="a" onValueChange={change} onClickCapture={event => event.preventDefault()} />)
    fireEvent.click(screen.getByRole('button'))
    expect(change).not.toHaveBeenCalled()
  })
})

describe('palette overlay and source ownership', () => {
  it('refuses activation and native close behind an unrelated current menu, then admits after it retires', async () => {
    const select = vi.fn()
    render(<Palette select={select} />)
    const input = await screen.findByRole('combobox')
    await waitFor(() => expect(document.activeElement).toBe(input))
    fireEvent.change(input, { target: { value: 'One' } })
    const menu = document.createElement('div'); menu.setAttribute('role', 'menu'); document.body.append(menu)
    vi.spyOn(menu, 'getClientRects').mockReturnValue([{ width: 10 }] as unknown as DOMRectList)
    fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.keyDown(input, { key: 'Escape' })
    expect(select).not.toHaveBeenCalled(); expect((input as HTMLInputElement).value).toBe('One')
    expect(screen.getByRole('dialog')).toBeTruthy()
    menu.remove()
    fireEvent.keyDown(input, { key: 'Enter' }); expect(select).toHaveBeenCalledWith('one')
    fireEvent.keyDown(input, { key: 'Escape' }); expect((input as HTMLInputElement).value).toBe('')
  })
  it('debounces a current notification but retires a pending source replacement and unmount', async () => {
    const search = vi.fn(), select = vi.fn()
    const view = render(<Palette select={select} search={search} />)
    const input = await screen.findByRole('combobox')
    fireEvent.change(input, { target: { value: 'current' } })
    await waitFor(() => expect(search).toHaveBeenCalledWith('current', 1))
    search.mockClear()
    fireEvent.change(input, { target: { value: 'queued' } })
    view.rerender(<Palette select={select} search={search} generation={2} />)
    await waitFor(() => expect(search).toHaveBeenCalledWith('queued', 2))
    expect(search).not.toHaveBeenCalledWith('queued', 1)
    search.mockClear(); fireEvent.change(input, { target: { value: 'retired' } }); view.unmount()
    await new Promise(resolve => setTimeout(resolve, 35)); expect(search).not.toHaveBeenCalled()
  })
})

describe('controlled sizing and explicit focus precedence', () => {
  it('controlled fullscreen wins storage and emits a toggle without resetting caller state', () => {
    sessionStorage.setItem('controlled', 'false')
    const change = vi.fn()
    const view = renderHook(() => useDialogOptions({ fullscreen: true, fullscreenSessionKey: 'controlled', onFullscreenChange: change }), { wrapper: ({ children }) => <DialogOpenContext.Provider value={true}>{children}</DialogOpenContext.Provider> })
    expect(view.result.current.fullscreen).toBe(true)
    const root = document.createElement('div'); root.setAttribute('role', 'dialog'); document.body.append(root)
    view.result.current.popupRef(root)
    view.result.current.toggle()
    root.remove()
    expect(change).toHaveBeenCalledWith(false)
    expect(view.result.current.fullscreen).toBe(true)
  })
  it.each(['hidden', 'inert', 'disabled', 'disconnected'])('rejects current %s opener and a denied fallback', kind => {
    const target = document.createElement('button'), fallback = document.createElement('button')
    document.body.append(target, fallback)
    if (kind === 'hidden') target.hidden = true
    if (kind === 'inert') target.setAttribute('inert', '')
    if (kind === 'disabled') target.disabled = true
    if (kind === 'disconnected') target.remove()
    const focus = vi.spyOn(target, 'focus'), fallbackFocus = vi.spyOn(fallback, 'focus')
    const view = renderHook(() => useDialogOptions({ returnFocus: { trigger: target, fallbackTarget: fallback, isFallbackAdmitted: () => false } }))
    const queued: (() => void)[] = []
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb => queued.push(cb))
    ;(view.result.current.finalFocus as () => false)()
    queued.forEach(cb => cb())
    expect(focus).not.toHaveBeenCalled(); expect(fallbackFocus).not.toHaveBeenCalled()
    view.unmount(); target.remove(); fallback.remove()
  })
})

describe('native finalFocus compatibility and competing return owner', () => {
  it('preserves omitted returnFocus exactly and gives explicit returnFocus precedence', () => {
    const native = vi.fn(() => false as const)
    const target = document.createElement('button'); document.body.append(target)
    const focus = vi.spyOn(target, 'focus')
    const view = renderHook(({ options }) => useDialogOptions(options), { initialProps: { options: { finalFocus: native } as DialogOptions } })
    expect(view.result.current.finalFocus).toBe(native)
    view.rerender({ options: { finalFocus: native, returnFocus: { trigger: target } } })
    const queued: (() => void)[] = []
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb => queued.push(cb))
    ;(view.result.current.finalFocus as () => false)()
    queued.splice(0).forEach(cb => cb())
    expect(native).not.toHaveBeenCalled(); expect(focus).toHaveBeenCalledOnce()
    view.unmount(); target.remove()
  })
  it('refuses a queued return while an unrelated current layer owns focus', () => {
    const target = document.createElement('button'), overlay = document.createElement('div')
    overlay.setAttribute('role', 'dialog'); document.body.append(target, overlay)
    vi.spyOn(overlay, 'getClientRects').mockReturnValue([{ width: 10 }] as unknown as DOMRectList)
    const focus = vi.spyOn(target, 'focus'), queued: (() => void)[] = []
    const view = renderHook(() => useDialogOptions({ returnFocus: { trigger: target } }))
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb => queued.push(cb))
    ;(view.result.current.finalFocus as () => false)()
    queued.splice(0).forEach(cb => cb())
    expect(focus).not.toHaveBeenCalled()
    overlay.remove()
    ;(view.result.current.finalFocus as () => false)()
    queued.splice(0).forEach(cb => cb())
    expect(focus).toHaveBeenCalledOnce()
    view.unmount(); target.remove()
  })
})

describe('review foreground ownership probes', () => {
  it('refuses a still-current captured toggle behind an actual competing Base UI portal, then admits after retirement', async () => {
    let retained: (() => void) | undefined
    const change = vi.fn()
    function Probe() {
      const { popupRef, toggle, fullscreen } = useDialogOptions({ onFullscreenChange: change })
      useLayoutEffect(() => { retained = toggle })
      return <DialogContent ref={popupRef}><DialogTitle>Toggle owner</DialogTitle><span>{fullscreen ? 'Expanded probe' : 'Bounded probe'}</span></DialogContent>
    }
    const outer = render(<Dialog open><Probe /></Dialog>)
    await screen.findByRole('dialog', { name: 'Toggle owner' })
    act(() => retained!())
    await waitFor(() => expect(screen.getByText('Expanded probe')).toBeTruthy())
    change.mockClear()
    const captured = retained!
    const competing = render(<Dialog open><DialogContent><DialogTitle>Competing owner</DialogTitle><button>Foreground action</button></DialogContent></Dialog>)
    const competitor = await screen.findByRole('dialog', { name: 'Competing owner' })
    vi.spyOn(competitor, 'getClientRects').mockReturnValue([{ width: 10 }] as unknown as DOMRectList)
    act(() => captured())
    expect(change).not.toHaveBeenCalled()
    competing.unmount()
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Toggle owner' }).closest('[aria-hidden="true"]')).toBeNull())
    act(() => retained!())
    expect(change).toHaveBeenCalledOnce()
    outer.unmount()
  })
  it('does not steal a newer plain foreground focus owner while return is queued', () => {
    const target = document.createElement('button'), foreground = document.createElement('button')
    document.body.append(target, foreground)
    const queued: (() => void)[] = []
    const view = renderHook(() => useDialogOptions({ returnFocus: { trigger: target } }))
    vi.spyOn(globalThis, 'queueMicrotask').mockImplementation(cb => queued.push(cb))
    ;(view.result.current.finalFocus as () => false)()
    foreground.focus()
    queued.splice(0).forEach(cb => cb())
    expect(document.activeElement).toBe(foreground)
    view.unmount(); target.remove(); foreground.remove()
  })
})


describe('exact nested toggle and forwarded ref admission', () => {
  it('refuses a retained toggle under a native nested portal and admits after it closes', async () => {
    let retained: (() => void) | undefined
    const change = vi.fn()
    function Nested() {
      const [open, setOpen] = useState(false)
      return <><button onClick={() => setOpen(true)}>Open nested probe</button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Nested toggle owner</DialogTitle></DialogContent></Dialog></>
    }
    function Probe() {
      const { popupRef, toggle } = useDialogOptions({ onFullscreenChange: change })
      useLayoutEffect(() => { retained = toggle })
      return <DialogContent ref={popupRef}><DialogTitle>Parent toggle owner</DialogTitle><Nested /></DialogContent>
    }
    render(<Dialog open><Probe /></Dialog>)
    await screen.findByRole('dialog', { name: 'Parent toggle owner' })
    const captured = retained!
    fireEvent.click(screen.getByText('Open nested probe'))
    const inner = await screen.findByRole('dialog', { name: 'Nested toggle owner' })
    act(() => captured())
    expect(change).not.toHaveBeenCalled()
    fireEvent.click(inner.querySelector('[data-slot="dialog-close"]')!)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nested toggle owner' })).toBeNull())
    act(() => retained!())
    expect(change).toHaveBeenCalledOnce()
  })
  it('forwards React callback ref cleanup through the owned popup ref', async () => {
    const attached = vi.fn(), cleaned = vi.fn()
    const view = render(<Dialog open><DialogContent ref={node => { if (node) { attached(node); return cleaned } }}><DialogTitle>Ref owner</DialogTitle></DialogContent></Dialog>)
    const root = await screen.findByRole('dialog', { name: 'Ref owner' })
    expect(attached).toHaveBeenCalledWith(root)
    view.unmount()
    expect(cleaned).toHaveBeenCalled()
  })
})
