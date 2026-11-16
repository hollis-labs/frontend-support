/**
 * The hub: the one place where surfaces, attention, marks and the guide meet. An
 * application makes one, registers its surfaces with it and gives it to the interface (to
 * draw attention and the guide) and to the agent (as tools: tools.ts).
 */
import { inputMatches, sameAnchor } from "./anchor.js"
import type {
  ActionRequest,
  ActionResult,
  ActOutcome,
  Actor,
  Anchor,
  Attention,
  AttentionStyle,
  Guide,
  GuideEventKind,
  GuideState,
  GuideStep,
  HubEvent,
  Mark,
  Observation,
  Rect,
  SurfaceAdapter,
  SurfaceInfo,
} from "./types.js"

/** What registering a surface gives back. */
export interface SurfaceHandle {
  /** The content changed (after an action of the application's own, a load, an edit). */
  changed(): void
  /** The view changed: what is laid out where (a resize, a flip, a scroll that moves targets). */
  moved(): void
  remove(): void
}

export interface HubOptions {
  /** The clock, for tests. */
  now?: () => number
  /** An id for calls and marks, for tests. */
  id?: (prefix: string) => string
}

interface Entry {
  adapter: SurfaceAdapter
  epoch: number
}

let counter = 0
const defaultId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export class Hub {
  private surfaces = new Map<string, Entry>()
  private attention = new Map<string, Attention>() // key: actor + ":" + slot
  private marksBy = new Map<string, Mark[]>()
  private listeners = new Set<(e: HubEvent) => void>()
  private seq = 0
  private guide: GuideState | null = null
  private now: () => number
  private newId: (prefix: string) => string
  /** Bumped on every change, so a snapshot taken for React can be compared by identity. */
  private version = 0

  constructor(opts: HubOptions = {}) {
    this.now = opts.now ?? (() => Date.now())
    this.newId = opts.id ?? defaultId
  }

  // --- listening ---------------------------------------------------------------------

  subscribe(fn: (e: HubEvent) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /** A number that changes whenever anything in the hub does. */
  getVersion(): number {
    return this.version
  }

  private emit(e: { type: HubEvent["type"] } & Record<string, unknown>) {
    this.version++
    const event = { ...e, seq: ++this.seq } as HubEvent
    for (const fn of [...this.listeners]) {
      try {
        fn(event)
      } catch {
        // A listener's failure is its own.
      }
    }
  }

  // --- surfaces ----------------------------------------------------------------------

  register(adapter: SurfaceAdapter): SurfaceHandle {
    const id = adapter.info.id
    this.surfaces.set(id, { adapter, epoch: 1 })
    this.emit({ type: "surfaces" })
    return {
      changed: () => {
        if (this.surfaces.get(id)?.adapter !== adapter) return
        this.afterChange(id)
      },
      moved: () => {
        const entry = this.surfaces.get(id)
        if (entry?.adapter !== adapter) return
        entry.epoch++
        this.emit({ type: "changed", surface: id })
      },
      remove: () => {
        if (this.surfaces.get(id)?.adapter !== adapter) return
        this.surfaces.delete(id)
        for (const [key, a] of this.attention) {
          if (a.anchors.some((x) => x.surface === id)) this.attention.delete(key)
        }
        this.emit({ type: "surfaces" })
      },
    }
  }

  list(): SurfaceInfo[] {
    return [...this.surfaces.values()].map((e) => ({ ...e.adapter.info }))
  }

  has(surface: string): boolean {
    return this.surfaces.has(surface)
  }

  /** The surface now, with what the person has selected and the marks on it. */
  observe(surface: string): Observation {
    const entry = this.surfaces.get(surface)
    if (!entry) throw new Error(`There is no surface "${surface}".`)
    const view = entry.adapter.observe()
    const selection = this.attentionOf("user")
      .flatMap((a) => a.anchors)
      .filter((a) => a.surface === surface)
    const marks = this.marks(surface)
    return {
      id: this.newId("obs"),
      surface,
      app: entry.adapter.info.app,
      title: view.title ?? entry.adapter.info.title,
      at: new Date(this.now()).toISOString(),
      epoch: entry.epoch,
      resource: view.resource,
      summary: view.summary,
      state: view.state,
      targets: view.targets,
      actions: view.actions,
      ...(view.checks?.length ? { checks: view.checks } : {}),
      ...(selection.length ? { selection } : {}),
      ...(marks.length ? { marks } : {}),
    }
  }

  /** Where an anchor is on screen now, or null. */
  resolve(anchor: Anchor): Rect | null {
    try {
      return this.surfaces.get(anchor.surface)?.adapter.resolve?.(anchor) ?? null
    } catch {
      return null
    }
  }

  /** An anchor in a few words. */
  describe(anchor: Anchor): string {
    if (anchor.label) return anchor.label
    const said = this.surfaces.get(anchor.surface)?.adapter.describe?.(anchor)
    if (said) return said
    if (anchor.target) return `${anchor.target.kind} ${anchor.target.id}`
    if (anchor.quote) return `“${anchor.quote.text.slice(0, 60)}”`
    if (anchor.lines)
      return anchor.lines.end && anchor.lines.end !== anchor.lines.start
        ? `lines ${anchor.lines.start}–${anchor.lines.end}`
        : `line ${anchor.lines.start}`
    if (anchor.time) return `at ${Math.floor(anchor.time.start)}s`
    if (anchor.region) return "a region"
    return "the whole surface"
  }

  private afterChange(surface: string) {
    this.detachMarks(surface)
    this.emit({ type: "changed", surface })
    this.guideCheck()
  }

  // --- actions -----------------------------------------------------------------------

  /**
   * Do an action on a surface. It never throws: what happened is in the result. A request
   * that expects a revision or an epoch the surface has left is rejected as stale, with the
   * surface as it is now, so whoever asked can look again.
   */
  async act(
    req: Omit<ActionRequest, "id"> & { id?: string },
    signal: AbortSignal = new AbortController().signal,
  ): Promise<ActionResult> {
    const id = req.id ?? this.newId("act")
    const entry = this.surfaces.get(req.surface)
    const base = {
      id,
      correlation: req.correlation,
      surface: req.surface,
      action: req.action,
      input: req.input ?? {},
      actor: req.actor,
    }
    const done = (out: ActOutcome): ActionResult => {
      const now = this.surfaces.get(req.surface)
      let resource: ActionResult["resource"]
      try {
        resource = now?.adapter.observe().resource
      } catch {
        resource = undefined
      }
      const result: ActionResult = {
        ...base,
        outcome: out.outcome,
        ...(out.code ? { code: out.code } : {}),
        ...(out.reason ? { reason: out.reason } : {}),
        ...(resource ? { resource } : {}),
        epoch: now?.epoch ?? 0,
        ...(out.data !== undefined ? { data: out.data } : {}),
        at: new Date(this.now()).toISOString(),
      }
      this.emit({ type: "action", result })
      return result
    }
    if (!entry)
      return done({
        outcome: "rejected",
        code: "unavailable",
        reason: `There is no surface "${req.surface}".`,
      })
    let view: ReturnType<SurfaceAdapter["observe"]>
    try {
      view = entry.adapter.observe()
    } catch (err) {
      return done({ outcome: "rejected", code: "unavailable", reason: message(err) })
    }
    if (!view.actions.some((a) => a.name === req.action))
      return done({
        outcome: "rejected",
        code: "invalid",
        reason: `"${req.action}" is not something this surface does now. It does: ${view.actions.map((a) => a.name).join(", ") || "nothing"}.`,
      })
    if (req.expect?.rev !== undefined && view.resource && view.resource.rev !== req.expect.rev)
      return done({
        outcome: "rejected",
        code: "stale",
        reason: `It has changed since you looked (it was at ${req.expect.rev}, it is at ${view.resource.rev}). Look again before acting.`,
      })
    if (req.expect?.epoch !== undefined && entry.epoch !== req.expect.epoch)
      return done({
        outcome: "rejected",
        code: "stale",
        reason: "The view has changed since you looked. Look again before acting.",
      })
    if (signal.aborted)
      return done({ outcome: "cancelled", reason: "It was stopped before it began." })
    const before = view.resource?.rev
    let out: ActOutcome
    try {
      out = await entry.adapter.act(req.action, req.input ?? {}, {
        actor: req.actor,
        signal,
        correlation: req.correlation,
      })
    } catch (err) {
      // The application threw. If the content moved, something happened: say it is unknown.
      let after: string | undefined
      try {
        after = entry.adapter.observe().resource?.rev
      } catch {
        after = undefined
      }
      out =
        after !== before
          ? {
              outcome: "unknown",
              reason: `${message(err)} The surface changed, so part of it may have happened.`,
            }
          : { outcome: "rejected", code: "failed", reason: message(err) }
    }
    const result = done(out)
    if (out.outcome === "applied" || out.outcome === "unknown") {
      this.detachMarks(req.surface)
      this.guideCheck(result)
    }
    return result
  }

  // --- attention ---------------------------------------------------------------------

  /**
   * Point at something. A person's selection replaces their last selection; an agent's
   * highlight replaces its last in the same slot. Nothing is kept.
   */
  attend(a: {
    actor: Actor
    style: AttentionStyle
    anchors: Anchor[]
    from?: Anchor
    note?: string
    /** How long it lasts, in ms. Absent: until replaced or cleared. */
    ttl?: number
    /** A name to keep several at once; the same name replaces. Defaults to the style. */
    slot?: string
  }): void {
    const key = `${a.actor}:${a.slot ?? (a.actor === "user" ? "select" : a.style)}`
    if (!a.anchors.length) {
      if (this.attention.delete(key)) this.emit({ type: "attention", actor: a.actor })
      return
    }
    const last = this.attention.get(key)
    if (
      last &&
      last.style === a.style &&
      last.note === a.note &&
      last.anchors.length === a.anchors.length &&
      last.anchors.every((x, i) => sameAnchor(x, a.anchors[i] as Anchor))
    ) {
      if (a.ttl) last.until = this.now() + a.ttl
      return // the same thing again: no event, so pointer traffic does not become noise
    }
    this.attention.set(key, {
      actor: a.actor,
      style: a.style,
      anchors: a.anchors,
      from: a.from,
      note: a.note,
      until: a.ttl ? this.now() + a.ttl : undefined,
      seq: this.seq + 1,
    })
    this.emit({ type: "attention", actor: a.actor })
  }

  /** Stop pointing: one actor's, or one slot of it. */
  clearAttention(actor: Actor, slot?: string): void {
    let any = false
    for (const key of [...this.attention.keys()]) {
      if (key === `${actor}:${slot}` || (!slot && key.startsWith(`${actor}:`))) {
        this.attention.delete(key)
        any = true
      }
    }
    if (any) this.emit({ type: "attention", actor })
  }

  /** Everything pointed at now, lapsed ones dropped. */
  attentionNow(): Attention[] {
    const t = this.now()
    const out: Attention[] = []
    for (const [key, a] of this.attention) {
      if (a.until !== undefined && a.until <= t) this.attention.delete(key)
      else out.push(a)
    }
    return out
  }

  attentionOf(actor: Actor): Attention[] {
    return this.attentionNow().filter((a) => a.actor === actor)
  }

  // --- marks -------------------------------------------------------------------------

  marks(surface: string): Mark[] {
    return [...(this.marksBy.get(surface) ?? [])]
  }

  /** Keep a note on a part of a surface. */
  mark(anchor: Anchor, text: string, by: Actor): Mark {
    const entry = this.surfaces.get(anchor.surface)
    let resource = anchor.resource
    if (!resource) {
      try {
        resource = entry?.adapter.observe().resource
      } catch {
        resource = undefined
      }
    }
    const m: Mark = {
      id: this.newId("mark"),
      anchor: { ...anchor, ...(resource ? { resource } : {}) },
      by,
      text,
      at: new Date(this.now()).toISOString(),
      state: "open",
    }
    this.marksBy.set(anchor.surface, [...(this.marksBy.get(anchor.surface) ?? []), m])
    this.emit({ type: "marks", surface: anchor.surface })
    return m
  }

  settleMark(surface: string, id: string, state: Mark["state"] | "removed"): boolean {
    const list = this.marksBy.get(surface) ?? []
    const i = list.findIndex((m) => m.id === id)
    if (i < 0) return false
    const next = [...list]
    if (state === "removed") next.splice(i, 1)
    else next[i] = { ...(next[i] as Mark), state }
    this.marksBy.set(surface, next)
    this.emit({ type: "marks", surface })
    return true
  }

  /** Give the hub marks kept elsewhere (a document's, loaded from its store). */
  loadMarks(surface: string, marks: Mark[]): void {
    this.marksBy.set(surface, [...marks])
    this.detachMarks(surface, true)
    this.emit({ type: "marks", surface })
  }

  /** A mark whose part can no longer be found is detached; it is kept, and says so. */
  private detachMarks(surface: string, quiet = false) {
    const list = this.marksBy.get(surface)
    const adapter = this.surfaces.get(surface)?.adapter
    if (!list?.length || !adapter) return
    let view: ReturnType<SurfaceAdapter["observe"]>
    try {
      view = adapter.observe()
    } catch {
      return
    }
    let changed = false
    const next = list.map((m) => {
      const t = m.anchor.target
      if (!t || !view.targets) return m
      const there = view.targets.some((x) => x.kind === t.kind && x.id === t.id)
      if (there === !m.detached) return m
      changed = true
      return { ...m, detached: !there }
    })
    if (!changed) return
    this.marksBy.set(surface, next)
    if (!quiet) this.emit({ type: "marks", surface })
  }

  // --- the guide ---------------------------------------------------------------------

  guideState(): GuideState | null {
    return this.guide
  }

  /** Begin a guide. One runs at a time: starting one stops the last. */
  startGuide(guide: Guide, controller: Actor = "agent"): GuideState {
    if (!this.surfaces.has(guide.surface))
      throw new Error(`There is no surface "${guide.surface}" to guide on.`)
    if (!guide.steps.length) throw new Error("A guide needs at least one step.")
    const adapter = this.surfaces.get(guide.surface)?.adapter
    let checks: string[] | undefined
    try {
      checks = adapter?.observe().checks?.map((c) => c.name)
    } catch {
      checks = undefined
    }
    const ids = new Set<string>()
    for (const s of guide.steps) {
      if (s.await?.kind === "state" && checks && !checks.includes(s.await.check))
        throw new Error(
          `Step "${s.id}" waits on "${s.await.check}", which this surface cannot check. It can check: ${checks.join(", ") || "nothing"}.`,
        )
      if (!s.id || ids.has(s.id)) throw new Error("Each step of a guide needs its own id.")
      ids.add(s.id)
      if (s.await?.kind === "state" && !this.surfaces.get(guide.surface)?.adapter.check)
        throw new Error(
          `Step "${s.id}" waits on "${s.await.check}", and this surface has no checks.`,
        )
    }
    this.guide = { guide, index: 0, status: "running", controller, history: [] }
    this.enterStep("started")
    return this.guide
  }

  /** Take up a guide kept from before. Anchors are found again; a done step is skipped. */
  restoreGuide(state: GuideState): GuideState | null {
    if (!this.surfaces.has(state.guide.surface)) return null
    if (state.status === "done" || state.status === "stopped") return null
    this.guide = { ...state, history: [...state.history] }
    this.showStep()
    this.emitGuide("restored")
    if (this.guide.status === "running") this.guideCheck()
    return this.guide
  }

  /** The person's (or the author's) say over the guide. */
  guideDo(
    what: "next" | "back" | "skip" | "pause" | "resume" | "takeover" | "stop" | "restart_step",
    by: Actor = "user",
  ): GuideState | null {
    const g = this.guide
    if (!g || g.status === "done" || g.status === "stopped") return g
    const step = g.guide.steps[g.index] as GuideStep
    switch (what) {
      case "pause":
        if (g.status !== "running") return g
        this.guide = { ...g, status: "paused" }
        this.clearAttention("agent", "guide")
        this.emitGuide("paused")
        return this.guide
      case "resume":
        if (g.status !== "paused") return g
        this.guide = { ...g, status: "running", offPath: undefined }
        this.showStep()
        this.emitGuide("resumed")
        this.guideCheck()
        return this.guide
      case "takeover":
        // The person carries on by themselves: the guide waits where it is.
        this.guide = { ...g, status: "paused", controller: "user" }
        this.clearAttention("agent", "guide")
        this.emitGuide("paused")
        return this.guide
      case "stop":
        this.guide = { ...g, status: "stopped" }
        this.clearAttention("agent", "guide")
        this.emitGuide("stopped")
        return this.guide
      case "restart_step":
        this.guide = { ...g, status: "running", offPath: undefined }
        this.enterStep("step")
        return this.guide
      case "back": {
        if (g.index === 0) return g
        this.guide = {
          ...g,
          index: g.index - 1,
          status: "running",
          offPath: undefined,
          history: [...g.history, { step: step.id, how: "back", at: this.stamp() }],
        }
        this.enterStep("step")
        return this.guide
      }
      case "next":
      case "skip": {
        // "next" is the person's go-ahead on a step that waits for it; on a step that waits
        // for something real it is a skip, and is recorded as one.
        const how =
          what === "skip" || (step.await && step.await.kind !== "ack") ? "skipped" : "done"
        this.advance(how, by)
        return this.guide
      }
    }
  }

  private stamp() {
    return new Date(this.now()).toISOString()
  }

  private emitGuide(what: GuideEventKind) {
    this.emit({ type: "guide", what, state: this.guide })
  }

  private showStep() {
    const g = this.guide
    if (!g || g.status !== "running") return
    const step = g.guide.steps[g.index] as GuideStep
    if (step.anchors?.length)
      this.attend({
        actor: "agent",
        style: step.style ?? "highlight",
        anchors: step.anchors,
        from: step.from,
        note: undefined,
        slot: "guide",
      })
    else this.clearAttention("agent", "guide")
  }

  private enterStep(what: GuideEventKind) {
    const g = this.guide
    if (!g) return
    let rev: string | undefined
    try {
      rev = this.surfaces.get(g.guide.surface)?.adapter.observe().resource?.rev
    } catch {
      rev = undefined
    }
    this.guide = { ...g, revAtStep: rev }
    this.showStep()
    this.emitGuide(what)
    // A step may already be true when it begins (the person was ahead of the guide).
    this.guideCheck()
  }

  private advance(how: "done" | "skipped", _by: Actor) {
    const g = this.guide
    if (!g) return
    const step = g.guide.steps[g.index] as GuideStep
    const history = [...g.history, { step: step.id, how, at: this.stamp() }]
    if (g.index + 1 >= g.guide.steps.length) {
      this.guide = { ...g, status: "done", history, offPath: undefined }
      this.clearAttention("agent", "guide")
      this.emitGuide("done")
      return
    }
    this.guide = { ...g, index: g.index + 1, status: "running", history, offPath: undefined }
    this.enterStep("step")
  }

  /**
   * See whether the step the guide is on has been met: by what is true of the surface, or
   * by what the person just did. Called after every change and every action.
   */
  private guideCheck(after?: ActionResult) {
    const g = this.guide
    if (!g || g.status !== "running") return
    const step = g.guide.steps[g.index] as GuideStep
    const wait = step.await
    if (!wait || wait.kind === "ack") return
    if (after && after.surface !== g.guide.surface) return
    if (wait.kind === "state") {
      const adapter = this.surfaces.get(g.guide.surface)?.adapter
      let met = false
      try {
        met = !!adapter?.check?.(wait.check, wait.args ?? {})
      } catch {
        met = false
      }
      if (met) this.advance("done", "user")
      else if (after && after.actor === "user" && after.outcome === "applied") this.offPath(after)
      return
    }
    // wait.kind === "action"
    if (!after || after.actor !== "user" || after.outcome !== "applied") return
    if ((!wait.action || wait.action === after.action) && inputMatches(wait.input, after.input))
      this.advance("done", "user")
    else this.offPath(after)
  }

  private offPath(after: ActionResult) {
    const g = this.guide
    if (!g) return
    this.guide = { ...g, offPath: { action: after.action, at: after.at } }
    this.emitGuide("off_path")
  }
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

export const createHub = (opts?: HubOptions) => new Hub(opts)
