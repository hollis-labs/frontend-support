import { useCallback, useLayoutEffect, useRef } from "react"
import type { HTMLAttributes, PointerEvent as ReactPointerEvent } from "react"
import { defaultEscapeStack } from "../lib/escape-stack"
import { hasActiveModalOverlay, NATIVE_INTERACTIVE_SELECTOR } from "../lib/keyboard-guards"
import { resolveAdmittedFocusTarget } from "../lib/focus-return"
import { useCommittedShortcutFrame } from "./use-committed-shortcut-frame"
import { ROW_INTERACTIVE_SELECTOR } from "../lib/row-activation"
import type { EscapeStack } from "../lib/escape-stack"

export interface LongPressGesture {
  target: HTMLElement
  clientX: number
  clientY: number
  pointerId: number
  pointerType: string
  /** Cancels only this gesture while its committed callback lease is current. */
  cancel: () => void
}
export interface UseLongPressOptions {
  onLongPress: (gesture: LongPressGesture) => void
  duration?: number
  movementTolerance?: number
  disabled?: boolean
  accessible?: boolean
  sourceGeneration: unknown
  activationGeneration: unknown
  isAdmitted: () => boolean
  escapeStack?: EscapeStack
}
export interface UseLongPressResult {
  bindings: Pick<
    HTMLAttributes<HTMLElement>,
    | "onPointerDown"
    | "onPointerMove"
    | "onPointerUp"
    | "onPointerLeave"
    | "onPointerCancel"
    | "onTouchCancel"
    | "onClickCapture"
    | "onContextMenu"
  >
  cancel: () => void
  isLive: () => boolean
}
interface Pending extends LongPressGesture {
  timer: ReturnType<typeof setTimeout> | null
  fired: boolean
  live: () => boolean
}

/** A background-root deliberate hold. Active layers/overlays veto admission.
 * Never captures pointers or prevents touch scrolling. */
