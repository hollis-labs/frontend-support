# ModelSelector evidence — CW-20261002-0045 PR B

Pinned AI Elements 1.9.0 at 6a9d5b1822ffb10bba4bd97175f01edd7d8651cd;
source and divergences are recorded in the component header and upstream inventory.
The complete Apache terms remain in the package LICENSE.

Four unit tests use real Command as the popup stand-in: search/keywords and empty
state, pointer host selection and disabled options, keyboard selection, and consumer
logo nodes. Open Base UI portal/positioner/popup hangs jsdom independently of the
kit; no popup is opened in these unit tests and no test is skipped. Real Dialog
behavior is tested separately in Chromium.

The Chromium script drives demo/model-selector.tsx: keyboard/touch opening,
autofocus, title/description ARIA references inside the popup, filtering, empty
state, host keyboard/touch selection, disabled items, Escape and focus return.
It covers both root/trigger/content and controlled convenience-dialog compositions.
Twenty 1360×900 screenshots cover ten themes in light/dark, with the dialog open.
The HTML element owns data-theme/data-mode (root-scoped token aliases). The demo
uses generic lucide icons supplied as consumer children, not brand marks. The
browser recorded no page errors or external requests. See browser.json and PNGs.

Reproduce in a scratch Vite React/Tailwind host mounting ModelSelectorDemo. Import
Tailwind, design-tokens/design-tokens.css, design-components/source.css and
kit-chat/source.css. Register the demo source; when loading unbuilt component TSX,
register that source too. Serve on loopback 4183. Run verify-browser.cjs with an
existing Playwright installation via PLAYWRIGHT_MODULE, an artifact TMPDIR, and
optional BASE_URL. The test writes model-selector-browser-result.json and captures
into model-selector-screenshots within TMPDIR. Build tools are the existing
workspace Vite/Tailwind tools; no repo dependency is added.

published-primitives.json records each direct import verified in the registry
0.3.0 tarball before it was replaced by a workspace pack for the consumer check.
ModelSelector itself requires only those published exports. Current main's other
chat exports use Collapsible: **needs next design-components release (unreleased)**.
The optional-peer verification therefore installed packed kit-chat and packed
workspace design-components into an isolated consumer; design-tokens remained
registry 0.3.0. There are no workspace links or streamdown installed. The sole
ChatStream main-entrypoint fixture built and rendered plain React content in
Chromium with zero errors. See consumer.json. This verifies the optional markdown
boundary, not registry availability or consumer CSS coverage. Neither package was
published and versions/ranges were unchanged.

Demo production build also passed. Final integrated five-gate output and exact
reviewed/CI candidate head are recorded in the PR body. Limits: no fetching,
provider catalog/execution/persistence, bundled brand asset/licensing policy,
other browsers or responsive mobile-layout evidence. Hosts own these decisions.
