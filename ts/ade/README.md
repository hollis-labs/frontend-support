# ADE

Shared packages for applications where a person, an agent and the application work over
the same state: what is on screen, what each is pointing at, what can be done, and how a
guided walk-through moves on.

It is not an agent runtime, a data store, a workflow engine or a game engine. An application
keeps its own state and rules and says how it is a **surface**; ADE gives the person and
the agent one way to look at it, point at it, act on it and be guided through it.

## The idea in one screen

```ts
// 1. The application says how it is a surface.
const surface: SurfaceAdapter = {
  info: { id: "board", app: "chess" },
  observe: () => ({ resource: { ref, rev }, summary, state, actions, checks }),
  act: (action, input) => ({ outcome: "applied" | "rejected", ... }),
  check: (name, args) => true | false,      // what a guide can wait on
  resolve: (anchor) => rectOnScreen,        // where a part is, to draw at it
}

// 2. One hub holds surfaces, attention, marks and the guide.
const hub = createHub()
hub.register(surface)

// 3. The agent gets tools over the hub: look, point, mark, guide, and each surface's actions.
const tools = adeTools(hub)   // ade_look, ade_point, ade_guide_start, chess_move, ...
```

- **Observation**: the surface now, with its revision. Something acted on against an old
  revision is refused as stale, with a reason.
- **Anchor**: a pointer at a part (a square, a node, lines, a region, a time range).
- **Action**: always ends with an explicit outcome: applied, rejected (why), cancelled or
  unknown. It is never assumed.
- **Attention**: who is pointing at what right now. It passes; it is never stored.
- **Mark**: a kept note on a part. It says when its part has gone.
- **Guide**: steps that say something, point, optionally do something, and wait. A step that
  waits for a move goes on when the application says the move happened, not when a model
  says so. The person can go back, skip, pause, take over or stop; it survives a reload.

## What is here

| Path | What |
|---|---|
| `packages/core` | `@hollis-labs/ade-core`: the contract, the hub, the agent's tools. No DOM, no React. |
| `packages/agent` | `@hollis-labs/ade-agent`: the page's side of a conversation with an agent host. The page declares its tools with each message and runs them itself. |
| `packages/react` | `@hollis-labs/ade-react`: `useSurface`, the attention layer (rings, spotlight, arrows; takes no input), the guide bar, a plain agent panel. |
| `go/agenthost` | The server's side of that conversation, for an application with no agent host of its own. |
| `contracts/` | The wire between page and host, in words. |
| `examples/chess-tutor` | A second consumer: a board, a guide and a tutor over one game. |

Consumers today: Basalisk (its Diagram window, on a branch) and the chess tutor. A Folio
preset (`app-ade`) that generates a consumer is in progress.

## Status

Early. Built and used locally; not published. What is checked and how is in each package's
tests and in `examples/chess-tutor/README.md`. Not started: screen capture and pointer or
keyboard control with grants, terminal sessions, media anchors beyond the types.

## Develop

    npm install && npm run build && npm test
    (cd go/agenthost && go vet ./... && go test ./...)

`AGENTS.md` has the rules of the repository.
