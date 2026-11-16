/**
 * A conversation with an agent host, kept outside any interface framework: a run goes on,
 * and the page's tools keep answering it, whether or not anything is showing it. Whatever
 * draws it subscribes.
 *
 * The page declares its tools with each message and runs them itself when the model calls
 * one; the host only relays (contracts/agent-host.md).
 */
import {
  type Decision,
  type HostApi,
  HostError,
  type HostOptions,
  type HostState,
  hostApi,
  type Level,
  type StoredMessage,
  type StreamEvent,
} from "./wire.js"

/** A picture a tool hands back with its text (the model sees it). */
export interface ToolImage {
  media_type: "image/jpeg" | "image/png" | "image/webp"
  /** base64, without a data: prefix. */
  data: string
}

const PICTURES = Symbol.for("ade.pictures")
interface Pictured {
  [PICTURES]: ToolImage[]
  text: unknown
}

/** What a tool returns to show the model something: what it says, and the pictures. */
export const withImages = (text: unknown, images: ToolImage[]): unknown =>
  ({ [PICTURES]: images, text }) as Pictured

/** A tool the page offers the model and runs itself. */
export interface PageTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  level: Level
  /** The call in one plain line, for the permission question and the call's row. */
  describe?: (input: Record<string, unknown>) => string
  /** Returns what the model is told. Throw to report a failure. */
  run: (
    input: Record<string, unknown>,
    ctx: { signal: AbortSignal; correlation?: string },
  ) => unknown | Promise<unknown>
}

export type Item =
  | { kind: "user"; id: string; text: string; context?: unknown; auto?: string }
  | { kind: "text"; id: string; text: string }
  | {
      kind: "tool"
      id: string
      name: string
      input?: unknown
      result?: string
      isError?: boolean
      running: boolean
    }
  | { kind: "notice"; id: string; text: string; tone: "error" | "quiet" }

export interface Approval {
  run: string
  id: string
  tool: string
  input: unknown
  description?: string
  /** "This session" and "Always" are on offer (not for a tool that asks every time). */
  standing: boolean
}

export interface Session {
  state: HostState | null
  loaded: boolean
  items: Item[]
  /** The run being answered, when there is one. */
  run: string | null
  /** A question waiting for the person. */
  approval: Approval | null
  error: string
}

export interface SessionOptions extends HostOptions {
  /** The tools on offer now. Asked with every message, so the list can change. */
  tools: () => PageTool[]
  /** What the person is looking at, sent with each message for the model to see. */
  context?: () => unknown | Promise<unknown>
  /** A host made elsewhere (for tests). */
  api?: HostApi
  /** The keys a host puts on a call for the page to run. Default "ade"; "basalisk" also accepted. */
  ext?: string[]
}

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

function fromStored(messages: StoredMessage[], skipRun: string): Item[] {
  const items: Item[] = []
  const tools = new Map<string, Extract<Item, { kind: "tool" }>>()
  for (const m of messages) {
    if (m.role === "user" && typeof m.meta?.text === "string") {
      if (typeof m.meta.auto === "string" && m.meta.auto)
        items.push({ kind: "user", id: m.id, text: "", auto: m.meta.auto })
      else items.push({ kind: "user", id: m.id, text: m.meta.text, context: m.meta.context })
      continue
    }
    // The run still going is rebuilt from its event stream, not from what is stored so far.
    if (skipRun && m.run_id === skipRun) continue
    m.blocks.forEach((b, i) => {
      if (b.type === "text" && b.text)
        items.push({ kind: "text", id: `${m.id}:${i}`, text: b.text })
      else if (b.type === "tool_use" && b.id) {
        const item = {
          kind: "tool" as const,
          id: b.id,
          name: b.name ?? "",
          input: b.input,
          running: false,
        }
        tools.set(b.id, item)
        items.push(item)
      } else if (b.type === "tool_result" && b.tool_use_id) {
        const call = tools.get(b.tool_use_id)
        if (call) {
          call.result = b.content ?? ""
          call.isError = !!b.is_error
        }
      }
    })
  }
  return items
}

