import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import {
  EscapeStack,
  useLayeredEscape,
  useShiftShift,
  useShortcut,
  useQuickSearchShortcut,
  resolveAdmittedFocusTarget,
  restoreAdmittedFocus,
  isMacPlatform,
} from '../index'
import { SearchInput } from '../components/search-input'

describe('Keyboard Architecture & Admission Guards (CW-20261010-0090)', () => {
  let customStack: EscapeStack

  beforeEach(() => {
    customStack = new EscapeStack()
  })

  afterEach(() => {
    customStack.reset()
    vi.restoreAllMocks()
  })

  describe('Focus Return Admission Resolver', () => {
    it('returns trigger when connected, enabled, and caller-admitted', () => {
      const button = document.createElement('button')
      document.body.appendChild(button)

      const target = resolveAdmittedFocusTarget({
        trigger: button,
        isAdmitted: () => true,
        fallbackTarget: null,
      })

      expect(target).toBe(button)
      document.body.removeChild(button)
    })

    it('falls back when trigger is disconnected', () => {
      const button = document.createElement('button') // not in DOM
      const fallback = document.createElement('div')
      document.body.appendChild(fallback)

      const target = resolveAdmittedFocusTarget({
        trigger: button,
        isAdmitted: () => true,
        fallbackTarget: fallback,
      })

      expect(target).toBe(fallback)
      document.body.removeChild(fallback)
    })

    it('falls back when trigger is disabled', () => {
      const button = document.createElement('button')
      button.disabled = true
      document.body.appendChild(button)

      const fallback = document.createElement('div')
      document.body.appendChild(fallback)

      const target = resolveAdmittedFocusTarget({
        trigger: button,
        isAdmitted: () => true,
        fallbackTarget: fallback,
      })

      expect(target).toBe(fallback)
      document.body.removeChild(button)
      document.body.removeChild(fallback)
    })

    it('falls back when caller admission predicate rejects trigger (stale record)', () => {
      const button = document.createElement('button')
      document.body.appendChild(button)

      const fallback = document.createElement('div')
      document.body.appendChild(fallback)

      // Caller rejects button because underlying record was deleted or filtered out
      const target = resolveAdmittedFocusTarget({
        trigger: button,
        isAdmitted: () => false,
        fallbackTarget: fallback,
      })

      expect(target).toBe(fallback)
      document.body.removeChild(button)
      document.body.removeChild(fallback)
    })

    it('restores focus directly when target is focusable', () => {
      const button = document.createElement('button')
      document.body.appendChild(button)
      const focusSpy = vi.spyOn(button, 'focus')

      const success = restoreAdmittedFocus({
        trigger: button,
        isAdmitted: () => true,
      })

      expect(success).toBe(true)
      expect(focusSpy).toHaveBeenCalled()
      document.body.removeChild(button)
    })
  })

  describe('EscapeStack & useLayeredEscape', () => {
    it('observes strict LIFO dismissal: innermost layer dismisses first', () => {
      const outerEscape = vi.fn()
      const innerEscape = vi.fn()

      function TestNestedOverlays({ innerOpen }: { innerOpen: boolean }) {
        useLayeredEscape({
          active: true,
          onEscape: () => {
            outerEscape()
            return 'closed'
          },
          escapeStack: customStack,
        })

        useLayeredEscape({
          active: innerOpen,
          onEscape: () => {
            innerEscape()
            return 'closed'
          },
          escapeStack: customStack,
        })

        return <div>Nested Overlays</div>
      }

      const { rerender } = render(<TestNestedOverlays innerOpen={true} />)

      expect(customStack.getActiveLayers()).toHaveLength(2)

      // First Escape: should only be handled by innermost layer
      const esc1 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      const handled1 = customStack.handleKeyDown(esc1)

      expect(handled1).toBe(true)
      expect(innerEscape).toHaveBeenCalledTimes(1)
      expect(outerEscape).not.toHaveBeenCalled()

      // Inner overlay closes in response
      rerender(<TestNestedOverlays innerOpen={false} />)
      expect(customStack.getActiveLayers()).toHaveLength(1)

      // Second Escape: now handled by outer layer
      const esc2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      const handled2 = customStack.handleKeyDown(esc2)

      expect(handled2).toBe(true)
      expect(outerEscape).toHaveBeenCalledTimes(1)
    })

    it('enforces input-clearing before closing contract: input clear consumes event without closing layer', () => {
      const closeDialog = vi.fn()
      const clearInput = vi.fn()

      function TestDialogWithSearch() {
        const searchRef = { current: 'query text' }
        const [search, setSearch] = useState('query text')

        useLayeredEscape({
          active: true,
          onClearInput: () => {
            if (searchRef.current.length > 0) {
              clearInput()
              searchRef.current = ''
              setSearch('')
              return true // Consumed: input cleared
            }
            return false
          },
          onEscape: () => {
            closeDialog()
            return 'closed'
          },
          escapeStack: customStack,
        })

        return (
          <div role="dialog">
            <input aria-label="Dialog Search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        )
      }

      render(<TestDialogWithSearch />)

      // First Escape: clears input, consumes event, dialog does NOT close
      const esc1 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      const handled1 = customStack.handleKeyDown(esc1)

      expect(handled1).toBe(true)
      expect(clearInput).toHaveBeenCalledTimes(1)
      expect(closeDialog).not.toHaveBeenCalled()

      // Second Escape: input is now empty, so dialog closes
      const esc2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      const handled2 = customStack.handleKeyDown(esc2)

      expect(handled2).toBe(true)
      expect(closeDialog).toHaveBeenCalledTimes(1)
    })

    it('stops native and immediate propagation to prevent closing parent or clearing background', () => {
      function TestLayer() {
        useLayeredEscape({
          active: true,
          onEscape: () => 'closed',
          escapeStack: customStack,
        })
        return <div>Layer</div>
      }

      render(<TestLayer />)

      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      const stopPropSpy = vi.spyOn(esc, 'stopPropagation')
      const stopImmSpy = vi.spyOn(esc, 'stopImmediatePropagation')
      const prevDefSpy = vi.spyOn(esc, 'preventDefault')

      customStack.handleKeyDown(esc)

      expect(prevDefSpy).toHaveBeenCalled()
      expect(stopPropSpy).toHaveBeenCalled()
      expect(stopImmSpy).toHaveBeenCalled()
    })

    it('fails retired callback invocations after layer unmount (committed frame fence)', () => {
      let handleEscapeFn: (() => boolean) | null = null

      function TestComponent() {
        const result = useLayeredEscape({
          active: true,
          onEscape: () => 'closed',
          escapeStack: customStack,
        })
        handleEscapeFn = result.handleEscape
        return <div>Fence test</div>
      }

      const { unmount } = render(<TestComponent />)
      expect(handleEscapeFn).not.toBeNull()

      // Positive control: invoking while live
      expect(handleEscapeFn!()).toBe(true)

      // Unmount component
      unmount()

      // Retired negative control: invocation must fail cleanly
      expect(handleEscapeFn!()).toBe(false)
      expect(customStack.hasActiveLayer()).toBe(false)
    })

    it('preserves native handler across stable-prop parent rerenders without retiring registration', () => {
      const onEscape = vi.fn(() => 'closed' as const)

      function Child() {
        useLayeredEscape({
          active: true,
          onEscape,
          escapeStack: customStack,
        })
        return <div>Child Layer</div>
      }

      function Parent() {
        const [count, setCount] = useState(0)
        return (
          <div>
            <button onClick={() => setCount((c) => c + 1)}>Rerender Parent ({count})</button>
            <Child />
          </div>
        )
      }

      render(<Parent />)
      expect(customStack.getActiveLayers()).toHaveLength(1)

      // Trigger parent rerender with stable props on child
      const button = screen.getByRole('button', { name: /Rerender Parent/ })
      fireEvent.click(button)
      fireEvent.click(button)

      // Layer must remain registered and live
      expect(customStack.getActiveLayers()).toHaveLength(1)

      // Native Escape keydown must execute current onEscape
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      const handled = customStack.handleKeyDown(esc)

      expect(handled).toBe(true)
      expect(onEscape).toHaveBeenCalledTimes(1)
    })

    it('nested child mount inside parent overlay: deepest DOM element takes Escape precedence and unmount restores parent', () => {
      const parentEscape = vi.fn(() => 'closed' as const)
      const childEscape = vi.fn(() => 'closed' as const)

      function ChildOverlay({
        childEl,
        setChildEl,
        childEscape,
        stack,
      }: {
        childEl: HTMLDivElement | null
        setChildEl: (el: HTMLDivElement | null) => void
        childEscape: () => 'closed'
        stack: EscapeStack
      }) {
        useLayeredEscape({
          active: true,
          onEscape: childEscape,
          rootElement: childEl,
          escapeStack: stack,
        })
        return (
          <div ref={setChildEl} data-testid="child-overlay">
            <button data-testid="child-button">Inside Child</button>
          </div>
        )
      }

      function NestedHierarchy({ childOpen }: { childOpen: boolean }) {
        const [parentEl, setParentEl] = useState<HTMLDivElement | null>(null)
        const [childEl, setChildEl] = useState<HTMLDivElement | null>(null)

        useLayeredEscape({
          active: true,
          onEscape: parentEscape,
          rootElement: parentEl,
          escapeStack: customStack,
        })

        return (
          <div ref={setParentEl} data-testid="parent-overlay">
            Parent Overlay
            {childOpen && (
              <ChildOverlay
                childEl={childEl}
                setChildEl={setChildEl}
                childEscape={childEscape}
                stack={customStack}
              />
            )}
          </div>
        )
      }

      const { rerender } = render(<NestedHierarchy childOpen={true} />)
      const childBtn = screen.getByTestId('child-button')

      // Escape targeting inside child overlay: child consumes, parent is untouched
      const esc1 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      Object.defineProperty(esc1, 'target', { value: childBtn })
      const handled1 = customStack.handleKeyDown(esc1)

      expect(handled1).toBe(true)
      expect(childEscape).toHaveBeenCalledTimes(1)
      expect(parentEscape).not.toHaveBeenCalled()

      // Unmount child
      rerender(<NestedHierarchy childOpen={false} />)

      // Escape targeting parent overlay: parent consumes
      const esc2 = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      Object.defineProperty(esc2, 'target', { value: screen.getByTestId('parent-overlay') })
      const handled2 = customStack.handleKeyDown(esc2)

      expect(handled2).toBe(true)
      expect(parentEscape).toHaveBeenCalledTimes(1)
    })
  })

  describe('useShiftShift Hook', () => {
    it('fires on two consecutive Shift presses within 300ms with deterministic monotonic clock', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestShiftShift() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>ShiftShift Test</div>
      }

      render(<TestShiftShift />)

      // First Shift tap at t=1000
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onTrigger).not.toHaveBeenCalled()

      // Second Shift tap at t=1250 (delta = 250ms <= 300ms)
      currentTime = 1250
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it('does NOT fire if second Shift tap exceeds 300ms threshold', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestShiftShift() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>ShiftShift Test</div>
      }

      render(<TestShiftShift />)

      // First tap at t=1000
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      // Second tap at t=1350 (delta = 350ms > 300ms threshold)
      currentTime = 1350
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('resets window immediately on non-Shift key or window blur', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestShiftShift() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>ShiftShift Test</div>
      }

      render(<TestShiftShift />)

      // Tap 1
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      // Non-Shift key typed (e.g. user typing 'a')
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))

      // Tap 2 at t=1100 (would be within 100ms, but reset by 'a')
      currentTime = 1100
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).not.toHaveBeenCalled()

      // Window blur also resets
      window.dispatchEvent(new Event('blur'))
      currentTime = 1200
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('is suppressed in editable form targets', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestShiftShift() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <input aria-label="Input field" />
      }

      render(<TestShiftShift />)
      const input = screen.getByLabelText('Input field')

      // Dispatching Shift events targeting an input
      fireEvent.keyDown(input, { key: 'Shift' })
      currentTime = 1100
      fireEvent.keyDown(input, { key: 'Shift' })

      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('is suppressed during IME composition (isComposing or keyCode 229)', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestShiftShift() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>IME Test</div>
      }

      render(<TestShiftShift />)

      // Shift during IME composition
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Shift',
          isComposing: true,
          keyCode: 229,
        } as unknown as KeyboardEventInit),
      )
      currentTime = 1100
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('is suppressed when an active overlay layer owns keys', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestWithActiveOverlay() {
        useLayeredEscape({
          active: true,
          onEscape: () => 'closed',
          escapeStack: customStack,
        })

        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })

        return <div>Overlay Active</div>
      }

      render(<TestWithActiveOverlay />)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      currentTime = 1100
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('fails retired callback invocation after unmount (committed frame fence)', () => {
      let triggerFn: (() => boolean) | null = null

      function TestComponent() {
        const result = useShiftShift({
          onTrigger: () => {},
          escapeStack: customStack,
        })
        triggerFn = result.trigger
        return <div>Fence test</div>
      }

      const { unmount } = render(<TestComponent />)
      expect(triggerFn).not.toBeNull()

      // Current positive control
      expect(triggerFn!()).toBe(true)

      // Unmount
      unmount()

      // Retired negative control
      expect(triggerFn!()).toBe(false)
    })

    it('preserves native Shift-Shift listener across parent rerenders with stable props', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function Child() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>Shift-Shift Child</div>
      }

      function Parent() {
        const [count, setCount] = useState(0)
        return (
          <div>
            <button onClick={() => setCount((c) => c + 1)}>Rerender ({count})</button>
            <Child />
          </div>
        )
      }

      render(<Parent />)

      // Parent rerenders
      const button = screen.getByRole('button', { name: /Rerender/ })
      fireEvent.click(button)
      fireEvent.click(button)

      // Native Shift-Shift taps must still trigger
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      currentTime = 1200
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it('ignores Shift keydown repeat (holding Shift down does NOT count as double tap)', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestShiftRepeat() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>Shift Repeat Test</div>
      }

      render(<TestShiftRepeat />)

      // First initial Shift keydown
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      // Subsequent keydown events caused by holding Shift key (event.repeat = true)
      currentTime = 1100
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', repeat: true }))
      currentTime = 1150
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift', repeat: true }))

      expect(onTrigger).not.toHaveBeenCalled()
    })

    it('handles clock-zero and clock backwards boundaries without false triggers', () => {
      let currentTime = 0
      const onTrigger = vi.fn()

      function TestClockBoundaries() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>Clock Test</div>
      }

      render(<TestClockBoundaries />)

      // Zero is a legitimate monotonic clock origin.
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      currentTime = 100
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onTrigger).toHaveBeenCalledTimes(1)

      // Tap 1 at 1000
      currentTime = 1000
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      // Clock moves backwards to 500 (delta = -500, negative): must not trigger
      currentTime = 500
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onTrigger).toHaveBeenCalledTimes(1)

      // Next tap at 650 (delta = 150 <= 300 relative to 500): triggers
      currentTime = 650
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onTrigger).toHaveBeenCalledTimes(2)
    })

    it('suppresses Shift-Shift when an unregistered modal overlay exists in the DOM', () => {
      let currentTime = 1000
      const onTrigger = vi.fn()

      function TestUnregisteredOverlay() {
        useShiftShift({
          onTrigger,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>Test</div>
      }

      render(<TestUnregisteredOverlay />)

      // Insert an unregistered modal dialog into document.body
      const dialog = document.createElement('div')
      dialog.setAttribute('role', 'dialog')
      dialog.getClientRects = () => [{} as DOMRect] as unknown as DOMRectList
      document.body.appendChild(dialog)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      currentTime = 1150
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).not.toHaveBeenCalled()

      // Remove dialog
      document.body.removeChild(dialog)

      // Now admitted
      currentTime = 1500
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      currentTime = 1650
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))

      expect(onTrigger).toHaveBeenCalledTimes(1)
    })
  })

  describe('useShortcut & useQuickSearchShortcut', () => {
    it('matches exact modifier rules and forbids unrequested modifiers', () => {
      const onTrigger = vi.fn()

      function TestShortcut() {
        useShortcut({
          key: 'k',
          modifiers: { ctrl: true }, // specifically requires ctrl, forbids meta/alt/shift
          onTrigger,
          escapeStack: customStack,
        })
        return <div>Shortcut Test</div>
      }

      render(<TestShortcut />)

      // Matching Ctrl+K
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      expect(onTrigger).toHaveBeenCalledTimes(1)

      // Unrequested Shift+Ctrl+K should NOT trigger
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, shiftKey: true }))
      expect(onTrigger).toHaveBeenCalledTimes(1)

      // Unrequested Alt+Ctrl+K should NOT trigger
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, altKey: true }))
      expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it('suspends background shortcuts when an active overlay layer is present', () => {
      const onGlobalShortcut = vi.fn()

      function TestGlobalWithOverlay({ overlayOpen }: { overlayOpen: boolean }) {
        useShortcut({
          key: 'k',
          modifiers: { ctrl: true },
          onTrigger: onGlobalShortcut,
          escapeStack: customStack,
        })

        useLayeredEscape({
          active: overlayOpen,
          onEscape: () => 'closed',
          escapeStack: customStack,
        })

        return <div>Overlay Test</div>
      }

      const { rerender } = render(<TestGlobalWithOverlay overlayOpen={true} />)

      // Active overlay is present -> global shortcut suspended
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      expect(onGlobalShortcut).not.toHaveBeenCalled()

      // Close overlay
      rerender(<TestGlobalWithOverlay overlayOpen={false} />)

      // Now admitted
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      expect(onGlobalShortcut).toHaveBeenCalledTimes(1)
    })

    it('useQuickSearchShortcut combines Mod+K and Shift-Shift alias', () => {
      let currentTime = 1000
      const onOpen = vi.fn()

      function TestQuickSearch() {
        useQuickSearchShortcut({
          onOpen,
          thresholdMs: 300,
          getTime: () => currentTime,
          escapeStack: customStack,
        })
        return <div>Quick Search Test</div>
      }

      render(<TestQuickSearch />)

      // Trigger via Shift-Shift
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      currentTime = 1150
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }))
      expect(onOpen).toHaveBeenCalledTimes(1)

      // Trigger via Mod+K (Ctrl+K on Linux, Meta+K on macOS)
      const isMac = isMacPlatform()
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: isMac,
          ctrlKey: !isMac,
        }),
      )
      expect(onOpen).toHaveBeenCalledTimes(2)
    })

    it('preserves native shortcut listener across parent rerenders with stable props', () => {
      const onTrigger = vi.fn()

      function Child() {
        useShortcut({
          key: 'k',
          modifiers: { ctrl: true },
          onTrigger,
          escapeStack: customStack,
        })
        return <div>Shortcut Child</div>
      }

      function Parent() {
        const [count, setCount] = useState(0)
        return (
          <div>
            <button onClick={() => setCount((c) => c + 1)}>Rerender ({count})</button>
            <Child />
          </div>
        )
      }

      render(<Parent />)

      // Parent rerenders
      const button = screen.getByRole('button', { name: /Rerender/ })
      fireEvent.click(button)
      fireEvent.click(button)

      // Shortcut must still trigger
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      expect(onTrigger).toHaveBeenCalledTimes(1)
    })

    it('suppresses single-key shortcuts without modifiers inside interactive elements (buttons, links)', () => {
      const onSlash = vi.fn()

      function TestSlash() {
        useShortcut({
          key: '/',
          allowInInteractive: false,
          onTrigger: onSlash,
          escapeStack: customStack,
        })
        return (
          <div>
            <button data-testid="test-btn">Click me</button>
            <a href="#test" data-testid="test-link">
              Link
            </a>
          </div>
        )
      }

      render(<TestSlash />)
      const btn = screen.getByTestId('test-btn')

      // Keydown targeting button: suppressed by interactive target guard
      fireEvent.keyDown(btn, { key: '/' })
      expect(onSlash).not.toHaveBeenCalled()

      // Keydown targeting window / non-interactive target: fires
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
      expect(onSlash).toHaveBeenCalledTimes(1)
    })

    it('allows modifier shortcuts (Mod+K) inside interactive elements when not editable', () => {
      const onModK = vi.fn()

      function TestModK() {
        useShortcut({
          key: 'k',
          modifiers: { ctrl: true },
          onTrigger: onModK,
          escapeStack: customStack,
        })
        return (
          <div>
            <button data-testid="test-btn">Button</button>
            <input data-testid="test-input" />
          </div>
        )
      }

      render(<TestModK />)
      const btn = screen.getByTestId('test-btn')
      const input = screen.getByTestId('test-input')

      // Keydown inside button: admitted because Mod+K has modifiers
      fireEvent.keyDown(btn, { key: 'k', ctrlKey: true })
      expect(onModK).toHaveBeenCalledTimes(1)

      // Keydown inside input: suppressed by editable target guard
      fireEvent.keyDown(input, { key: 'k', ctrlKey: true })
      expect(onModK).toHaveBeenCalledTimes(1)
    })

    it('suppresses shortcuts when an unregistered modal overlay exists in the DOM', () => {
      const onTrigger = vi.fn()

      function TestUnregistered() {
        useShortcut({
          key: 'k',
          modifiers: { ctrl: true },
          onTrigger,
          escapeStack: customStack,
        })
        return <div>Test</div>
      }

      render(<TestUnregistered />)

      const dialog = document.createElement('div')
      dialog.setAttribute('role', 'dialog')
      dialog.getClientRects = () => [{} as DOMRect] as unknown as DOMRectList
      document.body.appendChild(dialog)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      expect(onTrigger).not.toHaveBeenCalled()

      document.body.removeChild(dialog)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      expect(onTrigger).toHaveBeenCalledTimes(1)
    })
  })

  describe('SearchInput Integration with Extracted Guards', () => {
    it('focuses input on "/" keypress when not in editable target', () => {
      const onChange = vi.fn()
      render(<SearchInput value="" onChange={onChange} slashToFocus={true} layeredEscape />)

      const input = screen.getByRole('searchbox')
      const focusSpy = vi.spyOn(input, 'focus')

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
      expect(focusSpy).toHaveBeenCalled()
    })

    it('suppresses "/" focus during IME composition or modifiers', () => {
      const onChange = vi.fn()
      render(<SearchInput value="" onChange={onChange} slashToFocus={true} layeredEscape />)

      const input = screen.getByRole('searchbox')
      const focusSpy = vi.spyOn(input, 'focus')

      // IME composition
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', isComposing: true }))
      expect(focusSpy).not.toHaveBeenCalled()

      // Modifiers held
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', metaKey: true }))
      expect(focusSpy).not.toHaveBeenCalled()
    })

    it('clears query text on Escape and consumes event without closing outer container', () => {
      const onChange = vi.fn()
      render(<SearchInput value="active query" onChange={onChange} layeredEscape />)

      const input = screen.getByRole('searchbox') as HTMLInputElement
      expect(input.value).toBe('active query')

      fireEvent.keyDown(input, { key: 'Escape' })

      expect(input.value).toBe('')
      expect(onChange).toHaveBeenCalledWith('')
    })
  })
})
