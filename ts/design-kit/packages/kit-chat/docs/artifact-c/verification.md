# Expanded Artifact evidence — CW-20261002-0049 PR C

The authored upstream artifact.tsx at AI Elements 1.9.0,
6a9d5b1822ffb10bba4bd97175f01edd7d8651cd, is the primary source for this port.
Its Artifact/header/title/description/close/actions/content names are retained.
ArtifactCard keeps the existing compact Envelope presentation; Artifact is an
expanded viewer with already-rendered host content, not a duplicate card or wire
identity. No renderer, editor, MIME detection, fetching, automatic download or
viewer lifecycle is added. Source header/inventory record the divergences; the
package LICENSE retains full Apache terms once with attribution extended.

Four Vitest tests verify compact/expanded coexistence and inert React text,
action/close host callbacks without form submission or implicit viewer unmount,
native buttons enforced even for untyped host rendering overrides,
required nonempty labels independently of tooltips, disabled action inertness,
no nested buttons, and a labelled focusable content region with host overrides.
No popup is opened in jsdom; no test is skipped. The real Tooltip is verified in
Chromium. This installed Base UI Tooltip does not attach description semantics
itself; ArtifactAction explicitly gives the open tooltip its role/ID and adds
that ID to the action's aria-describedby while preserving any host description.
The optional hint never substitutes for the action's required accessible label.
The closed tooltip adds no dangling description ID.

verify-browser.mjs mounts demo/artifact.tsx in a scratch Vite React/Tailwind host.
It verifies native non-submitting buttons, actual tooltip visibility and ARIA
linkage on keyboard focus, Enter/Space callbacks, native disabled Tab skipping,
Tab into the content pane, PageDown scrolling with the header/close stationary,
inert script-shaped text, touch action/disabled/close/reopen, compact presentation
remaining visible and no mobile overflow. Content has 384px client height and
1496px scroll height in the fixture (the CSS names the contract scale max-h-96).
There are zero external requests or page errors. Hosts own close/reopen state
and any focus restoration when they replace/unmount a viewer.

Twenty desktop screenshots cover all ten built-in themes in light/dark, plus
mobile. Theme/mode attributes live on html; theme transitions settle before
measurement/capture. browser.json contains computed surface colors and behavior.
Representative light/dark screenshots were visually inspected. Use existing
workspace Vite/React/Tailwind tools; import Tailwind, design-tokens/design-tokens.css,
design-components/source.css and kit-chat/source.css, registering demo/source
when serving unbuilt TSX. Run with PLAYWRIGHT_MODULE, PROOF_OUTPUT and optional
BASE_URL. No project dependency, config or service is added.

published-primitives.json records direct Button/Tooltip/cn exports verified in
the registry 0.3.0 tarball. This slice itself uses only published primitives;
integrated kit-chat **needs next design-components release (unreleased)** for
other Collapsible/HoverCard exports. consumer.json records the isolated packed
ChatStream-only production build/Chromium render without Streamdown or workspace
links. That verifies the optional markdown boundary, not release readiness or
consumer CSS coverage. root-graph.json records the built main graph without
Streamdown/Shiki/ANSI references. Full five root gates and actual kit-chat test
counts are recorded in the PR body/CI log.

Limits: Chromium only, host content behavior/asset policies, no viewer focus trap
or renderer/editor/download/network implementation, no version/range/manifest/
lock changes and no publishing. The host owns placement, heading structure,
visibility, content and all callbacks.
