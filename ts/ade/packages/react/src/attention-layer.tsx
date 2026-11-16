import type { Anchor, Attention, Hub, Rect } from "@hollis-labs/ade-core"
import { useEffect, useId, useState } from "react"
import { useAttention, useHub } from "./hooks.js"

interface Drawn {
  key: string
  a: Attention
  rects: Rect[]
  from: Rect | null
}

const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/**
 * Draws who is pointing at what, over the whole window: the person's selection, the
 * agent's highlight, spotlight or arrow, and the guide's current step. It takes no input
 * (pointer events pass through), so it can never cover a control the person needs.
 * Mount it once, anywhere under AdeProvider.
 */
export function AttentionLayer({
  agentLabel = "Agent",
  hub: given,
  drawUser = true,
}: {
  agentLabel?: string
  hub?: Hub
  /** False when the application already shows the person's selection its own way. */
  drawUser?: boolean
}) {
  const hub = useHub(given)
  const all = useAttention(given)
  const attention = drawUser ? all : all.filter((a) => a.actor !== "user")
  const maskId = useId()
  const [, setTick] = useState(0)

  // Anchors are found again whenever the window moves under them, and a few times a second
  // while anything is shown (a surface can move without telling anyone).
  useEffect(() => {
    if (!attention.length) return
    const again = () => setTick((t) => t + 1)
    window.addEventListener("resize", again)
    window.addEventListener("scroll", again, true)
    const timer = window.setInterval(again, 250)
    return () => {
      window.removeEventListener("resize", again)
      window.removeEventListener("scroll", again, true)
      window.clearInterval(timer)
    }
  }, [attention.length])

  const drawn: Drawn[] = attention
    .map((a, i) => ({
      key: `${a.actor}:${a.style}:${i}`,
      a,
      rects: a.anchors.map((x: Anchor) => hub.resolve(x)).filter((r): r is Rect => !!r),
      from: a.from ? hub.resolve(a.from) : null,
    }))
    .filter((d) => d.rects.length)
  if (!drawn.length) return null
  const spot = drawn.find((d) => d.a.style === "spotlight")
  const w = window.innerWidth
  const h = window.innerHeight
  // A spotlight dims the surface it is on, not the whole window: the guide's words and the
  // controls beside it stay readable.
  const area = (spot && hub.bounds(spot.a.anchors[0]?.surface ?? "")) || { x: 0, y: 0, w, h }

  return (
    <div className="ade-layer" aria-hidden="true">
      <svg
        className="ade-layer-svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        role="presentation"
      >
        <defs>
          <marker
            id={`${maskId}-head`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="ade-arrow-head" />
          </marker>
          {spot && (
            <mask id={`${maskId}-spot`}>
              <rect x={area.x} y={area.y} width={area.w} height={area.h} fill="white" />
              {spot.rects.map((r, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rects have no identity of their own
                <rect
                  key={i}
                  x={r.x - 4}
                  y={r.y - 4}
                  width={r.w + 8}
                  height={r.h + 8}
                  rx="6"
                  fill="black"
                />
              ))}
            </mask>
          )}
        </defs>
        {spot && (
          <rect
            className="ade-dim"
            x={area.x}
            y={area.y}
            width={area.w}
            height={area.h}
            mask={`url(#${maskId}-spot)`}
          />
        )}
        {drawn.flatMap((d) =>
          d.a.style === "arrow" && d.from
            ? d.rects
                .filter((r) => r.x !== d.from?.x || r.y !== d.from?.y) // not from a part to itself
                .map((r, i) => {
                  const a = mid(d.from as Rect)
                  const b = mid(r)
                  return (
                    <line
                      // biome-ignore lint/suspicious/noArrayIndexKey: rects have no identity of their own
                      key={`${d.key}:${i}`}
                      className="ade-arrow"
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      markerEnd={`url(#${maskId}-head)`}
                    />
                  )
                })
            : [],
        )}
      </svg>
      {drawn.flatMap((d) =>
        d.rects.map((r, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rects have no identity of their own
            key={`${d.key}:${i}`}
            className="ade-ring"
            data-actor={d.a.actor}
            data-style={d.a.style}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
          />
        )),
      )}
      {drawn
        .filter((d) => d.a.note)
        .map((d) => {
          const r = d.rects[0] as Rect
          const below = r.y + r.h + 44 < h
          return (
            <div
              key={`${d.key}:note`}
              className="ade-note"
              style={{
                left: Math.max(8, Math.min(w - 268, r.x)),
                top: below ? r.y + r.h + 8 : Math.max(8, r.y - 40),
              }}
            >
              <strong>{d.a.actor === "agent" ? agentLabel : "You"}</strong> {d.a.note}
            </div>
          )
        })}
    </div>
  )
}
