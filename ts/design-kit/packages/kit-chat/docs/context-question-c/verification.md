# Suggestion, Context and Question — CW-20261002-0045 PR C

Pinned AI Elements 1.9.0 at 6a9d5b1822ffb10bba4bd97175f01edd7d8651cd.
Source headers and upstream inventory record each port and divergence; package
LICENSE retains the complete Apache terms alongside Hollis Labs MIT terms.

Thirteen unit tests exercise suggestion callbacks/disabled/non-submission and
focusable scrolling; Context known zero versus unknown/invalid data, invalid
capacities, clamping and host slots; Question native single/multiple choices,
controlled host drafts, required text, disabled/host pending, duplicate async
submission, failure events and retry with draft preservation. The inner Context
presentation is tested without opening a Base UI popup in jsdom (known independent
Portal/Positioner/Popup hang). No skipped tests; Chromium tests the real popup.

The Chromium script mounts demo/context-question.tsx in an existing Vite React/
Tailwind host. Keyboard suggestion action, native radio arrow navigation and
checkbox space selection, host-required text, real Context keyboard/touch opening,
Escape/focus return, unknown numeric output, synchronous duplicate-submit guard,
draft preservation and HTML-like free text rendered literally all pass. No page
errors or external requests. Twenty 1360×1200 captures cover ten themes/light/dark
with real Context details open. Root html data-theme/data-mode controls aliases.
Native progress track/fill use muted/primary tokens, without browser default colors.

For reproduction, mount the demo in a scratch Vite React/Tailwind host, import
Tailwind and the documented design-tokens/design-components/kit-chat source CSS.
Register demo source and, when serving unbuilt TSX, component sources. Serve at
loopback 4185; run verify-browser.cjs with PLAYWRIGHT_MODULE pointing at an existing
Playwright install, artifact TMPDIR and optional BASE_URL. Result JSON/screenshots
are written under TMPDIR. The script includes a local host-controlled submission
completion button; no transport/server is involved. No dependency was added.

Direct Button/Textarea/Popover/cn exports were checked in a registry 0.3.0 tarball;
see published-primitives.json. Existing Collapsible/HoverCard-based kit-chat exports still
**need next design-components release (unreleased)**. The isolated ChatStream-only
consumer uses packed kit-chat + packed workspace design-components and registry
0.3.0 tokens, without workspace links or streamdown. Its plain React message main
entrypoint production build and Chromium render pass with zero errors; consumer.json
records this. This establishes the optional markdown boundary, not registry
availability or consumer styling coverage. Neither package was published.

Free text only enters ephemeral React state or host-controlled props, is displayed
through React text/textarea escaping, and receives built-in trim before the host
submit callback. There is no network, persistence, logging, HTML parsing, evaluation,
or dynamic/unbounded regex on user input. The host supplies length policy (demo
maxLength=2000), server validation, authorization, content policy, storage and
transport. This is a presentational form, not a Tangent contract or approval flow.

Demo production build passed. Final five-gate output, exact integrated head and CI
candidate are in the PR. No app migrations, pricing/model catalogs, uploads,
backend/security policy implementation, other browsers or mobile layout coverage.
