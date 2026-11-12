# Image and InlineCitation verification

CW-20261002-0049 PR A, measured 2026-10-02. Primary source is the branch tree;
upstream pin is ai-elements 1.9.0 at 6a9d5b1 (Apache-2.0). No new dependencies,
manifest/lock/version/range changes, publication or application adoption.
HoverCard needs the next design-components release (unreleased); local built
siblings demonstrate the candidate, not registry 0.3.0 compatibility.

## Behavior and browser

Eight RTL tests exercise native image src/alt/metadata/handlers, decorative
alternative text, pager wraparound, inactive hidden pages, controlled-host
acceptance, index normalization/list shrink, empty/single-page navigation,
prevented/disabled clicks, controlled hover requests, arbitrary source text and
clear outside-carousel failure. No `it.skip`. Real open PreviewCard portals have
a known jsdom/layout hang also recorded by design-components and ModelSelector;
portal positioning, exposed accessibility and keyboard interactions are tested
in Chromium instead of replacing the production component in the RTL test.

[Browser receipt](browser.json) identifies source f24c4c7 and records 21 captures:
all ten built-in themes in light/dark plus a 390px reduced-motion viewport.
The host fixture uses [demo/image-citation.tsx](../../demo/image-citation.tsx).
Source and design-components/design-tokens builds were frozen in scratch before
capture; the final captures avoid live rebuild/HMR changes. The new kit source
is the source revision in the receipt. Native image decode/size/alt/mediaType,
exposed `aria-hidden=false` popup controls, Tab into previous/next, Shift+Tab to
the trigger, Enter/Space wraparound, continuation to the following host control,
Escape returning focus, pointer transfer into the popup, no mobile overflow,
reduced-motion transition removal and zero page errors all passed.

The first Chromium probe showed that simply exposing the HoverCard body did
not preserve focus order: Tab went to the following host action and the popup
closed before next. Local focus handoffs now preserve the trigger's position
in host tab order and close through Base UI when focus leaves the body.
The host controls any controlled `open` callback and can decline it.

| Theme | Light | Dark |
| --- | --- | --- |
| nanite-default | [capture](nanite-default-light.png) | [capture](nanite-default-dark.png) |
| dir-a | [capture](dir-a-light.png) | [capture](dir-a-dark.png) |
| dir-b | [capture](dir-b-light.png) | [capture](dir-b-dark.png) |
| dir-d | [capture](dir-d-light.png) | [capture](dir-d-dark.png) |
| dir-e | [capture](dir-e-light.png) | [capture](dir-e-dark.png) |
| dir-f | [capture](dir-f-light.png) | [capture](dir-f-dark.png) |
| sysop-amber-phosphor | [capture](sysop-amber-phosphor-light.png) | [capture](sysop-amber-phosphor-dark.png) |
| sysop-green-phosphor | [capture](sysop-green-phosphor-light.png) | [capture](sysop-green-phosphor-dark.png) |
| sysop-p4-white | [capture](sysop-p4-white-light.png) | [capture](sysop-p4-white-dark.png) |
| sysop-hi-contrast | [capture](sysop-hi-contrast-light.png) | [capture](sysop-hi-contrast-dark.png) |

[Mobile reduced motion](mobile-reduced-motion.png). The illustrative source is
host-created SVG data; its demo-only dark inversion shows host image treatment.
The library's Image leaves the supplied source unchanged.

Reproduce: build siblings first, serve the demo in a scratch Vite/React fixture
with Tailwind and the design-token CSS, registering kit-chat source and built
design-components classes. Use a frozen copy during root builds. Run
`docs/fixtures/image-citation-browser.mjs` with `MEDIA_URL` pointing to loopback,
`MEDIA_SCREENSHOTS` to scratch, `MEDIA_SOURCE_COMMIT` identifying that fixture,
and `PLAYWRIGHT_MODULE` if Playwright is installed outside this repository.
Playwright is verification tooling, not a kit dependency.

## Packed consumer

[Consumer receipt](consumer.json), packed from source f24c4c7, records successful production build and Chromium render. The kit-chat tarball SHA256 is 36492b458a22add0b40f158c223fcbf2ef9962e53a2ab46360280c5f385f3016. Packed LICENSE matches source and retains the full canonical Apache suffix. The consumer imports
only ChatStream from the main entry, the four documented stylesheets, and plain
React content. Built local sibling tarballs are needed for unreleased primitives;
all installed packages are ordinary unpacked npm packages, no workspace links.
No Streamdown, markdown import/styles, embla or AI SDK is installed or imported.

## Limits

Chromium only; no screen-reader or other-engine audit. No production application,
model/transport, remote image service, content policy, host Blob URL lifecycle,
or external citation destination was exercised. No publishing or app migration.
The five-gate output, including actual kit-chat test file/count lines and zero
design violations, is pasted in the PR body.

## Citation focus audit correction

CW-20261002-0049 audit-fix PR 2, measured 2026-10-02. The earlier handoff
selector admitted CSS-hidden controls even though they could not receive focus.
The internal helpers now exclude hidden/inert ancestors, disabled/negative-tabindex
controls, CSS-hidden controls and empty/zero-area rects. Native `checkVisibility`
is used where available; computed visibility and client rects cover the fallback.
Each attempted focus is verified against `document.activeElement`; unsuccessful
candidates are skipped and Tab is prevented only after a successful transfer.
These helpers are original Hollis Labs code and have no public package exports.

Three additional unit tests exercise filtering, native visibility/fallback and
failed-focus continuation without mounting a layout-dependent portal in jsdom.
The [extended Chromium receipt](focus-browser.json) identifies source 59dd40e
and confirms the exact display:none host-button repro, visibility:hidden and
zero-area controls, hidden/inert ancestors, and a visible candidate whose focus
method declines. Tab reaches the following visible host action. All existing
keyboard, pointer, accessibility, mobile and reduced-motion checks still pass
with no page errors. The script captured 21 theme/mode/mobile views in scratch;
the component's appearance is unchanged from the captures above.

The [packed consumer receipt](focus-consumer.json) identifies source 354e003,
after the additive OpenIn/main merge. Built local design-components/design-tokens
tarballs and the packed kit-chat candidate were installed as ordinary packages.
The ChatStream-only production build and Chromium render pass with the four
documented CSS imports, no Streamdown, no workspace links and no page errors.
Packed LICENSE is byte-identical to source. Required peers are supplied explicitly;
`--legacy-peer-deps` keeps the optional markdown peer absent for this check.
The [built main-entry graph](focus-root-graph.json) also has no heavy optional-peer
imports. This still needs the next design-components release, not registry 0.3.0.
