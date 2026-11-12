# Radius alias merge review — CW-20261002-0002

**Option A chosen by Chrispian 2026-10-02 (delegated).**

Button `xs`, `sm`, `icon-xs` and `icon-sm` already declare `rounded-control`.
Before this change, `cn()` retains that class beside the base `rounded-lg`;
CSS order gives the base radius priority: 8px in contract CSS and 9px in the
dashboard theme. Registering the exported radius tokens in tailwind-merge's
existing radius theme makes the variants render the 6px they declare.
The existing radius/corner groups, modifiers and last-argument semantics remain.

## Decision

| Option | Consequence |
| --- | --- |
| A — fix `cn()` (this proposed diff) | Declared control overrides work; ungrouped small Buttons become 6px. Ship the visible change in the next design-components minor. |
| B — change variants to declare today's rendering | Small Buttons retain today's look, but consumer `rounded-control` overrides stay silently ineffective: a latent defect remains. |
| C — fix `cn()` and explicitly retain today's small Button radius | Button appearance stays as today; caller overrides begin working. A single explicit class must account for contract CSS's 8px versus dashboard CSS's 9px. |

No versions, dependency ranges, tokens, root configuration, or kit-chat production
code changes here. Kit-chat now imports the shared helper after PR #48. Internal ranges move together at a future release. The
kit-settings explicit token-variable workaround already renders 6px.

## Evidence

The authored source at `e789ecd` was scanned across all packages and demos,
then mounted and measured before production edits. The initial sample found
19 consumer demo instances that change: dashboard gallery (6), theme gallery
(1), overview (1), operations (1), account access (3), observe observed (1),
observe refresh-error (5), and chat history (1). These are sampled instances,
not a count of every affected consumer. Shared public small Button variants
also affect unopened dialog/sheet, transfer, chat-card, retry and copy actions.
External applications are outside this task.

The expanded capture uses **actual baseline and patched source**, never a DOM
simulation, at 1440 and 390 pixels in `sysop-p4-white` dark and `dir-b` light.
Both contract and dashboard CSS are included. All four computed corner radii
are recorded; comparison images use identical 1100px-high viewport crops,
with the chat history scrolled to its Load older messages action. The refreshed
fixture adds settings, observe and chat card/composer/stream/markdown states.
See the current-main refresh and cause inventory in the evidence index; the
initial capture is historical evidence, not the current acceptance set.

See [evidence index](radius-evidence/index.md) for paired images and raw data.

## Reproduce

Install from the repository lock and build the workspace. Use two isolated
checkouts: current-main baseline `6e62a0f` and this PR. The fixture directory is review-only;
copy this PR's `docs/radius-fixture` into the baseline package as well. It mounts
primary demo source and real package builds; it does not alter consumer code.

From each repository root:

```sh
export TMPDIR="$HOME/.cache/design-kit-tmp"
export GOTMPDIR="$TMPDIR"
npm ci
npm run build
node node_modules/vite/bin/vite.js \
  --config packages/design-components/docs/radius-fixture/vite.config.mjs \
  --host 127.0.0.1 --port 5204
```

In a second terminal, use an existing Playwright installation and Chromium
(no dependency or lock changes required):

```sh
export TMPDIR="$HOME/.cache/design-kit-tmp"
export GOTMPDIR="$TMPDIR"
export PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs
export CHROME=/absolute/path/to/chromium
export RADIUS_OUTPUT=/absolute/path/to/before-or-after
node packages/design-components/docs/radius-fixture/capture.mjs
```

`RADIUS_URL` can override the default localhost port. Where Chromium needs
locally extracted runtime libraries, set `LD_LIBRARY_PATH` for that launch.
The capture reports browser errors and records measurements. It is review
evidence, not a new count or source-agreement CI gate. Unit cases cover every
exported radius alias against lg/md in both orders, modifier and directional
conflicts, primitive overrides and all four small Button sizes; existing tests
are untouched.

Assemble matched images with the same browser environment:

```sh
node packages/design-components/docs/radius-fixture/pair.mjs \
  /absolute/path/to/before /absolute/path/to/after /absolute/path/to/pairs
```

For close-ups of the added observe, card and composer controls, run
`controls-capture.mjs` instead of `capture.mjs` in each checkout, using the same
environment and separate `RADIUS_OUTPUT` directories. Then run:

```sh
node packages/design-components/docs/radius-fixture/controls-pair.mjs \
  /absolute/path/to/before-closeups /absolute/path/to/after-closeups \
  /absolute/path/to/pairs
```
