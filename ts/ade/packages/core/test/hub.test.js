import assert from "node:assert/strict"
import { test } from "node:test"
import { adeTools, at, createHub } from "../dist/index.js"

/** A tiny surface: three lamps that can be switched, and a counter that can break. */
function lamps() {
  const on = { a: false, b: false, c: false }
  let rev = 1
  const adapter = {
    info: { id: "lamps-1", app: "lamps", title: "Lamps" },
    observe: () => ({
      resource: { ref: "lamps://1", rev: String(rev) },
      summary: Object.entries(on)
        .map(([k, v]) => `${k} ${v ? "on" : "off"}`)
        .join(", "),
      state: { ...on },
      targets: Object.keys(on).map((id) => ({ kind: "lamp", id, state: { on: on[id] } })),
      actions: [
        {
          name: "switch",
          description: "Switch a lamp.",
          level: "act",
          input_schema: {
            type: "object",
            properties: { lamp: { type: "string" } },
            required: ["lamp"],
          },
        },
        { name: "smash", description: "Fails.", level: "write", input_schema: { type: "object" } },
        {
          name: "half",
          description: "Changes, then fails.",
          level: "write",
          input_schema: { type: "object" },
        },
      ],
      checks: [{ name: "lit", description: "A lamp is on." }],
    }),
    act: (action, input) => {
      if (action === "smash") throw new Error("it would not break")
      if (action === "half") {
        on.a = !on.a
        rev++
        throw new Error("it stopped half way")
      }
      if (!(input.lamp in on))
        return { outcome: "rejected", code: "invalid", reason: `no lamp ${input.lamp}` }
      on[input.lamp] = !on[input.lamp]
      rev++
      return { outcome: "applied", data: { on: on[input.lamp] } }
    },
    check: (name, args) => name === "lit" && on[args.lamp] === true,
    resolve: (anchor) => (anchor.target ? { x: 1, y: 2, w: 3, h: 4 } : null),
  }
  return { adapter, on }
}

test("an action comes back with an explicit outcome", async () => {
  const hub = createHub()
  const { adapter } = lamps()
  hub.register(adapter)
  const o = hub.observe("lamps-1")
  assert.equal(o.resource.rev, "1")
  assert.equal(o.epoch, 1)

  const ok = await hub.act({
    actor: "user",
    surface: "lamps-1",
    action: "switch",
    input: { lamp: "a" },
    expect: { rev: "1" },
  })
  assert.equal(ok.outcome, "applied")
  assert.equal(ok.resource.rev, "2")
  assert.deepEqual(ok.data, { on: true })

  const stale = await hub.act({
    actor: "agent",
    surface: "lamps-1",
    action: "switch",
    input: { lamp: "b" },
    expect: { rev: "1" },
  })
  assert.equal(stale.outcome, "rejected")
  assert.equal(stale.code, "stale")
  assert.equal(hub.observe("lamps-1").state.b, false, "a stale action changes nothing")

  const bad = await hub.act({ actor: "agent", surface: "lamps-1", action: "dance", input: {} })
  assert.equal(bad.code, "invalid")
  const failed = await hub.act({ actor: "agent", surface: "lamps-1", action: "smash", input: {} })
  assert.equal(failed.outcome, "rejected")
  assert.equal(failed.code, "failed")
  const half = await hub.act({ actor: "agent", surface: "lamps-1", action: "half", input: {} })
  assert.equal(
    half.outcome,
    "unknown",
    "it threw after changing something: nobody may assume it did not happen",
  )
  const gone = await hub.act({ actor: "agent", surface: "nowhere", action: "switch", input: {} })
  assert.equal(gone.code, "unavailable")

  const stopped = new AbortController()
  stopped.abort()
  const cancelled = await hub.act(
    { actor: "agent", surface: "lamps-1", action: "switch", input: { lamp: "c" } },
    stopped.signal,
  )
  assert.equal(cancelled.outcome, "cancelled")
  assert.equal(hub.observe("lamps-1").state.c, false)
})

test("a view change makes an old epoch stale", async () => {
  const hub = createHub()
  const handle = hub.register(lamps().adapter)
  const epoch = hub.observe("lamps-1").epoch
  handle.moved()
  const r = await hub.act({
    actor: "agent",
    surface: "lamps-1",
    action: "switch",
    input: { lamp: "a" },
    expect: { epoch },
  })
  assert.equal(r.code, "stale")
})

