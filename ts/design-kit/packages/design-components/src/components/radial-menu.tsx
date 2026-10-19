import { useLayoutEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { defaultEscapeStack } from "../lib/escape-stack"
import {
  isActiveOverlay,
  isComposingEvent,
  isEditableTarget,
  OVERLAY_SELECTOR,
} from "../lib/keyboard-guards"
import { resolveAdmittedFocusTarget, restoreAdmittedFocus } from "../lib/focus-return"
import { useLayeredEscape } from "../hooks/use-layered-escape"
import { useCommittedShortcutFrame } from "../hooks/use-committed-shortcut-frame"
import type { EscapeStack } from "../lib/escape-stack"
import type { FocusReturnOptions } from "../lib/focus-return"

const CENTER = Symbol("radial-center")

export interface RadialMenuItem {
  id: string
  label: string
  /** Degrees clockwise from the right; preserves Nil's cos/sin source geometry. */
  angle: number
  icon?: ReactNode
  disabled?: boolean
  children?: readonly RadialMenuItem[]
}
export interface RadialMenuProps {
  open: boolean
  label: string
  position: { x: number; y: number }
  items: readonly RadialMenuItem[]
  onAction: (id: string) => void
  onOpenChange: (open: boolean) => void
  sourceGeneration: unknown
  activationGeneration: string | number
  accessible?: boolean
  isAdmitted: () => boolean
  focusReturn: FocusReturnOptions
  escapeStack?: EscapeStack
}

export function RadialMenu(props: RadialMenuProps) {
  if (!props.open || props.accessible === false || !props.isAdmitted()) return null
  return <RadialMenuSession key={String(props.activationGeneration)} {...props} />
}

function RadialMenuSession(props: RadialMenuProps) {
  const live = useCommittedShortcutFrame()
  const root = useRef<HTMLDivElement>(null)
  const radiusProbe = useRef<HTMLSpanElement>(null)
  const paddingProbe = useRef<HTMLSpanElement>(null)
  const composing = useRef(false)
  const focusRequested = useRef(true)
  const [path, setPath] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | typeof CENTER | null>(null)
  const [geometry, setGeometry] = useState({
    x: props.position.x,
    y: props.position.y,
    radius: 0,
  })
  let items = props.items
  for (const id of path) items = items.find((item) => item.id === id)?.children ?? []
  const ordered = [...items].sort((a, b) => a.angle - b.angle)
  const focusable = ordered.filter((item) => !item.disabled).map((item) => item.id)
  const stack = props.escapeStack ?? defaultEscapeStack
  const admitted = () =>
    live() &&
    props.open &&
    props.accessible !== false &&
    props.isAdmitted() &&
    root.current !== null &&
    resolveAdmittedFocusTarget({ trigger: root.current }) === root.current
  const close = () => {
    if (!admitted()) return
    props.onOpenChange(false)
    restoreAdmittedFocus(props.focusReturn)
  }
  const back = () => {
    if (!admitted()) return
    if (path.length) {
      focusRequested.current = true
      const parent = path[path.length - 1]
      setPath(path.slice(0, -1))
      setActiveId(parent)
    } else close()
  }
  const layer = useLayeredEscape({
    active: props.open,
    accessible: props.accessible,
    sourceGeneration: props.sourceGeneration,
    rootElement: () => root.current,
    escapeStack: stack,
    isLayerAdmitted: admitted,
    onEscape: (event) => {
      if (
        composing.current ||
        isComposingEvent(event) ||
        isEditableTarget(event.target) ||
        !admitted()
      )
        return "ignored"
      back()
      return path.length ? "cleared" : "closed"
    },
  })
  const owns = () =>
    admitted() &&
    layer.isTopmost() &&
    !Array.from(document.querySelectorAll(OVERLAY_SELECTOR)).some(
      (el) =>
        el !== root.current &&
        !el.contains(root.current) &&
        !stack
          .getActiveLayers()
          .some(
            (layer) =>
              (typeof layer.rootElement === "function"
                ? layer.rootElement()
                : layer.rootElement) === el,
          ) &&
        isActiveOverlay(el),
    )

  useLayoutEffect(() => {
    composing.current = false
    const menu = root.current
    if (!menu) return
    const measure = () => {
      const radius = radiusProbe.current?.getBoundingClientRect().width ?? 0
      const padding = paddingProbe.current?.getBoundingClientRect().width ?? 0
      const buttons = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      const extentX = Math.max(0, ...buttons.map((b) => b.getBoundingClientRect().width / 2))
      const extentY = Math.max(0, ...buttons.map((b) => b.getBoundingClientRect().height / 2))
      const view = window.visualViewport
      const left = view?.offsetLeft ?? 0,
        top = view?.offsetTop ?? 0
      const width = view?.width ?? window.innerWidth,
        height = view?.height ?? window.innerHeight
      const clamp = (value: number, start: number, size: number, clearance: number) =>
        size < clearance * 2
          ? start + size / 2
          : Math.max(start + clearance, Math.min(value, start + size - clearance))
      const next = {
        x: clamp(props.position.x, left, width, radius + extentX + padding),
        y: clamp(props.position.y, top, height, radius + extentY + padding),
        radius,
      }
      setGeometry((previous) =>
        previous.x === next.x && previous.y === next.y && previous.radius === next.radius
          ? previous
          : next,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(menu)
    for (const button of menu.querySelectorAll('[role="menuitem"]')) observer.observe(button)
    window.addEventListener("resize", measure)
    window.visualViewport?.addEventListener("resize", measure)
    window.visualViewport?.addEventListener("scroll", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
      window.visualViewport?.removeEventListener("resize", measure)
      window.visualViewport?.removeEventListener("scroll", measure)
    }
  }, [props.position.x, props.position.y, props.sourceGeneration, path])

  useLayoutEffect(() => {
    if (!owns() || !focusRequested.current) return
    const id =
      activeId !== null && (activeId === CENTER || focusable.includes(activeId))
        ? activeId
        : (focusable[0] ?? CENTER)
    const buttons = Array.from(root.current!.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const button = buttons.find((b) =>
      id === CENTER ? b.dataset.radialCenter === "true" : b.dataset.radialId === id,
    )
    if (button) {
      focusRequested.current = false
      button.focus()
    }
  })

  const activate = (id: string | typeof CENTER) => {
    if (!owns() || composing.current) return
    if (id === CENTER) {
      back()
      return
    }
    const item = items.find((item) => item.id === id)
    if (!item || item.disabled) return
    if (item.children) {
      focusRequested.current = true
      setPath([...path, id])
      setActiveId(null)
    } else {
      props.onAction(item.id)
      close()
    }
  }
  const buttonClass =
    "absolute flex min-h-9 min-w-9 max-w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-border-subtle bg-surface px-2 py-1 font-mono text-micro text-fg shadow-lg transition-colors motion-reduce:transition-none hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:text-fg-faint"
  const backdropDown = useRef<{
    pointerId: number
    target: HTMLElement
    source: unknown
    activation: string | number
    live: () => boolean
    retire: () => void
  } | null>(null)
  useLayoutEffect(() => {
    const retire = () => {
      backdropDown.current?.retire()
      backdropDown.current = null
    }
    window.addEventListener("blur", retire)
    return () => {
      window.removeEventListener("blur", retire)
      retire()
    }
  }, [])
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm"
      onPointerDown={(e) => {
        backdropDown.current?.retire()
        backdropDown.current = null
        if (
          e.target !== e.currentTarget ||
          e.defaultPrevented ||
          !e.isPrimary ||
          e.button !== 0 ||
          !owns()
        )
          return
        const target = e.currentTarget
        const menu = root.current!
        let retired = false
        const observer = new MutationObserver((records) => {
          if (
            records.some((record) =>
              Array.from(record.removedNodes).some(
                (node) =>
                  node === target || node.contains(target) || node === menu || node.contains(menu),
              ),
            )
          )
            retire()
        })
        const retire = () => {
          retired = true
          observer.disconnect()
        }
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
        })
        backdropDown.current = {
          pointerId: e.pointerId,
          target,
          source: props.sourceGeneration,
          activation: props.activationGeneration,
          live: () => !retired && live(),
          retire,
        }
      }}
      onPointerCancel={(e) => {
        if (backdropDown.current?.pointerId === e.pointerId) {
          backdropDown.current.retire()
          backdropDown.current = null
        }
      }}
      onClick={(e) => {
        const press = backdropDown.current
        if (!press || e.target !== e.currentTarget || e.detail === 0) return
        if ("pointerId" in e.nativeEvent && e.nativeEvent.pointerId !== press.pointerId) return
        const stillLive = press.live()
        press.retire()
        backdropDown.current = null
        if (e.defaultPrevented) return
        if (
          stillLive &&
          press.target === e.currentTarget &&
          Object.is(press.source, props.sourceGeneration) &&
          Object.is(press.activation, props.activationGeneration) &&
          owns()
        )
          close()
      }}
    >
      <div
        ref={root}
        role="menu"
        aria-label={props.label}
        tabIndex={-1}
        className="fixed size-40 -translate-x-1/2 -translate-y-1/2"
        style={{ left: geometry.x, top: geometry.y }}
        onCompositionStartCapture={() => {
          composing.current = true
        }}
        onCompositionEndCapture={() => {
          composing.current = false
        }}
        onKeyDown={(e) => {
          if (
            !owns() ||
            composing.current ||
            isComposingEvent(e.nativeEvent) ||
            isEditableTarget(e.target) ||
            e.defaultPrevented ||
            e.altKey ||
            e.ctrlKey ||
            e.metaKey
          )
            return
          const ids: Array<string | typeof CENTER> = [...focusable, CENTER]
          const target = (e.target as HTMLElement).closest<HTMLElement>(
            "[data-radial-id], [data-radial-center]",
          )
          const currentId = target?.dataset.radialCenter
            ? CENTER
            : (target?.dataset.radialId ?? activeId)
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            e.stopPropagation()
            if (currentId !== null && currentId !== undefined) activate(currentId)
            return
          }
          const delta =
            e.key === "ArrowRight" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)
              ? 1
              : e.key === "ArrowLeft" || e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)
                ? -1
                : 0
          if (!delta || (e.shiftKey && e.key !== "Tab")) return
          e.preventDefault()
          e.stopPropagation()
          const index = ids.indexOf(currentId ?? "")
          focusRequested.current = true
          setActiveId(ids[(index + delta + ids.length) % ids.length])
        }}
      >
        <span
          ref={radiusProbe}
          aria-hidden="true"
          className="pointer-events-none invisible absolute block w-16"
        />
        <span
          ref={paddingProbe}
          aria-hidden="true"
          className="pointer-events-none invisible absolute block w-2"
        />
        {ordered.map((item) => {
          const angle = (item.angle * Math.PI) / 180
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-radial-id={item.id}
              aria-label={item.label}
              aria-haspopup={item.children ? "menu" : undefined}
              aria-disabled={item.disabled || undefined}
              disabled={item.disabled}
              tabIndex={-1}
              className={buttonClass}
              style={{
                left: `calc(50% + ${Math.cos(angle) * geometry.radius}px)`,
                top: `calc(50% + ${Math.sin(angle) * geometry.radius}px)`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                activate(item.id)
              }}
            >
              {item.icon}
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          role="menuitem"
          data-radial-center="true"
          aria-label={path.length ? "Back" : "Close menu"}
          tabIndex={-1}
          className={`${buttonClass} left-1/2 top-1/2`}
          onClick={(e) => {
            e.stopPropagation()
            activate(CENTER)
          }}
        >
          {path.length ? "←" : "×"}
        </button>
      </div>
    </div>,
    document.body,
  )
}
