import type { GuideStep } from "@hollis-labs/ade-core"
import { useState } from "react"
import { useGuide, useHub } from "./hooks.js"

const waits = (step: GuideStep): string => {
  const a = step.await
  if (!a || a.kind === "ack") return ""
  return "Waiting for you to do it on the surface."
}

/**
 * The guide's caption and its controls: what this step says, where it is, and the
 * person's say over it (back, go on or skip, pause, take over, stop). Everything is a
 * button, so it works from the keyboard; the caption is announced when it changes.
 */
export function GuideBar({ onAsk }: { onAsk?: (step: GuideStep) => void }) {
  const hub = useHub()
  const g = useGuide()
  const [hint, setHint] = useState("")
  if (!g || g.status === "stopped") return null
  const step = g.guide.steps[g.index] as GuideStep
  const real = step.await && step.await.kind !== "ack"
  if (g.status === "done")
    return (
      <section className="ade-guide" data-status="done" aria-label="Guide">
        <header>
          <strong>{g.guide.title}</strong>
          <span>finished</span>
        </header>
        <footer>
          <button type="button" onClick={() => hub.guideDo("stop")}>
            Close
          </button>
        </footer>
      </section>
    )
  const showHint = hint === step.id || !!g.offPath
  return (
    <section className="ade-guide" data-status={g.status} aria-label="Guide">
      <header>
        <strong>{g.guide.title}</strong>
        <span>
          step {g.index + 1} of {g.guide.steps.length}
          {g.status === "paused"
            ? g.controller === "user"
              ? " · you have the board"
              : " · paused"
            : ""}
        </span>
      </header>
      <p className="ade-guide-say" aria-live="polite">
        {step.say}
      </p>
      {g.status === "running" && real && <p className="ade-guide-wait">{waits(step)}</p>}
      {g.stalled && (
        <p className="ade-guide-hint">The guide could not do its own part: {g.stalled.reason}</p>
      )}
      {g.status === "running" && showHint && (
        <p className="ade-guide-hint">
          {g.offPath ? "That was not this step. " : ""}
          {step.hint ?? "Do what the step asks on the surface, or skip it."}
        </p>
      )}
      <footer>
        <button type="button" disabled={g.index === 0} onClick={() => hub.guideDo("back")}>
          Back
        </button>
        {g.status === "paused" ? (
          <button type="button" data-primary="true" onClick={() => hub.guideDo("resume")}>
            Resume
          </button>
        ) : (
          <>
            <button
              type="button"
              data-primary={real ? undefined : "true"}
              onClick={() => hub.guideDo(real ? "skip" : "next")}
            >
              {real ? "Skip" : g.index + 1 === g.guide.steps.length ? "Finish" : "Next"}
            </button>
            {real && (
              <button type="button" onClick={() => setHint(step.id)}>
                Hint
              </button>
            )}
            <button type="button" onClick={() => hub.guideDo("pause")}>
              Pause
            </button>
            <button
              type="button"
              onClick={() => hub.guideDo("takeover")}
              title="Carry on by yourself; the guide waits here"
            >
              Let me try
            </button>
          </>
        )}
        {onAsk && (
          <button type="button" onClick={() => onAsk(step)}>
            Ask about this
          </button>
        )}
        <button type="button" onClick={() => hub.guideDo("stop")}>
          Stop
        </button>
      </footer>
    </section>
  )
}
