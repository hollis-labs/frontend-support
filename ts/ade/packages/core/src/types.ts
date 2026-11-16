/**
 * The contract between a person, an agent and an application working over the same state.
 *
 * A surface is one thing on screen that both can refer to (a board, a document, a canvas).
 * An observation is what it looks like now. An anchor points at a part of it. An action
 * changes it and always comes back with an explicit outcome. Attention is who is pointing
 * at what right now; it is transient, and separate from marks, which are kept.
 *
 * Nothing here depends on the DOM, on React or on a model: an application implements
 * SurfaceAdapter, and everything else is built on that.
 */

/** Who did something. */
export type Actor = "user" | "agent"

/**
 * How much an action changes, which decides whether the person is asked first.
 * "read" looks. "act" changes what is on screen and is undone as easily. "write" changes
 * data or reaches outside. "confirm" is asked every time, with no standing answer.
 */
export type Level = "read" | "act" | "write" | "confirm"

/** The thing a surface shows, and which revision of it: what an anchor or action is about. */
export interface ResourceRef {
  /** A stable name for the resource: a URL, a caster:// ref, an id the application owns. */
  ref: string
  /** The revision now. It changes whenever the resource's content changes. */
  rev: string
}

/** A part of a surface by its meaning: a chess square, a diagram node, a clip. */
export interface TargetRef {
  kind: string
  id: string
}

/** A rectangle. In an anchor it is a fraction of the surface (0 to 1); resolved, it is pixels. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * What something points at. One surface, the revision it was made against, and one or more
 * ways of finding the part: by meaning (target), by its words (quote), by lines, by a region
 * of the picture, by a page, by a stretch of time. An application reads the ones it knows.
 */
export interface Anchor {
  surface: string
  resource?: ResourceRef
  target?: TargetRef
  quote?: { text: string; prefix?: string; suffix?: string }
  lines?: { start: number; end?: number }
  region?: Rect
  page?: number
  time?: { start: number; end?: number }
  /** A few words for a person or a model: "the knight on f3". */
  label?: string
}

/** A part of the surface the application names in an observation. */
export interface Target extends TargetRef {
  label?: string
  /** What is true of it now, in the application's own terms. */
  state?: Record<string, unknown>
}

/** Something that can be done on a surface. */
export interface ActionSpec {
  name: string
  description: string
  /** JSON Schema for the input. */
  input_schema: Record<string, unknown>
  level: Level
}

/** Something that can be asked of a surface by name: true or false, now. */
export interface CheckSpec {
  name: string
  description: string
  /** JSON Schema for its arguments, when it takes any. */
  args_schema?: Record<string, unknown>
}

/** A kept note on a part of a surface, as against attention, which passes. */
export interface Mark {
  id: string
  anchor: Anchor
  by: Actor
  text: string
  at: string
  state: "open" | "done"
  /** True when the part it points at is no longer there (the resource changed under it). */
  detached?: boolean
}

/** What a surface is, for a list. */
export interface SurfaceInfo {
  id: string
  /** The application or the kind of surface: "chess", "diagram". Used to name its tools. */
  app: string
  title?: string
}

/**
 * A surface as it is at one moment. `epoch` counts changes to the view (what is laid out
 * where); `resource.rev` counts changes to the content. Something observed against an old
 * epoch or revision is stale and says so when used.
 */
export interface Observation {
  id: string
  surface: string
  app: string
  title?: string
  at: string
  epoch: number
  resource?: ResourceRef
  /** The state in a few lines of plain text, for a model or a screen reader. */
  summary?: string
  /** The state as data, in the application's own shape. */
  state?: unknown
  targets?: Target[]
  actions: ActionSpec[]
  checks?: CheckSpec[]
  /** What the person has selected or is pointing at, now. */
  selection?: Anchor[]
  marks?: Mark[]
}

/** A request to change a surface. */
export interface ActionRequest {
  /** The call's id, unique to this request. */
  id: string
  /** Ties it to what asked for it: a run, a guide step. */
  correlation?: string
  actor: Actor
  surface: string
  action: string
  input: Record<string, unknown>
  /** Refuse unless the surface is still at this revision and epoch. */
  expect?: { rev?: string; epoch?: number }
}

/**
 * How an action ended. "applied": it happened. "rejected": it did not, and nothing changed.
 * "cancelled": it was stopped; that is not a promise that nothing changed. "unknown": it may
 * or may not have happened, so look before trying again.
 */
export type Outcome = "applied" | "rejected" | "cancelled" | "unknown"

/** Why an action was rejected. */
export type RejectCode = "stale" | "invalid" | "denied" | "unavailable" | "failed"

export interface ActionResult {
  id: string
  correlation?: string
  surface: string
  action: string
  /** What it was asked with. */
  input: Record<string, unknown>
  actor: Actor
  outcome: Outcome
  code?: RejectCode
  /** In words, for whoever asked. */
  reason?: string
  /** The surface after: its revision and epoch. */
  resource?: ResourceRef
  epoch: number
  /** What the application gives back. */
  data?: unknown
  at: string
}

/** What an application's act() returns: the outcome and what goes with it. */
export interface ActOutcome {
  outcome: Outcome
  code?: RejectCode
  reason?: string
  data?: unknown
}