test("attention passes, and repeating it makes no noise", () => {
  let t = 1000
  const hub = createHub({ now: () => t })
  hub.register(lamps().adapter)
  let events = 0
  hub.subscribe((e) => e.type === "attention" && events++)
  hub.attend({ actor: "user", style: "select", anchors: [at("lamps-1", "lamp", "a")] })
  hub.attend({ actor: "user", style: "select", anchors: [at("lamps-1", "lamp", "a")] })
  assert.equal(events, 1, "the same selection again is not an event")
  assert.equal(
    hub.observe("lamps-1").selection[0].target.id,
    "a",
    "the agent sees what the person selected",
  )
  hub.attend({ actor: "user", style: "select", anchors: [at("lamps-1", "lamp", "b")] })
  assert.equal(hub.attentionOf("user").length, 1, "a selection replaces the last")
  hub.attend({
    actor: "agent",
    style: "highlight",
    anchors: [at("lamps-1", "lamp", "c")],
    ttl: 500,
    slot: "point",
  })
  assert.equal(hub.attentionNow().length, 2)
  t += 600
  assert.equal(hub.attentionOf("agent").length, 0, "it lapsed")
  assert.deepEqual(hub.resolve(at("lamps-1", "lamp", "a")), { x: 1, y: 2, w: 3, h: 4 })
})

test("a guide moves on when the surface says so", async () => {
  const hub = createHub()
  const { adapter } = lamps()
  hub.register(adapter)
  const seen = []
  hub.subscribe((e) => e.type === "guide" && seen.push(e.what))
  hub.startGuide({
    id: "g1",
    title: "Lamps",
    surface: "lamps-1",
    steps: [
      { id: "s1", say: "These are lamps.", anchors: [at("lamps-1", "lamp", "a")] },
      {
        id: "s2",
        say: "Switch on b.",
        await: { kind: "state", check: "lit", args: { lamp: "b" } },
      },
      {
        id: "s3",
        say: "Now switch c.",
        await: { kind: "action", action: "switch", input: { lamp: "c" } },
      },
      { id: "s4", say: "Done." },
    ],
  })
  assert.equal(
    hub.attentionOf("agent")[0].anchors[0].target.id,
    "a",
    "the step's part is pointed at",
  )
  hub.guideDo("next")
  assert.equal(hub.guideState().index, 1)

  await hub.act({ actor: "user", surface: "lamps-1", action: "switch", input: { lamp: "a" } })
  assert.equal(hub.guideState().index, 1, "the wrong lamp does not move it on")
  assert.equal(hub.guideState().offPath.action, "switch")
  await hub.act({ actor: "agent", surface: "lamps-1", action: "switch", input: { lamp: "b" } })
  assert.equal(hub.guideState().index, 2, "the state became true, whoever did it")

  await hub.act({ actor: "agent", surface: "lamps-1", action: "switch", input: { lamp: "c" } })
  assert.equal(hub.guideState().index, 2, "an action step waits for the person, not the agent")

  // Kept and taken up again: it resumes where it was.
  const kept = JSON.parse(JSON.stringify(hub.guideState()))
  const again = createHub()
  again.register(adapter)
  assert.equal(again.restoreGuide(kept).index, 2)
  await again.act({ actor: "user", surface: "lamps-1", action: "switch", input: { lamp: "c" } })
  assert.equal(again.guideState().index, 3)
  again.guideDo("back")
  assert.equal(again.guideState().index, 2)
  again.guideDo("skip")
  again.guideDo("next")
  assert.equal(again.guideState().status, "done")
  assert.deepEqual(
    again.guideState().history.map((h) => h.how),
    ["done", "done", "done", "back", "skipped", "done"],
  )
  assert.equal(again.attentionOf("agent").length, 0, "nothing is left pointed at")
  assert.ok(seen.includes("off_path") && seen.includes("step"))
})

test("a step already true when it begins is passed", () => {
  const hub = createHub()
  const { adapter, on } = lamps()
  on.b = true
  hub.register(adapter)
  hub.startGuide({
    id: "g",
    title: "t",
    surface: "lamps-1",
    steps: [
      {
        id: "s1",
        say: "Switch on b.",
        await: { kind: "state", check: "lit", args: { lamp: "b" } },
      },
      { id: "s2", say: "Good." },
    ],
  })
  assert.equal(hub.guideState().index, 1)
})

test("pause, take over and stop", () => {
  const hub = createHub()
  hub.register(lamps().adapter)
  hub.startGuide({
    id: "g",
    title: "t",
    surface: "lamps-1",
    steps: [
      { id: "s1", say: "a", anchors: [at("lamps-1", "lamp", "a")] },
      { id: "s2", say: "b" },
    ],
  })
  hub.guideDo("takeover")
  assert.equal(hub.guideState().status, "paused")
  assert.equal(hub.guideState().controller, "user")
  assert.equal(hub.attentionOf("agent").length, 0)
  hub.guideDo("resume")
  assert.equal(hub.attentionOf("agent").length, 1)
  hub.guideDo("stop")
  assert.equal(hub.guideState().status, "stopped")
})

test("marks are kept, and say when their part has gone", () => {
  const hub = createHub()
  const { adapter } = lamps()
  const handle = hub.register(adapter)
  const m = hub.mark(at("lamps-1", "lamp", "c"), "flickers", "user")
  assert.equal(m.anchor.resource.rev, "1", "a mark records the revision it was made against")
  const view = adapter.observe
  adapter.observe = () => ({ ...view(), targets: view().targets.filter((t) => t.id !== "c") })
  handle.changed()
  assert.equal(hub.marks("lamps-1")[0].detached, true)
  assert.equal(hub.settleMark("lamps-1", m.id, "done"), true)
})