export function useLongPress(options: UseLongPressOptions): UseLongPressResult {
  // Reuse the shared committed-frame lease; no independent lifetime fence.
  const live = useCommittedShortcutFrame()
  const pending = useRef<Pending | null>(null)
  const release = useRef<Pending | null>(null)
  const releaseExpiry = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = useCallback(() => {
    if (pending.current?.timer) clearTimeout(pending.current.timer)
    pending.current = null
  }, [])
  const clearRelease = useCallback(() => {
    release.current = null
    if (releaseExpiry.current !== null) clearTimeout(releaseExpiry.current)
    releaseExpiry.current = null
  }, [])
  const complete = useCallback(
    (pointerId: number) => {
      const p = pending.current
      if (!p || pointerId !== p.pointerId) return
      if (p.fired) {
        clearRelease()
        release.current = p
        // Touch compatibility mouseup/click may arrive in a later task than
        // pointerup. Keep this exact pointer token until that mouseup/click turn;
        // a fresh pointerdown always clears it before a new gesture can act.
      }
      clear()
    },
    [clear, clearRelease],
  )

  const admitted = (target: HTMLElement) =>
    live() &&
    !options.disabled &&
    options.accessible !== false &&
    options.isAdmitted() &&
    resolveAdmittedFocusTarget({ trigger: target }) === target &&
    !(options.escapeStack ?? defaultEscapeStack).hasActiveLayer() &&
    !hasActiveModalOverlay()

  useLayoutEffect(() => {
    // A committed replacement retires pending callbacks. Fired release custody
    // stays with the original gesture even when opening its menu commits a frame.
    if (pending.current && !pending.current.fired && !pending.current.live()) clear()
  })
  useLayoutEffect(() => {
    const cancel = () => {
      clear()
      clearRelease()
    }
    const pointerCancel = (e: PointerEvent) => {
      if (pending.current?.pointerId === e.pointerId || release.current?.pointerId === e.pointerId)
        cancel()
    }
    const move = (e: PointerEvent) => {
      const p = pending.current
      if (
        p &&
        !p.fired &&
        e.pointerId === p.pointerId &&
        Math.hypot(e.clientX - p.clientX, e.clientY - p.clientY) > (options.movementTolerance ?? 8)
      )
        clear()
    }
    const up = (e: PointerEvent) => complete(e.pointerId)
    const mouseUp = (e: MouseEvent) => {
      const p = release.current
      if (!p || e.button !== 0 || !(e.target instanceof Node) || !p.target.contains(e.target))
        return
      if (releaseExpiry.current !== null) clearTimeout(releaseExpiry.current)
      releaseExpiry.current = setTimeout(() => {
        if (release.current === p) clearRelease()
      }, 0)
    }
    const click = (e: MouseEvent) => {
      const p = release.current
      if (!p || e.detail === 0 || !(e.target instanceof Node) || !p.target.contains(e.target))
        return
      if ("pointerId" in e && (e as PointerEvent).pointerId !== p.pointerId) return
      clearRelease()
      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
    }
    const down = () => {
      clearRelease()
      if (pending.current) clear()
    }
    document.addEventListener("pointerdown", down, true)
    document.addEventListener("pointermove", move, true)
    document.addEventListener("pointerup", up, true)
    document.addEventListener("mouseup", mouseUp, true)
    document.addEventListener("pointercancel", pointerCancel, true)
    document.addEventListener("touchcancel", cancel, true)
    document.addEventListener("scroll", cancel, true)
    document.addEventListener("click", click, true)
    window.addEventListener("blur", cancel)
    const observer = new MutationObserver(() => {
      const p = pending.current ?? release.current
      if (p && resolveAdmittedFocusTarget({ trigger: p.target }) !== p.target) cancel()
    })
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "hidden",
        "inert",
        "disabled",
        "aria-hidden",
        "aria-disabled",
        "style",
        "class",
      ],
    })
    return () => {
      cancel()
      observer.disconnect()
      document.removeEventListener("pointerdown", down, true)
      document.removeEventListener("pointermove", move, true)
      document.removeEventListener("pointerup", up, true)
      document.removeEventListener("mouseup", mouseUp, true)
      document.removeEventListener("pointercancel", pointerCancel, true)
      document.removeEventListener("touchcancel", cancel, true)
      document.removeEventListener("scroll", cancel, true)
      document.removeEventListener("click", click, true)
      window.removeEventListener("blur", cancel)
    }
  }, [
    options.sourceGeneration,
    options.activationGeneration,
    options.movementTolerance,
    options.disabled,
    options.accessible,
    clear,
    clearRelease,
    complete,
  ])

  const cancel = () => {
    if (live()) {
      clear()
      clearRelease()
    }
  }
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (!admitted(e.currentTarget) || e.defaultPrevented || e.button !== 0 || !e.isPrimary) return
    const owner =
      e.target instanceof Element
        ? e.target.closest(`${NATIVE_INTERACTIVE_SELECTOR}, ${ROW_INTERACTIVE_SELECTOR}`)
        : null
    if (owner && owner !== e.currentTarget && e.currentTarget.contains(owner)) return
    clear()
    clearRelease()
    const p: Pending = {
      target: e.currentTarget,
      clientX: e.clientX,
      clientY: e.clientY,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      cancel: () => {
        if (live() && pending.current === p) {
          clear()
          clearRelease()
        }
      },
      timer: null,
      fired: false,
      live,
    }
    pending.current = p
    p.timer = setTimeout(
      () => {
        p.timer = null
        if (pending.current !== p) return
        if (!admitted(p.target)) {
          clear()
          return
        }
        p.fired = true
        options.onLongPress({
          target: p.target,
          clientX: p.clientX,
          clientY: p.clientY,
          pointerId: p.pointerId,
          pointerType: p.pointerType,
          cancel: p.cancel,
        })
      },
      Math.max(0, options.duration ?? 1000),
    )
  }
  return {
    isLive: live,
    cancel,
    bindings: {
      onPointerDown,
      onPointerMove: (e) => {
        if (
          live() &&
          pending.current &&
          !pending.current.fired &&
          e.pointerId === pending.current.pointerId &&
          Math.hypot(e.clientX - pending.current.clientX, e.clientY - pending.current.clientY) >
            (options.movementTolerance ?? 8)
        )
          clear()
      },
      onPointerLeave: () => {
        if (live() && !pending.current?.fired) clear()
      },
      onPointerUp: (e) => {
        if (live()) complete(e.pointerId)
      },
      onPointerCancel: (e) => {
        if (
          live() &&
          (pending.current?.pointerId === e.pointerId || release.current?.pointerId === e.pointerId)
        )
          cancel()
      },
      onTouchCancel: cancel,
      onClickCapture: (e) => {
        const p = release.current
        if (
          live() &&
          p &&
          e.detail > 0 &&
          p.target.contains(e.target as Node) &&
          (!("pointerId" in e.nativeEvent) ||
            (e.nativeEvent as PointerEvent).pointerId === p.pointerId)
        ) {
          clearRelease()
          e.preventDefault()
          e.stopPropagation()
        }
      },
      onContextMenu: (e) => {
        if (live() && pending.current?.fired) e.preventDefault()
      },
    },
  }
}
