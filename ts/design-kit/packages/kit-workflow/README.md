# @hollis-labs/kit-workflow

Private `0.0.0`, unpublished. Controlled workflow canvas primitives vendored from
[AI Elements 1.9.0](https://github.com/vercel/ai-elements/tree/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd).
The host owns graph data, changes, execution, persistence and inspectors.

## Opt in

Every rendering export lives under `/canvas`. The root entry is deliberately empty
and loads no renderer. Install the optional peer `@xyflow/react` (`^12.10.1`) when
using `/canvas`; React Flow remains external to the bundle so the host and kit share
one provider/store instance. React/ReactDOM 19, Tailwind 4 and design-components'
Base UI/lucide peers must also be supplied by the host.

```tsx
import { Canvas, Node, NodeHeader, NodeTitle, Controls, Panel } from '@hollis-labs/kit-workflow/canvas'
```

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-workflow/canvas.css";
/* Optional motion, separately and explicitly installed: */
@import "@hollis-labs/kit-workflow/keyframes.css";
```

`canvas.css` explicitly imports React Flow's structural `base.css`, registers the
kit's compiled class strings through `source.css`, and bridges the public `--xy-*`
variables to the token contract. No component imports CSS from JavaScript.
The equivalent manual Tailwind registration is
`@source "../node_modules/@hollis-labs/kit-workflow/dist/**/*.js";` (adjust relative
to your stylesheet). Scanning source during development? Register `src/**/*.tsx`.

Set `[data-theme]` / `[data-mode]` on the document root (`<html>`). The contract's
`--color-*` aliases used by hand-written CSS are root-scoped; a theme on a subtree
changes Tailwind utilities but does not rebind these CSS aliases. Nested palette
previews therefore need separate documents. React Flow's `colorMode` does not
select a design-kit theme. The bridge overrides its light and
dark defaults. Backgrounds, edges, markers, handles, selection, default nodes,
labels, attribution, controls, minimap and resize chrome use contract tokens.
Scale uses Tailwind spacing/type/radius variables. Caller-provided styles,
Background/MiniMap color props and marker colors should name tokens too.
Do not import React Flow's `style.css` after the bridge: its appearance rules would
compete with the kit. Give Canvas a parent with a definite height.

## Components

| Export | Purpose |
| --- | --- |
| `Canvas` / `CanvasProps<N, E>` | Generic React Flow props and callbacks; fit-view, scroll panning and drag selection defaults. `background={false}` removes its background; `backgroundProps` customizes it. |
| `Node` / `NodeProps` | Shared Card with `{ target, source }` handles. Optional `targetHandleProps` / `sourceHandleProps` supply IDs, positions and connection flags. |
| `NodeHeader`, `NodeTitle`, `NodeDescription`, `NodeAction`, `NodeContent`, `NodeFooter` | Shared Card slots retaining upstream names; token surfaces and panel radius. |
| `Edge.Animated` | Bézier edge with optional moving dot. Uses React Flow's resolved coordinates, so multiple handles and top/bottom ports work. Forwards caller markers/style. |
| `Edge.Temporary` | Dashed Bézier edge; forwards caller markers/style. |
| `Connection` | Token-styled drag preview and endpoint; invalid connections use `danger`. |
| `Controls` | Token-styled React Flow zoom/fit/interactivity controls; caller callbacks/options pass through. |
| `Panel` | Token-styled viewport panel; positions, children and attributes pass through. |
| `Toolbar` | Token-styled node toolbar; defaults below a node. Visibility, node IDs and position pass through. |

Each component's prop type is exported from `/canvas`. React Flow's graph types
remain imported from `@xyflow/react`; the visual `Node` and `Edge` exports are
components, rather than graph data types.

```tsx
const nodeTypes = {
  step: ({ data }) => (
    <Node handles={{ target: true, source: true }}>
      <NodeHeader><NodeTitle>{data.label}</NodeTitle></NodeHeader>
    </Node>
  ),
}

// nodes/edges and every mutation callback come from the host.
<Canvas nodes={nodes} edges={edges} nodeTypes={nodeTypes}
  onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}>
  <Controls />
  <Panel position="top-right">Host inspector</Panel>
</Canvas>
```

For read-only run inspection, set `nodesDraggable={false}`,
`nodesConnectable={false}`, `deleteKeyCode={null}` and `edgesReconnectable={false}`;
use `<Controls showInteractive={false} />`. Selection/click callbacks can still
open the host's inspector. The kit introduces no workflow wire types or execution
semantics. Hadron's draft authoring and run diagnostics informed the API; Hadron
was inspected read-only and is not migrated here.

Motion is off without `keyframes.css`. That file installs namespaced CSS
animations; reduced-motion preferences stop dashes and hide moving dots while
preserving edges. No framer-motion, AI SDK or network fetching is added.

## Demo and checks

From the repository root, after installing and building sibling packages:

```sh
npm run demo -w @hollis-labs/kit-workflow
npm run demo:build -w @hollis-labs/kit-workflow
npm run test:run -w @hollis-labs/kit-workflow
npm run typecheck -w @hollis-labs/kit-workflow
npm run lint -w @hollis-labs/kit-workflow
```

The demo includes all seven component families, editing/read-only controls,
selection toolbar, minimap and all ten themes in both modes. Tests use the real
React Flow provider/renderer and geometry helpers; jsdom measurements are stubbed
because it has no layout engine. Browser evidence checks layout, zoom, selection,
read-only flags and reduced motion. The repository's five gates remain required.

## Provenance

Files carry pinned upstream source URLs and divergences;
[the upstream inventory](docs/upstream-versions.md) records all nine derived files,
including both edge variants. Card/cn come from the
shared design-components package (its primitives use Base UI), with no new Radix
implementation. Upstream's implicit CSS, raw appearance and SMIL motion were
replaced; animated edges use resolved coordinates instead of looking up only the
first left/right handles. See `LICENSE` for Hollis Labs MIT and the complete Vercel Apache-2.0 notice and
terms. Node/Card use existing design-components exports; no shadcn-derived source
is copied into this package.