test("the agent's tools", async () => {
  const hub = createHub()
  hub.register(lamps().adapter)
  const tools = Object.fromEntries(adeTools(hub).map((t) => [t.name, t]))
  const ctx = { signal: new AbortController().signal }
  assert.equal(tools.lamps_switch.level, "act")
  assert.equal(
    tools.lamps_smash.level,
    "write",
    "a surface action keeps its level, so the person is asked",
  )
  hub.attend({ actor: "user", style: "select", anchors: [at("lamps-1", "lamp", "b")] })
  const seen = await tools.ade_look.run({}, ctx)
  assert.equal(seen.selection[0].target.id, "b")

  const done = await tools.lamps_switch.run({ lamp: "b", rev: "1" }, ctx)
  assert.equal(done.outcome, "applied")
  assert.equal(done.rev, "2")
  await assert.rejects(() => tools.lamps_switch.run({ lamp: "b", rev: "1" }, ctx), /stale/)
  await assert.rejects(() => tools.lamps_switch.run({ lamp: "z" }, ctx), /no lamp z/)

  await tools.ade_point.run({ targets: [{ kind: "lamp", id: "a" }], note: "this one" }, ctx)
  assert.equal(hub.attentionOf("agent")[0].note, "this one")
  assert.throws(
    () => tools.ade_point.run({ targets: [{ kind: "lamp", id: "q" }] }, ctx),
    /no lamp "q"/,
  )
  assert.throws(
    () => tools.ade_point.run({ targets: [{ kind: "lamp", id: "a" }], style: "arrow" }, ctx),
    /from/,
  )

  const g = await tools.ade_guide_start.run(
    {
      title: "Lamps",
      steps: [
        {
          say: "Switch on c.",
          targets: [{ kind: "lamp", id: "c" }],
          wait: { kind: "state", check: "lit", args: { lamp: "c" } },
        },
        { say: "Good." },
      ],
    },
    ctx,
  )
  assert.equal(g.step, 1)
  await hub.act({ actor: "user", surface: "lamps-1", action: "switch", input: { lamp: "c" } })
  assert.equal((await tools.ade_guide_status.run({}, ctx)).step, 2)
  assert.throws(
    () =>
      tools.ade_guide_start.run(
        { title: "x", steps: [{ say: "y", wait: { kind: "state", check: "nope" } }] },
        ctx,
      ),
    /./,
  )
})

test("an action that completes a step is not held against the next one", async () => {
  const hub = createHub()
  const { adapter } = lamps()
  const handle = hub.register(adapter)
  // The application tells the hub of its own changes, as a real one does, while it acts.
  const act = adapter.act
  adapter.act = (action, input, ctx) => {
    const out = act(action, input, ctx)
    handle.changed()
    return out
  }
  hub.startGuide({
    id: "g",
    title: "t",
    surface: "lamps-1",
    steps: [
      {
        id: "s1",
        say: "Switch on b.",
        await: { kind: "state", check: "lit", args: { lamp: "b" } },
      },
      {
        id: "s2",
        say: "Now c.",
        await: { kind: "action", action: "switch", input: { lamp: "c" } },
      },
      { id: "s3", say: "Done." },
    ],
  })
  await hub.act({ actor: "user", surface: "lamps-1", action: "switch", input: { lamp: "b" } })
  assert.equal(hub.guideState().index, 1)
  assert.equal(
    hub.guideState().offPath,
    undefined,
    "the move that finished step 1 is not a wrong move for step 2",
  )
})

test("a step can do its own part, once", async () => {
  const hub = createHub()
  const { adapter, on } = lamps()
  hub.register(adapter)
  const tools = Object.fromEntries(adeTools(hub).map((t) => [t.name, t]))
  const ctx = { signal: new AbortController().signal }
  tools.ade_guide_start.run(
    {
      title: "Turns",
      steps: [
        { say: "Switch on a.", wait: { kind: "state", check: "lit", args: { lamp: "a" } } },
        { say: "I switch on b.", do: { action: "lamps_switch", input: { lamp: "b" } } },
        { say: "I try a lamp that is not there.", do: { action: "switch", input: { lamp: "z" } } },
      ],
    },
    ctx,
  )
  await hub.act({ actor: "user", surface: "lamps-1", action: "switch", input: { lamp: "a" } })
  await new Promise((r) => setTimeout(r, 5))
  assert.equal(hub.guideState().index, 1)
  assert.equal(on.b, true, "the guide did its own part")
  hub.guideDo("back")
  hub.guideDo("next")
  await new Promise((r) => setTimeout(r, 5))
  assert.equal(on.b, true, "and does not do it again on coming back to the step")
  assert.equal(hub.guideState().index, 2, "the last step tried its own part")
  assert.equal(hub.guideState().status, "paused")
  assert.match(hub.guideState().stalled.reason, /no lamp z/)
  assert.throws(
    () =>
      tools.ade_guide_start.run({ title: "x", steps: [{ say: "y", do: { action: "fly" } }] }, ctx),
    /does not do/,
  )
})
