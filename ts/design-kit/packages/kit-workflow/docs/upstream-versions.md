# kit-workflow upstream versions

Ports follow [the shared vendoring convention](../../design-components/docs/vendoring.md).
Pin: ai-elements 1.9.0 at `6a9d5b1822ffb10bba4bd97175f01edd7d8651cd` (2026-08-21),
vendored 2026-10-02. The file-level URLs below all identify that exact revision.
Primary sources are the local provenance headers and the pinned upstream tree;
this inventory records source already taken, with no new port or pin change.

| Local source | Upstream source at pin | Vendored | Divergences |
| --- | --- | --- | --- |
| `src/components/canvas.tsx` | [packages/elements/src/canvas.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/canvas.tsx) | 2026-10-02 | Controlled generic graph props; explicit stylesheet opt-in; token-scoped class; configurable background. |
| `src/components/connection.tsx` | [packages/elements/src/connection.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/connection.tsx) | 2026-10-02 | Raw SVG stroke/endpoint values moved to token CSS; expose validation status. |
| `src/components/controls.tsx` | [packages/elements/src/controls.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/controls.tsx) | 2026-10-02 | Shared cn; contract surfaces, radius and spacing; caller options retained. |
| `src/components/edge.tsx` | [packages/elements/src/edge.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/edge.tsx) | 2026-10-02 | Split upstream edge implementations into local modules; Edge retains Animated/Temporary names. |
| `src/components/edge-animated.tsx` | [packages/elements/src/edge.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/edge.tsx) | 2026-10-02 | Animated implementation extracted; resolved handle coordinates/positions and caller markers/style; token CSS motion, opt-in keyframes and reduced-motion fallback instead of SMIL. |
| `src/components/edge-temporary.tsx` | [packages/elements/src/edge.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/edge.tsx) | 2026-10-02 | Temporary implementation extracted; resolved coordinates/positions and caller markers/style; token CSS dashed edge. |
| `src/components/node.tsx` | [packages/elements/src/node.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/node.tsx) | 2026-10-02 | Shared Base UI-compatible Card/cn; contract radius; visible handles; host-supplied handle IDs/positions for custom graphs. |
| `src/components/panel.tsx` | [packages/elements/src/panel.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/panel.tsx) | 2026-10-02 | Shared cn; contract surfaces, radius and spacing; caller options retained. |
| `src/components/toolbar.tsx` | [packages/elements/src/toolbar.tsx](https://github.com/vercel/ai-elements/blob/6a9d5b1822ffb10bba4bd97175f01edd7d8651cd/packages/elements/src/toolbar.tsx) | 2026-10-02 | Shared cn; contract surfaces, radius and spacing; caller options retained. |

All nine component files are Vercel Apache-2.0 ports, covered by the
`src/components` scope in the package [LICENSE](../LICENSE), with Hollis Labs
MIT first and the full Apache notice/terms retained. Upstream has no NOTICE file
at this pin. The two edge implementations and their aggregation module each
trace to the same upstream `edge.tsx`; they are not separate upstream files.

Shared Card/cn are imports from design-components; no shadcn source is copied
into this package. Original styles, entry barrels, demo and tests remain
Hollis Labs MIT. No AI SDK, execution semantics or wire types are introduced.
