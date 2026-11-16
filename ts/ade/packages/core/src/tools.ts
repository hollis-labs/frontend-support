/**
 * The hub as tools for an agent. Whatever runs the model (it is not this package's
 * business) is given these: looking at a surface, each surface's own actions, pointing,
 * keeping a note, and running a guide. A tool is a name, a description, a JSON Schema, a
 * level (which decides whether the person is asked first) and a function.
 *
 * The list follows the hub: call adeTools again when surfaces come and go.
 */
import type { Hub } from "./hub.js"
import type {
  Anchor,
  AttentionStyle,
  Guide,
  GuideAwait,
  GuideStep,
  Level,
  TargetRef,
} from "./types.js"

export interface ToolContext {
  /** Aborted when the run has stopped waiting for this call. */
  signal: AbortSignal
  /** Ties what the tool does to the run that asked. */
  correlation?: string
}

export interface AdeTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  level: Level
  /** The call in one plain line, for a permission question or a log. */
  describe?: (input: Record<string, unknown>) => string
  /** Returns what the model is told. Throws to report a failure. */
  run: (input: Record<string, unknown>, ctx: ToolContext) => unknown | Promise<unknown>
}

export interface AdeToolOptions {
  /** Put in front of the general tools' names. Default "ade". */
  prefix?: string
}

const str = (description: string) => ({ type: "string", description })
const targetSchema = {
  type: "object",
  properties: { kind: str("The kind of part, as the surface names it."), id: str("Its id.") },
  required: ["kind", "id"],
  additionalProperties: false,
}