export function createAgentSession(opts: SessionOptions) {
  const api = opts.api ?? hostApi(opts)
  const prefixes = opts.ext ?? ["ade", "basalisk"]
  /** This page, to the host: the one that runs the tools of the runs it starts. */
  const client = id()
  /** Calls this page has already run, so a replayed stream does not run them again. */
  const ran = new Set<string>()
  let session: Session = {
    state: null,
    loaded: false,
    items: [],
    run: null,
    approval: null,
    error: "",
  }
  const listeners = new Set<() => void>()
  const set = (patch: Partial<Session>) => {
    session = { ...session, ...patch }
    for (const fn of [...listeners]) fn()
  }
  const patchItem = (itemId: string, change: (item: Item) => Item) =>
    set({ items: session.items.map((it) => (it.id === itemId ? change(it) : it)) })
  let following: AbortController | null = null
  const inFlight = new Map<string, AbortController>()
  let onRunEnd: ((run: string, how: string) => void) | null = null

  async function runTool(name: string, input: unknown, signal: AbortSignal, correlation: string) {
    const tool = opts.tools().find((t) => t.name === name)
    if (!tool) return { content: `This page has no tool named "${name}".`, isError: true }
    try {
      let out = await tool.run((input ?? {}) as Record<string, unknown>, { signal, correlation })
      let images: ToolImage[] | undefined
      if (out && typeof out === "object" && PICTURES in out) {
        images = (out as Pictured)[PICTURES]
        out = (out as Pictured).text
      }
      return {
        content: typeof out === "string" ? out : JSON.stringify(out ?? "done"),
        isError: false,
        images,
      }
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), isError: true }
    }
  }

  /**
   * Run a call for the host, saying "still at it" every few seconds so a call that waits is
   * not given up on. When the run stops waiting, the call is aborted and its result not sent.
   */
  async function execute(run: string, call: string, name: string, input: unknown) {
    const control = new AbortController()
    inFlight.set(call, control)
    const beat = setInterval(() => {
      api.toolAlive(run, call).catch((err) => {
        if (err instanceof HostError && (err.status === 409 || err.status === 404)) control.abort()
      })
    }, 10_000)
    try {
      const out = await runTool(name, input, control.signal, run)
      if (!control.signal.aborted)
        await api.toolResult(run, call, out.content, out.isError, out.images).catch(() => undefined)
    } finally {
      clearInterval(beat)
      inFlight.delete(call)
    }
  }

  /** Load the thread, and pick up a run that is still going. Safe to call more than once. */
  async function start() {
    if (session.loaded) return
    try {
      const state = await api.state()
      if (!state.available) {
        set({ state, loaded: true })
        return
      }
      const loaded = await api.thread()
      set({ state, loaded: true, items: fromStored(loaded.messages, loaded.active_run), error: "" })
      if (loaded.active_run) void follow(loaded.active_run)
    } catch (err) {
      set({
        loaded: true,
        error: err instanceof Error ? err.message : "The agent could not be reached.",
      })
    }
  }

  /**
   * Send a message. With `auto`, it is one the application wrote and the person did not type
   * (a guide ended): the label is shown in its place.
   */
  async function send(text: string, how: { auto?: string } = {}): Promise<boolean> {
    if (session.run || !text.trim()) return false
    let context: unknown
    try {
      context = await opts.context?.()
    } catch {
      context = undefined
    }
    const temp = `pending:${Date.now()}`
    set({
      items: [
        ...session.items,
        how.auto
          ? { kind: "user", id: temp, text: "", auto: how.auto }
          : { kind: "user", id: temp, text: text.trim(), context },
      ],
      error: "",
    })
    try {
      const { run_id } = await api.turn({
        text,
        client_id: client,
        ...(context !== undefined ? { context } : {}),
        tools: opts
          .tools()
          .map(({ name, description, input_schema, level }) => ({
            name,
            description,
            input_schema,
            level,
          })),
        ...(how.auto ? { auto: how.auto } : {}),
      })
      void follow(run_id)
      return true
    } catch (err) {
      set({
        items: session.items.filter((it) => it.id !== temp),
        error: err instanceof HostError ? err.message : "The message could not be sent.",
      })
      return false
    }
  }

  function stop() {
    // First, so a call that is waiting cannot go on to change anything.
    for (const c of inFlight.values()) c.abort()
    if (session.run) void api.cancel(session.run).catch(() => undefined)
  }

  async function answer(decision: Decision) {
    const q = session.approval
    if (!q) return
    set({ approval: null })
    await api.approve(q.run, q.id, decision).catch(() => undefined)
  }

  /** Put the thread away and start a new one. */
  async function newThread() {
    if (session.run) return
    try {
      await api.newThread()
      set({ items: [], error: "" })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "A new conversation could not be started.",
      })
    }
  }

  const ext = (ev: StreamEvent, key: string): unknown => {
    for (const p of prefixes) {
      const v = ev.ext?.[`${p}.${key}`]
      if (v !== undefined) return v
    }
    return undefined
  }

  async function follow(run: string) {
    following?.abort()
    const control = new AbortController()
    following = control
    set({ run, approval: null })
    // Part ids are the run's own; an item's id carries the run so two runs never collide.
    const key = (part: string) => `${run}:${part}`
    const kinds = new Map<string, string>()
    let ended = "lost"
    const note = (itemId: string, text: string, tone: "error" | "quiet") => {
      if (session.items.some((it) => it.id === itemId))
        patchItem(itemId, (it) => (it.kind === "notice" ? { ...it, text } : it))
      else set({ items: [...session.items, { kind: "notice", id: itemId, tone, text }] })
    }
    const onEvent = (ev: StreamEvent) => {
      switch (ev.verb) {
        case "part.start": {
          if (!ev.part_id) break
          kinds.set(ev.part_id, ev.kind ?? "")
          if (ev.kind === "text")
            set({ items: [...session.items, { kind: "text", id: key(ev.part_id), text: "" }] })
          else if (ev.kind === "tool_call")
            set({
              items: [
                ...session.items,
                {
                  kind: "tool",
                  id: key(ev.part_id),
                  name: String(ev.meta?.name ?? ""),
                  running: true,
                },
              ],
            })
          else if (ev.kind === "tool_result") {
            const call = key(String(ev.meta?.call_id ?? ""))
            kinds.set(ev.part_id, `result:${call}`)
            patchItem(call, (it) =>
              it.kind === "tool"
                ? { ...it, running: false, result: "", isError: ev.meta?.is_error === true }
                : it,
            )
          }
          break
        }
        case "part.delta": {
          if (!ev.part_id || !ev.text) break
          const kind = kinds.get(ev.part_id) ?? ""
          const add = ev.text
          if (kind === "text")
            patchItem(key(ev.part_id), (it) =>
              it.kind === "text" ? { ...it, text: it.text + add } : it,
            )
          else if (kind.startsWith("result:"))
            patchItem(kind.slice(7), (it) =>
              it.kind === "tool" ? { ...it, result: (it.result ?? "") + add } : it,
            )
          break
        }
        case "part.end": {
          if (!ev.part_id || kinds.get(ev.part_id) !== "tool_call") break
          patchItem(key(ev.part_id), (it) => (it.kind === "tool" ? { ...it, input: ev.final } : it))
          const call = ext(ev, "call")
          // Only the page that sent the message runs its tools, and each call once.
          if (ext(ev, "exec") !== "client" || ext(ev, "client") !== client) break
          if (typeof call !== "string" || !call || ran.has(call)) break
          ran.add(call)
          const item = session.items.find((it) => it.id === key(ev.part_id ?? ""))
          void execute(run, call, item?.kind === "tool" ? item.name : "", ev.final)
          break
        }
        case "approval.request":
          if (ev.approval_id && ev.descriptor)
            set({
              approval: {
                run,
                id: ev.approval_id,
                tool: ev.descriptor.tool,
                input: ev.descriptor.input,
                description: ev.descriptor.description,
                standing: ev.descriptor.standing !== false,
              },
            })
          break
        case "activity": {
          const what = (ev.kind ?? "").replace(/^[a-z]+\./, "")
          if (what === "approval" && session.approval?.id === ev.value?.approval_id)
            set({ approval: null })
          else if (what === "compact" && typeof ev.value?.state === "string")
            note(
              key("compact"),
              ev.value.state === "start"
                ? "Summarising the older part of this conversation for the model…"
                : ev.value.state === "done"
                  ? "The older part of this conversation was summarised for the model. Every message is still here."
                  : "The conversation could not be shortened this time.",
              "quiet",
            )
          break
        }
        case "run.error":
          ended = "error"
          note(key("error"), ev.message || "The agent could not finish.", "error")
          break
        case "run.abort":
          ended = "abort"
          note(key("abort"), "Stopped.", "quiet")
          break
        case "run.finish":
          ended = "finish"
          if (ev.reason === "turn_limit" || ev.reason === "length")
            note(
              key("limit"),
              ev.reason === "length"
                ? "The answer was cut off at the length limit."
                : "Stopped after many steps. Say “continue” to go on.",
              "quiet",
            )
          break
      }
    }
    try {
      await api.follow(run, onEvent, control.signal)
    } catch {
      if (!control.signal.aborted)
        set({ error: "The connection to the agent was lost. Reload to pick it up." })
    }
    // The run is over: nothing it asked this page to do may still change anything.
    for (const c of inFlight.values()) c.abort()
    if (following === control) {
      following = null
      set({
        run: null,
        approval: null,
        items: session.items.map((it) =>
          it.kind === "tool" && it.running ? { ...it, running: false } : it,
        ),
      })
      onRunEnd?.(run, ended)
    }
  }

  /** Read the thread again: after its run ended somewhere this session was not following. */
  async function reload() {
    if (session.run) return
    try {
      const loaded = await api.thread()
      set({ items: fromStored(loaded.messages, loaded.active_run) })
      if (loaded.active_run) void follow(loaded.active_run)
    } catch {
      // Left as it was.
    }
  }

  /** The call in a line, when its tool can say. */
  function describeCall(name: string, input: unknown): string {
    try {
      return (
        opts
          .tools()
          .find((t) => t.name === name)
          ?.describe?.((input ?? {}) as Record<string, unknown>) ?? ""
      )
    } catch {
      return ""
    }
  }

  return {
    client,
    get: () => session,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    start,
    send,
    stop,
    answer,
    newThread,
    reload,
    describeCall,
    /** Told when a run this session followed has ended: "finish", "error", "abort" or "lost". */
    onRunEnd: (fn: ((run: string, how: string) => void) | null) => {
      onRunEnd = fn
    },
  }
}

export type AgentSession = ReturnType<typeof createAgentSession>
