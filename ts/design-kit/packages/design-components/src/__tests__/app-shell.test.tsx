import { StrictMode, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppShell } from '../components/layout/app-shell'

/**
 * WHY THIS ASSERTS CLASSES, WHICH USUALLY SMELLS.
 *
 * The flex chain IS this component's contract — it exists for no other reason.
 * The behaviour it guarantees is "a tall child scrolls inside the shell instead
 * of overflowing the viewport", and jsdom does no layout, so that behaviour
 * cannot be observed directly. The chain is the only available proxy for it.
 *
 * So these pin the LOAD-BEARING links only — the ones whose absence is the known
 * bug — and not the full class string. Restyling the shell does not break them;
 * dropping `min-h-0` from the column or `flex-col` from `<main>` does, which is
 * exactly the regression Cerberus shipped for months.
 *
 * THE CHECK THAT MAKES THIS LEGITIMATE, and the one to apply before copying the
 * pattern: *if someone improves the code, does this fail?* Add or remove
 * decorative classes — no. Drop `min-h-0` — yes, and that is the defect. It
 * survives improvement and catches the bug, so it asserts a property rather than
 * a census. Asserting the FULL className string would have been the census: it
 * breaks on every restyle and pins appearance instead of contract.
 *
 * NOT PRECEDENT FOR PINNING CLASS STRINGS GENERALLY. This asserts the mechanism
 * only because the behaviour is unreachable in the harness — the property is
 * unobservable except through the classes that produce it. Where a behaviour CAN
 * be observed, assert the behaviour.
 */
function chain() {
  const outer = screen.getByTestId('shell-child').closest('div[class*="h-dvh"]')!
  const main = screen.getByTestId('shell-child').closest('main')!
  const column = main.parentElement!
  return { outer, column, main }
}

describe('AppShell flex chain', () => {
  it('the shell is exactly the viewport and does not scroll', () => {
    render(<AppShell><span data-testid="shell-child" /></AppShell>)
    const { outer } = chain()
    expect(outer.className).toContain('h-dvh')
    expect(outer.className).toContain('overflow-hidden')
    expect(outer.className).toContain('flex')
  })

  it('the content column can shrink below its content, vertically and horizontally', () => {
    render(<AppShell><span data-testid="shell-child" /></AppShell>)
    const { column } = chain()
    // Without min-h-0 a flex child refuses to shrink, the column grows past the
    // viewport, and the scroll region goes with it.
    expect(column.className).toContain('min-h-0')
    expect(column.className).toContain('min-w-0')
    expect(column.className).toContain('flex-col')
  })

  it('<main> is a flex column, so a routed view\'s own flex-1 has a parent to size against', () => {
    render(<AppShell><span data-testid="shell-child" /></AppShell>)
    const { main } = chain()
    // This is the exact link Cerberus dropped: `min-h-0 flex-1 overflow-hidden`
    // on a BLOCK container, which silently stops the page scrolling.
    expect(main.className).toContain('flex')
    expect(main.className).toContain('flex-col')
    expect(main.className).toContain('min-h-0')
    expect(main.className).toContain('flex-1')
  })

  it('renders nav and header as slots, and works without either', () => {
    const { unmount } = render(
      <AppShell nav={<nav data-testid="nav" />} header={<header data-testid="header" />}>
        <span data-testid="shell-child" />
      </AppShell>,
    )
    expect(screen.getByTestId('nav')).toBeTruthy()
    expect(screen.getByTestId('header')).toBeTruthy()
    unmount()

    render(<AppShell><span data-testid="shell-child" /></AppShell>)
    expect(screen.queryByTestId('nav')).toBeNull()
    expect(screen.getByTestId('shell-child')).toBeTruthy()
  })

  it('className extends the shell rather than replacing the chain', () => {
    render(<AppShell className="custom"><span data-testid="shell-child" /></AppShell>)
    const { outer } = chain()
    expect(outer.className).toContain('custom')
    expect(outer.className).toContain('h-dvh')
  })
})

