import { act, fireEvent, render, screen } from "@testing-library/react"
import {
  Activity,
  StrictMode,
  useLayoutEffect,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defaultEscapeStack, useLongPress } from "../index"
import type { LongPressGesture, UseLongPressOptions, UseLongPressResult } from "../index"

let current: UseLongPressResult
function Host({ options }: { options: UseLongPressOptions }) {
  const press = useLongPress(options)
  useLayoutEffect(() => {
    current = press
  })
  return <div data-testid="hold" {...press.bindings} />
}
function pointer(target: HTMLElement, type: string, id = 7, x = 20, y = 20) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, {
    pointerId: id,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  })
  fireEvent(target, event)
}
const options = (
  onLongPress: UseLongPressOptions["onLongPress"] = vi.fn(),
): UseLongPressOptions => ({
  onLongPress,
  sourceGeneration: 1,
  activationGeneration: 1,
  isAdmitted: () => true,
})
afterEach(() => {
  vi.useRealTimers()
  defaultEscapeStack.reset()
})
describe("long press gesture custody", () => {
  it("uses configurable duration and cancels beyond, but not at, movement tolerance", () => {
    vi.useFakeTimers()
    const props = options()
    props.duration = 40
    render(<Host options={props} />)
    const target = screen.getByTestId("hold")
    pointer(target, "pointerdown")
    pointer(target, "pointermove", 7, 28, 20)
    act(() => {
      vi.advanceTimersByTime(39)
    })
    expect(props.onLongPress).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(props.onLongPress).toHaveBeenCalledTimes(1)
    pointer(target, "pointerup")
    pointer(target, "pointerdown")
    pointer(target, "pointermove", 7, 29, 20)
    act(() => {
      vi.advanceTimersByTime(40)
    })
    expect(props.onLongPress).toHaveBeenCalledTimes(1)
  })
  it("suppresses only the fired release click and leaves independent clicks intact", () => {
    vi.useFakeTimers()
    render(<Host options={options()} />)
    const target = screen.getByTestId("hold")
    pointer(target, "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    pointer(target, "pointerup")
    const release = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })
    fireEvent(target, release)
    expect(release.defaultPrevented).toBe(true)
    const other = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })
    fireEvent(document.body, other)
    expect(other.defaultPrevented).toBe(false)
    pointer(target, "pointerdown")
    pointer(target, "pointerup")
    const independent = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })
    fireEvent(target, independent)
    expect(independent.defaultPrevented).toBe(false)
  })
  it("retires pending and retained handlers across replacement, access and activation changes", () => {
    vi.useFakeTimers()
    const props = options(),
      tree = render(<Host options={props} />),
      target = screen.getByTestId("hold")
    const old = current!
    pointer(target, "pointerdown")
    tree.rerender(<Host options={{ ...props, sourceGeneration: 2 }} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).not.toHaveBeenCalled()
    expect(old.isLive()).toBe(false)
    const retainedEvent = {
      currentTarget: target,
      target,
      isPrimary: true,
      button: 0,
      pointerId: 7,
      clientX: 20,
      clientY: 20,
      pointerType: "mouse",
      defaultPrevented: false,
    } as unknown as ReactPointerEvent<HTMLElement>
    old.bindings.onPointerDown?.(retainedEvent)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).not.toHaveBeenCalled()
    pointer(target, "pointerdown")
    old.bindings.onPointerUp?.(retainedEvent)
    old.bindings.onPointerCancel?.(retainedEvent)
    old.cancel()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).toHaveBeenCalledTimes(1)
    pointer(target, "pointerup")
    pointer(target, "pointerdown")
    tree.rerender(<Host options={{ ...props, accessible: false }} />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).toHaveBeenCalledTimes(1)
    tree.rerender(<Host options={{ ...props, activationGeneration: 2 }} />)
    pointer(target, "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).toHaveBeenCalledTimes(2)
  })
  it("permits a label inside the initiating native button", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    function ButtonHost() {
      const press = useLongPress(options(callback))
      return (
        <button type="button" {...press.bindings}>
          <span data-testid="label">Hold label</span>
        </button>
      )
    }
    render(<ButtonHost />)
    pointer(screen.getByTestId("label"), "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it("gives an interactive descendant custody while a fresh root hold still works", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    function RowHost() {
      const press = useLongPress(options(callback))
      return (
        <div data-testid="root" {...press.bindings}>
          <input aria-label="Independent checkbox" type="checkbox" />
        </div>
      )
    }
    render(<RowHost />)
    pointer(screen.getByRole("checkbox"), "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).not.toHaveBeenCalled()
    pointer(screen.getByTestId("root"), "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it("ignores another pointer cancellation and release while the current gesture remains valid", () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    render(<Host options={options(callback)} />)
    const target = screen.getByTestId("hold")
    pointer(target, "pointerdown", 8)
    pointer(target, "pointercancel", 7)
    pointer(target, "pointerup", 7)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)
    pointer(target, "pointerup", 8)
    act(() => {
      vi.advanceTimersByTime(25)
    }) // touch compatibility events can arrive in a later task
    const unrelated = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })
    Object.assign(unrelated, { pointerId: 7 })
    fireEvent(target, unrelated)
    expect(unrelated.defaultPrevented).toBe(false)
    fireEvent.mouseUp(target, { button: 0 })
    const release = new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })
    Object.assign(release, { pointerId: 8 })
    fireEvent(target, release)
    expect(release.defaultPrevented).toBe(true)
  })
  it("old gesture cancellation cannot cancel a later valid gesture in the same frame", () => {
    vi.useFakeTimers()
    const gestures: LongPressGesture[] = []
    render(<Host options={options((g) => gestures.push(g))} />)
    const target = screen.getByTestId("hold")
    pointer(target, "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    pointer(target, "pointerup")
    pointer(target, "pointerdown")
    gestures[0].cancel()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(gestures).toHaveLength(2)
  })
  it.each(["pointerup", "pointercancel", "touchcancel", "scroll", "blur"])(
    "cancels a pending %s gesture",
    (type) => {
      vi.useFakeTimers()
      const props = options()
      render(<Host options={props} />)
      const target = screen.getByTestId("hold")
      pointer(target, "pointerdown")
      if (type.startsWith("pointer")) pointer(target, type)
      else fireEvent(type === "blur" ? window : target, new Event(type, { bubbles: true }))
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(props.onLongPress).not.toHaveBeenCalled()
    },
  )
  it("refuses layer and mutable source admission at expiry, then permits a fresh gesture", () => {
    vi.useFakeTimers()
    let admitted = true
    const callback = vi.fn()
    const props = { ...options(callback), isAdmitted: () => admitted }
    render(<Host options={props} />)
    const target = screen.getByTestId("hold")
    pointer(target, "pointerdown")
    admitted = false
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).not.toHaveBeenCalled()
    admitted = true
    pointer(target, "pointerdown")
    const unregister = defaultEscapeStack.register({
      id: "other",
      active: true,
      accessible: true,
      live: () => true,
      onEscape: () => "closed",
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).not.toHaveBeenCalled()
    unregister()
    pointer(target, "pointerdown")
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })
  it("retires a pending callback when its root is removed", async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    render(<Host options={options(callback)} />)
    const target = screen.getByTestId("hold")
    const parent = target.parentElement!
    pointer(target, "pointerdown")
    await act(async () => {
      target.remove()
      await Promise.resolve()
    })
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(callback).not.toHaveBeenCalled()
    parent.appendChild(target) // let React own its normal unmount cleanup
  })
  it("does not revive callbacks through StrictMode and Activity hide/reveal", () => {
    vi.useFakeTimers()
    const props = options()
    const tree = render(
      <StrictMode>
        <Activity mode="visible">
          <Host options={props} />
        </Activity>
      </StrictMode>,
    )
    const old = current!,
      target = screen.getByTestId("hold")
    pointer(target, "pointerdown")
    tree.rerender(
      <StrictMode>
        <Activity mode="hidden">
          <Host options={props} />
        </Activity>
      </StrictMode>,
    )
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).not.toHaveBeenCalled()
    expect(old.isLive()).toBe(false)
    tree.rerender(
      <StrictMode>
        <Activity mode="visible">
          <Host options={props} />
        </Activity>
      </StrictMode>,
    )
    expect(old.isLive()).toBe(false)
    pointer(target, "pointerdown")
    old.cancel()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(props.onLongPress).toHaveBeenCalledTimes(1)
  })
  it("retires an unmounted instance while the replacement instance can hold", () => {
    vi.useFakeTimers()
    const props = options()
    const first = render(<Host options={props} />)
    const old = current!
    pointer(screen.getByTestId("hold"), "pointerdown")
    first.unmount()
    render(<Host options={props} />)
    expect(old.isLive()).toBe(false)
    pointer(screen.getByTestId("hold"), "pointerdown")
    old.cancel()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(props.onLongPress).toHaveBeenCalledTimes(1)
  })
})
