# Changelog

## Unreleased — 0.0.0 (private)

- Add opt-in `/canvas`: Canvas with generic controlled React Flow props and
  configurable Background; Node/Card slots with custom handle IDs/positions;
  Edge.Animated and Edge.Temporary with resolved handle geometry; Connection
  preview; Controls, Panel and Toolbar. Preserve upstream names.
- Add explicit token bridge `canvas.css`, Tailwind registration `source.css`,
  and separate motion opt-in `keyframes.css` with reduced-motion fallback.
- Vendor AI Elements 1.9.0 at 6a9d5b1 with provenance and license notices.
  Reuse shared Base UI-compatible primitives; no AI SDK, Radix or framer-motion.
- Add renderer/geometry tests and a standalone controlled demo across the ten
  built-in themes, light/dark, editing and run inspection. Hadron remains unchanged.
- Register private package and optional React Flow peer in a separate maintainer
  skeleton PR. Root entry remains empty and does not load the renderer.