describe('AppShell optional aside', () => {
  it('renders desktop aside with default regular preset (w-96) and independent scroll slot', () => {
    render(
      <AppShell
        isNarrow={false}
        aside={<div data-testid="aside-content">Aside Content</div>}
        asideHeader={<div data-testid="aside-header">Header</div>}
        asideFooter={<div data-testid="aside-footer">Footer</div>}
      >
        <span data-testid="shell-child" />
      </AppShell>,
    )

    const aside = screen.getByRole('complementary', { name: 'Aside' })
    expect(aside).toBeTruthy()
    expect(aside.getAttribute('data-slot')).toBe('app-shell-aside')
    expect(aside.getAttribute('data-width')).toBe('regular')
    expect(aside.className).toContain('w-96')
    expect(aside.className).toContain('flex')
    expect(aside.className).toContain('flex-col')
    expect(aside.className).toContain('min-h-0')

    const header = screen.getByTestId('aside-header')
    expect(header.parentElement?.getAttribute('data-slot')).toBe('app-shell-aside-header')
    expect(header.parentElement?.className).toContain('shrink-0')

    const body = screen.getByTestId('aside-content').parentElement
    expect(body?.getAttribute('data-slot')).toBe('app-shell-aside-body')
    expect(body?.className).toContain('overflow-y-auto')
    expect(body?.className).toContain('min-h-0')
    expect(body?.className).toContain('flex-1')

    const footer = screen.getByTestId('aside-footer')
    expect(footer.parentElement?.getAttribute('data-slot')).toBe('app-shell-aside-footer')
    expect(footer.parentElement?.className).toContain('shrink-0')
  })

  it('supports compact (w-80) and wide (w-112) width presets', () => {
    const { rerender } = render(
      <AppShell
        isNarrow={false}
        asideWidth="compact"
        aside={<div data-testid="aside-content" />}
      >
        <span data-testid="shell-child" />
      </AppShell>,
    )
    let aside = screen.getByRole('complementary')
    expect(aside.getAttribute('data-width')).toBe('compact')
    expect(aside.className).toContain('w-80')

    rerender(
      <AppShell
        isNarrow={false}
        asideWidth="wide"
        aside={<div data-testid="aside-content" />}
      >
        <span data-testid="shell-child" />
      </AppShell>,
    )
    aside = screen.getByRole('complementary')
    expect(aside.getAttribute('data-width')).toBe('wide')
    expect(aside.className).toContain('w-112')
  })

  it('reserves no empty sliver when asideCollapsed is true', () => {
    render(
      <AppShell
        isNarrow={false}
        asideCollapsed={true}
        aside={<div data-testid="aside-content">Aside Content</div>}
      >
        <span data-testid="shell-child" />
      </AppShell>,
    )

    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByTestId('aside-content')).toBeNull()
  })

  it('renders OverlaySidebar fallback in narrow mode without desktop aside', () => {
    render(
      <AppShell
        isNarrow={true}
        aside={<div data-testid="aside-content">Aside Content</div>}
        asideLabel="Assistant"
        asideTitle="Assistant Drawer"
      >
        <span data-testid="shell-child" />
      </AppShell>,
    )

    // Desktop aside is NOT in the document
    expect(screen.queryByRole('complementary')).toBeNull()

    // Trigger button is available for narrow screen
    const trigger = screen.getByRole('button', { name: 'Assistant' })
    expect(trigger).toBeTruthy()
    expect(trigger.getAttribute('data-slot')).toBe('app-shell-aside-trigger')
  })

  it('returns focus from desktop collapse and resize to an explicit admitted target', async () => {
    const target = document.createElement('button')
    document.body.appendChild(target)
    const props = { aside: <button>Aside action</button>, asideFocusReturnTarget: target }
    const { rerender } = render(<AppShell {...props} isNarrow={false}>Body</AppShell>)
    screen.getByRole('button', { name: 'Aside action' }).focus()
    rerender(<AppShell {...props} isNarrow={false} asideCollapsed>Body</AppShell>)
    await waitFor(() => expect(document.activeElement).toBe(target))
    rerender(<AppShell {...props} isNarrow={false}>Body</AppShell>)
    screen.getByRole('button', { name: 'Aside action' }).focus()
    rerender(<AppShell {...props} isNarrow>Body</AppShell>)
    await waitFor(() => expect(document.activeElement).toBe(target))
    target.remove()
  })

  it('returns from the actual custom trigger and rejects connected but retired triggers', async () => {
    const fallback = document.createElement('button')
    document.body.appendChild(fallback)
    let admitted = true
    function Example() {
      const [open, setOpen] = useState(false)
      return <AppShell isNarrow aside={<button>Aside action</button>}
        asideTrigger={<button>Custom opener</button>}
        asideOverlayOpen={open} onAsideOverlayOpenChange={setOpen}
        isAsideTriggerAdmitted={() => admitted}
        asideFocusFallbackTarget={fallback} isAsideFallbackAdmitted={() => true}>Body</AppShell>
    }
    render(<Example />)
    const trigger = screen.getByRole('button', { name: 'Custom opener' })
    fireEvent.click(trigger)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    fireEvent.click(trigger)
    await screen.findByRole('dialog')
    admitted = false
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(document.activeElement).toBe(fallback))
    fallback.remove()
  })
})

describe('AppShell owns only current narrow-to-desktop focus return', () => {
  function setup(generation: unknown = 'source-a') {
    const target = document.createElement('button')
    target.textContent = 'Current desktop target'
    document.body.append(target)
    const shell = (narrow: boolean, nextGeneration = generation, admitted = true) => (
      <StrictMode><AppShell isNarrow={narrow} asideOverlayOpen={narrow}
        aside={<button>Popup editor</button>} asideSourceGeneration={nextGeneration}
        asideFocusReturnTarget={target} isAsideTriggerAdmitted={() => admitted}
        asideFocusFallbackTarget={target} isAsideFallbackAdmitted={() => admitted}>Body</AppShell></StrictMode>
    )
    return { target, shell }
  }
  it('returns from the actual portaled popup after resize cleanup', async () => {
    const { target, shell } = setup()
    const view = render(shell(true))
    const editor = await screen.findByRole('button', { name: 'Popup editor' })
    editor.focus()
    expect(document.activeElement).toBe(editor)
    view.rerender(shell(false))
    await waitFor(() => expect(document.activeElement).toBe(target))
    target.remove()
  })
  it.each(['replacement', 'unadmitted', 'competing', 'unmount', 'outside', 'blur'])('rejects %s ownership after popup removal', async (boundary) => {
    const { target, shell } = setup()
    const view = render(shell(true))
    const editor = await screen.findByRole('button', { name: 'Popup editor' })
    editor.focus()
    const competing = document.createElement('div')
    competing.setAttribute('role', 'dialog')
    if (boundary === 'competing') document.body.append(competing)
    const outside = document.createElement('button')
    if (boundary === 'outside') { document.body.append(outside); outside.focus() }
    if (boundary === 'blur') { editor.blur(); await Promise.resolve(); expect(editor.isConnected).toBe(true) }
    if (boundary === 'unmount') view.unmount()
    else view.rerender(shell(false, boundary === 'replacement' ? 'source-b' : 'source-a', boundary !== 'unadmitted'))
    await Promise.resolve()
    await Promise.resolve()
    expect(document.activeElement).not.toBe(target)
    if (boundary === 'outside') expect(document.activeElement).toBe(outside)
    competing.remove(); outside.remove(); target.remove()
  })
})