export function adeTools(hub: Hub, opts: AdeToolOptions = {}): AdeTool[] {
  const p = opts.prefix ?? "ade"
  const surfaces = hub.list()
  if (!surfaces.length) return []
  const only = surfaces.length === 1 ? (surfaces[0]?.id as string) : ""
  const surfaceProp = str(
    only
      ? `The surface. There is one now ("${only}"), so this can be left out.`
      : `The surface: one of ${surfaces.map((s) => `"${s.id}"`).join(", ")}.`,
  )
  const pick = (input: Record<string, unknown>, app?: string): string => {
    if (typeof input.surface === "string" && input.surface) {
      if (!hub.has(input.surface)) throw new Error(`There is no surface "${input.surface}".`)
      return input.surface
    }
    const of = app ? hub.list().filter((s) => s.app === app) : hub.list()
    if (of.length === 1) return (of[0] as { id: string }).id
    if (!of.length) throw new Error("That surface is not open now.")
    throw new Error(`Say which surface: ${of.map((s) => `"${s.id}"`).join(", ")}.`)
  }
  const anchors = (surface: string, list: unknown): Anchor[] =>
    (Array.isArray(list) ? list : [])
      .filter((t): t is TargetRef => !!t && typeof t.kind === "string" && typeof t.id === "string")
      .map((t) => ({ surface, target: { kind: t.kind, id: t.id } }))
  const named = (list: Anchor[]) => list.map((a) => hub.describe(a)).join(", ")

  const tools: AdeTool[] = [
    {
      name: `${p}_look`,
      level: "read",
      description:
        "See a surface as it is now: its state, the parts you can point at (targets), what the person has selected or is pointing at (selection), the notes kept on it (marks), what you can do (actions) and its revision. Look before you act or point, and again after anything changes: what you saw earlier may be stale.",
      input_schema: {
        type: "object",
        properties: { surface: surfaceProp },
        additionalProperties: false,
      },
      describe: () => "Look at the surface",
      run: (input) => {
        const o = hub.observe(pick(input))
        const guide = hub.guideState()
        return {
          ...o,
          ...(guide && guide.guide.surface === o.surface ? { guide: guideBrief(hub) } : {}),
        }
      },
    },
    {
      name: `${p}_point`,
      level: "act",
      description:
        "Show the person what you mean: draw on the surface at one or more of its parts while you explain. style is highlight (outline the parts), spotlight (dim everything else) or arrow (from one part to another: give from). note is a few words shown beside it. It stays until you point at something else, clear it, or seconds pass. Point at the thing you are talking about instead of describing where it is.",
      input_schema: {
        type: "object",
        properties: {
          surface: surfaceProp,
          targets: {
            type: "array",
            items: targetSchema,
            minItems: 1,
            description: "The parts to point at.",
          },
          style: { type: "string", enum: ["highlight", "spotlight", "arrow"] },
          from: { ...targetSchema, description: "For an arrow: the part it starts from." },
          note: str("A few words shown with it."),
          seconds: { type: "number", description: "How long it stays. Left out: until replaced." },
        },
        required: ["targets"],
        additionalProperties: false,
      },
      describe: (input) =>
        `Point at ${Array.isArray(input.targets) ? input.targets.length : 0} part(s)`,
      run: (input) => {
        const surface = pick(input)
        const list = anchors(surface, input.targets)
        if (!list.length)
          throw new Error("Give at least one target: {kind, id}, as the surface lists them.")
        const missing = list.filter((a) => !hub.hasTarget(surface, a.target as TargetRef))
        if (missing.length)
          throw new Error(
            `The surface has no ${missing.map((a) => `${a.target?.kind} "${a.target?.id}"`).join(", ")}. Look at it for the parts it has.`,
          )
        const style =
          (["highlight", "spotlight", "arrow"] as const).find((s) => s === input.style) ??
          "highlight"
        const from = anchors(surface, input.from ? [input.from] : [])[0]
        if (style === "arrow" && !from)
          throw new Error("An arrow needs from: the part it starts at.")
        hub.attend({
          actor: "agent",
          style: style as AttentionStyle,
          anchors: list,
          from,
          note: typeof input.note === "string" ? input.note.slice(0, 200) : undefined,
          ttl:
            typeof input.seconds === "number" && input.seconds > 0
              ? input.seconds * 1000
              : undefined,
          slot: "point",
        })
        return { pointing_at: named(list), style }
      },
    },
    {
      name: `${p}_clear`,
      level: "act",
      description: "Stop pointing: take your highlight, spotlight or arrow off the surface.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      describe: () => "Stop pointing",
      run: () => {
        hub.clearAttention("agent", "point")
        return "cleared"
      },
    },
    {
      name: `${p}_mark`,
      level: "act",
      description:
        "Keep a note on a part of the surface, for the person to see and come back to. Unlike pointing, a mark stays until it is settled. Use it for something worth keeping (a mistake to revisit, an idea), not for what you are saying right now.",
      input_schema: {
        type: "object",
        properties: { surface: surfaceProp, target: targetSchema, text: str("The note. Short.") },
        required: ["target", "text"],
        additionalProperties: false,
      },
      describe: () => "Keep a note on the surface",
      run: (input) => {
        const surface = pick(input)
        const a = anchors(surface, [input.target])[0]
        if (!a || typeof input.text !== "string" || !input.text.trim())
          throw new Error("Give a target and the note's text.")
        const m = hub.mark(a, input.text.trim().slice(0, 2000), "agent")
        return { mark: m.id, on: hub.describe(a) }
      },
    },
    {
      name: `${p}_guide_start`,
      level: "act",
      description:
        "Walk the person through something step by step, on the surface. Each step says something, may point at parts, and may wait: for the person to say go on (ack), for them to do an action (action, optionally with the input you expect), or for something to become true of the surface (state: one of the surface's checks). The guide moves on by itself when the real state says the step is met, not when you think it is; the person can pause, go back, skip or take over. Write every step before you start: you are not asked between steps. You are told when it ends or when the person does something else. One guide runs at a time.",
      input_schema: {
        type: "object",
        properties: {
          surface: surfaceProp,
          title: str("What the guide is, in a few words."),
          steps: {
            type: "array",
            minItems: 1,
            maxItems: 24,
            items: {
              type: "object",
              properties: {
                say: str("What the person is told at this step. One or two sentences."),
                targets: {
                  type: "array",
                  items: targetSchema,
                  description: "Parts to point at while it is said.",
                },
                style: { type: "string", enum: ["highlight", "spotlight", "arrow"] },
                from: targetSchema,
                wait: {
                  type: "object",
                  description: "What the step waits for. Left out: the person says go on.",
                  properties: {
                    kind: { type: "string", enum: ["ack", "action", "state"] },
                    action: str("For action: the action's name. Left out: any action."),
                    input: {
                      type: "object",
                      description: "For action: the input you expect (a partial match).",
                    },
                    check: str("For state: the name of one of the surface's checks."),
                    args: { type: "object", description: "For state: the check's arguments." },
                  },
                  required: ["kind"],
                  additionalProperties: false,
                },
                do: {
                  type: "object",
                  description:
                    "Something the guide does itself when it reaches this step, with one of the surface's actions: the other side's reply, a demonstration. It is done once, then the step waits as usual. If it is refused the guide pauses and you are told.",
                  properties: {
                    action: str(
                      "The action's name, as the surface lists it (without the application's prefix).",
                    ),
                    input: { type: "object" },
                  },
                  required: ["action"],
                  additionalProperties: false,
                },
                hint: str("Shown if the person asks for a hint or does something else."),
              },
              required: ["say"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "steps"],
        additionalProperties: false,
      },
      describe: (input) => `Start a guide: ${typeof input.title === "string" ? input.title : ""}`,
      run: (input, ctx) => {
        const surface = pick(input)
        const raw = Array.isArray(input.steps) ? (input.steps as Record<string, unknown>[]) : []
        const seen = hub.observe(surface)
        const own = (d: GuideStep["do"], i: number): GuideStep["do"] => {
          if (!d) return undefined
          // The model knows the action by its tool's name (chess_move); the surface by its own.
          const name = d.action.startsWith(`${seen.app}_`)
            ? d.action.slice(seen.app.length + 1)
            : d.action
          if (!seen.actions.some((a) => a.name === name))
            throw new Error(
              `Step ${i + 1} does "${d.action}", which this surface does not do. It does: ${seen.actions.map((a) => a.name).join(", ")}.`,
            )
          return { ...d, action: name }
        }
        const steps: GuideStep[] = raw.map((s, i) => {
          const wait = s.wait as Record<string, unknown> | undefined
          let await_: GuideAwait | undefined
          if (wait?.kind === "action")
            await_ = {
              kind: "action",
              ...(typeof wait.action === "string" ? { action: wait.action } : {}),
              ...(wait.input && typeof wait.input === "object"
                ? { input: wait.input as Record<string, unknown> }
                : {}),
            }
          else if (wait?.kind === "state") {
            if (typeof wait.check !== "string")
              throw new Error(`Step ${i + 1} waits on a state but names no check.`)
            await_ = {
              kind: "state",
              check: wait.check,
              args: (wait.args as Record<string, unknown>) ?? {},
            }
          } else if (wait?.kind === "ack") await_ = { kind: "ack" }
          const style = (["highlight", "spotlight", "arrow"] as const).find((x) => x === s.style)
          return {
            id: `s${i + 1}`,
            say: String(s.say ?? "").slice(0, 600),
            anchors: anchors(surface, s.targets),
            ...(style ? { style } : {}),
            ...(s.from ? { from: anchors(surface, [s.from])[0] } : {}),
            ...(doOf(s.do) ? { do: own(doOf(s.do), i) } : {}),
            ...(await_ ? { await: await_ } : {}),
            ...(typeof s.hint === "string" ? { hint: s.hint.slice(0, 300) } : {}),
          }
        })
        const guide: Guide = {
          id: ctx.correlation ? `guide_${ctx.correlation}` : `guide_${Date.now().toString(36)}`,
          title: String(input.title ?? "Guide").slice(0, 120),
          surface,
          steps,
        }
        hub.startGuide(guide, "agent")
        return guideBrief(hub)
      },
    },
    {
      name: `${p}_guide_status`,
      level: "read",
      description:
        "Where the guide stands: which step it is on, what each earlier step ended as (done, skipped), whether it is paused, and whether the person did something other than what the step waits for.",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      describe: () => "Check the guide",
      run: () => guideBrief(hub) ?? "No guide is running.",
    },
    {
      name: `${p}_guide_stop`,
      level: "act",
      description:
        "End the guide that is running (to start a better one, or because the person asked).",
      input_schema: { type: "object", properties: {}, additionalProperties: false },
      describe: () => "Stop the guide",
      run: () => {
        hub.guideDo("stop", "agent")
        return "stopped"
      },
    },
  ]

  // Each surface's own actions, one tool each, named for the application: chess_move.
  const seen = new Set<string>()
  for (const s of surfaces) {
    let view: ReturnType<Hub["observe"]>
    try {
      view = hub.observe(s.id)
    } catch {
      continue
    }
    for (const a of view.actions) {
      const name = `${s.app}_${a.name}`.replace(/[^a-zA-Z0-9_]/g, "_")
      if (seen.has(name)) continue
      seen.add(name)
      const schema = a.input_schema as { properties?: Record<string, unknown> }
      const several = surfaces.filter((x) => x.app === s.app).length > 1
      tools.push({
        name,
        level: a.level,
        description: `${a.description} It comes back with an outcome: applied (it happened), or a refusal with the reason. Give rev (the revision you last saw) to have it refused if the surface has changed since.`,
        input_schema: {
          ...a.input_schema,
          type: "object",
          properties: {
            ...(schema.properties ?? {}),
            ...(several ? { surface: str(`Which ${s.app} surface.`) } : {}),
            rev: str("The surface's revision when you last looked. Optional."),
          },
        },
        describe: (input) => `${s.app}: ${a.name} ${JSON.stringify(strip(input)).slice(0, 120)}`,
        run: async (input, ctx) => {
          const surface = pick(input, s.app)
          const r = await hub.act(
            {
              actor: "agent",
              surface,
              action: a.name,
              input: strip(input),
              correlation: ctx.correlation,
              ...(typeof input.rev === "string" && input.rev ? { expect: { rev: input.rev } } : {}),
            },
            ctx.signal,
          )
          if (r.outcome === "rejected" || r.outcome === "cancelled")
            throw new Error(
              `${r.outcome}${r.code ? ` (${r.code})` : ""}: ${r.reason ?? "no reason given"}`,
            )
          return {
            outcome: r.outcome,
            ...(r.reason ? { note: r.reason } : {}),
            ...(r.resource ? { rev: r.resource.rev } : {}),
            ...(r.data !== undefined ? { data: r.data } : {}),
          }
        },
      })
    }
  }
  return tools
}

/** A step's own action, as the model wrote it (the application's prefix is forgiven). */
function doOf(raw: unknown): GuideStep["do"] | undefined {
  const d = raw as { action?: unknown; input?: unknown } | undefined
  if (!d || typeof d.action !== "string" || !d.action) return undefined
  return {
    action: d.action,
    ...(d.input && typeof d.input === "object"
      ? { input: d.input as Record<string, unknown> }
      : {}),
  }
}

const strip = ({ rev: _rev, surface: _surface, ...rest }: Record<string, unknown>) => rest

/** The guide as an agent is told it. */
function guideBrief(hub: Hub) {
  const g = hub.guideState()
  if (!g) return null
  const step = g.guide.steps[g.index]
  return {
    title: g.guide.title,
    status: g.status,
    step: g.index + 1,
    of: g.guide.steps.length,
    ...(g.status === "running" || g.status === "paused"
      ? { on: step?.say, waits_for: step?.await ?? { kind: "ack" } }
      : {}),
    history: g.history.map((h) => `${h.step}: ${h.how}`),
    ...(g.controller === "user"
      ? { note: "The person took over; it waits for them to resume." }
      : {}),
    ...(g.stalled ? { stalled: `The step's own action was refused: ${g.stalled.reason}` } : {}),
    ...(g.offPath
      ? { off_path: `The person did "${g.offPath.action}" instead of what this step waits for.` }
      : {}),
  }
}
