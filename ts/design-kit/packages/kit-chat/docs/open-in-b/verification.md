# OpenIn evidence — CW-20261002-0049 PR B

The authored source port is pinned to AI Elements 1.9.0 at
6a9d5b1822ffb10bba4bd97175f01edd7d8651cd. The source header and upstream inventory
record replacing upstream provider-specific URL/query construction and inline brand
marks with a required host href/label/icon catalog. No brand exports, provider
defaults, query prop, content serialization, preload/fetch or dependency is added.

Five Vitest tests exercise real Base UI Menu items inline: exact HTTP(S) href and
new-tab attributes, rejected executable/data/file/mail/relative/malformed destinations
remaining disabled non-link rows with no click callback, empty catalog, inert text
labels/decorative consumer icons, and host catalog updates/custom trigger label.
No popup is opened in jsdom because Base UI's positioned portal has a known jsdom
hang; Chromium verifies the actual popup and link activation. No test is skipped.

`verify-browser.mjs` mounts demo/open-in.tsx in a scratch Vite React/Tailwind host.
It verifies keyboard opening, Base UI focus navigation (disabled rows stay
keyboard-discoverable but cannot activate), Escape focus return and Tab progression,
empty-trigger disabling, rejected-row touch/keyboard inertness, and mobile overflow.
It records zero destination requests before activation, then exactly the original
host-encoded HTTP(S) destination request. A native touch activation opens a new tab;
the originating page stays put, window.opener is null and document.referrer is empty.
The test route fulfills the activated destination locally; it does not contact a
real external provider. Consumer nodes can carry their own behavior; the fixture's
icons are noninteractive local SVG nodes. No page errors occurred.

Twenty desktop screenshots cover all ten built-in themes in light/dark with the
menu open, plus one mobile screenshot. Theme/mode attributes live on html; the
script waits for theme transitions before measuring/capturing. browser.json
records computed menu colors and behavior. Representative light/dark screenshots
were visually inspected. Import Tailwind, design-tokens/design-tokens.css,
design-components/source.css and kit-chat/source.css; register the demo and source
when serving unbuilt TSX. Run the script with PLAYWRIGHT_MODULE, PROOF_OUTPUT and
optional BASE_URL. Only existing workspace tools are needed.

published-primitives.json records all direct Button/DropdownMenu imports verified
in the registry design-components 0.3.0 tarball. The integrated kit-chat package includes other exports
using Collapsible/HoverCard and **needs next design-components release (unreleased)**.
consumer.json records an isolated packed ChatStream-only consumer with packed
workspace design-components/bindings, registry design-tokens, no workspace links
and no installed Streamdown. Its production bundle/render verifies the optional
markdown boundary, not release readiness or CSS coverage. root-graph.json records
the built main graph and absence of Streamdown/Shiki/ANSI peer references. The
package license retains the canonical complete Apache text once (249 lines,
one TERMS AND CONDITIONS heading after integration of PR A and Context/Question).

All five integrated gates and actual kit-chat test counts are recorded in the PR.
Limits: Chromium only; no provider catalog/prompt export/content encoding or
consumer asset licensing policy, no real destination network, no version/range/
manifest/lock changes, and no publishing. Hosts own destination/content consent
and all asset/URL choices.