/** What a surface says about itself when observed. */
export interface SurfaceView {
  title?: string
  resource?: ResourceRef
  summary?: string
  state?: unknown
  targets?: Target[]
  actions: ActionSpec[]
  /** What can be asked of the surface by name (SurfaceAdapter.check): what a guide can wait on. */
  checks?: CheckSpec[]
}

/** What an action is given besides its input. */
export interface ActContext {
  actor: Actor
  /** Aborted when whoever asked has stopped waiting. Check it before changing anything late. */
  signal: AbortSignal
  correlation?: string
}

/**
 * What an application implements to put a surface in front of a person and an agent.
 * observe() and act() are the whole of it; the rest is optional.
 */
export interface SurfaceAdapter {
  info: SurfaceInfo
  /** The surface now. Called often: keep it cheap. */
  observe(): SurfaceView
  /** Do an action. Throwing is taken as "rejected, failed" with the error's message. */
  act(
    action: string,
    input: Record<string, unknown>,
    ctx: ActContext,
  ): ActOutcome | Promise<ActOutcome>
  /**
   * Where an anchor is on screen now, in viewport pixels; null when it is not on screen or
   * no longer exists. Without it nothing can be drawn at an anchor.
   */
  resolve?(anchor: Anchor): Rect | null
  /** Where the whole surface is on screen now, in viewport pixels. A spotlight dims inside it. */
  bounds?(): Rect | null
  /**
   * Whether something named is true of the surface now (a guide's "the knight is on f3").
   * The application owns the truth: a guide moves on when this says so, not when a model does.
   */
  check?(name: string, args: Record<string, unknown>): boolean
  /**
   * Whether the surface has this part. For a surface with too many parts to list in every
   * observation (a board's squares, a long document's lines).
   */
  has?(target: TargetRef): boolean
  /** Describe an anchor in a few words, when it has no label of its own. */
  describe?(anchor: Anchor): string
}

/** How attention is drawn. */
export type AttentionStyle = "select" | "highlight" | "spotlight" | "arrow" | "cursor"

/**
 * Who is pointing at what, now. It passes: it is never stored, and never sent anywhere as a
 * stream. A person's selection replaces their last; an agent's highlight lasts until it is
 * cleared, replaced or expires.
 */
export interface Attention {
  actor: Actor
  style: AttentionStyle
  anchors: Anchor[]
  /** For an arrow: where it starts. */
  from?: Anchor
  /** A few words shown with it. */
  note?: string
  /** When it lapses (ms since epoch). Absent: until replaced. */
  until?: number
  seq: number
}

/** What a guide step waits for before the next. */
export type GuideAwait =
  /** The person says to go on. */
  | { kind: "ack" }
  /** The person does this action (any, when no action is named), with this input if given. */
  | { kind: "action"; action?: string; input?: Record<string, unknown> }
  /** Something becomes true of the surface (SurfaceAdapter.check). */
  | { kind: "state"; check: string; args?: Record<string, unknown> }

export interface GuideStep {
  id: string
  /** What the person is told at this step. */
  say: string
  /** What is pointed at while it is said. */
  anchors?: Anchor[]
  style?: Exclude<AttentionStyle, "select" | "cursor">
  from?: Anchor
  /**
   * Something the guide does itself when it reaches this step, as the agent: the other
   * side's reply, a demonstration. If it is refused the guide pauses and says why.
   */
  do?: { action: string; input?: Record<string, unknown> }
  /** What it waits for. Absent: the person says to go on. */
  await?: GuideAwait
  /** Shown if the person asks for a hint, or does something else. */
  hint?: string
}

export interface Guide {
  id: string
  title: string
  surface: string
  steps: GuideStep[]
}

export type GuideStatus = "running" | "paused" | "done" | "stopped"

/**
 * Where a guide stands. It is plain data: keep it anywhere and give it back to resume.
 * `revAtStep` is the surface's revision when the step began, so a resumed guide can tell
 * that things moved while it was away.
 */
export interface GuideState {
  guide: Guide
  index: number
  status: GuideStatus
  /** Who is driving: the guide's author, or the person who took over. */
  controller: Actor
  revAtStep?: string
  history: { step: string; how: "done" | "skipped" | "back"; at: string }[]
  /** Set when the person did something other than what the step waits for. */
  offPath?: { action: string; at: string }
  /** Steps whose own action has been done, so going back or resuming does not do it twice. */
  did?: string[]
  /** Set when a step's own action was refused: the guide is paused on it. */
  stalled?: { step: string; reason: string }
}

/** What the hub tells its listeners. */
export type HubEvent =
  | { type: "surfaces"; seq: number }
  | { type: "changed"; seq: number; surface: string }
  | { type: "attention"; seq: number; actor: Actor }
  | { type: "action"; seq: number; result: ActionResult }
  | { type: "marks"; seq: number; surface: string }
  | { type: "guide"; seq: number; what: GuideEventKind; state: GuideState | null }

export type GuideEventKind =
  | "started"
  | "step"
  | "paused"
  | "resumed"
  | "off_path"
  | "stalled"
  | "done"
  | "stopped"
  | "restored"
