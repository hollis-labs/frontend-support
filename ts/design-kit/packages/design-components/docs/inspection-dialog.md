# InspectionDialog (local candidate; unreleased)

`InspectionDialog` is controlled bounded chrome for arbitrary content. It is a
separate composition from `DetailDialog`, whose legacy fixed-height layout and
`onClose` API remain available. Import it and its props from the package root.

Supply `open`, `onOpenChange`, `title`, and `children`. Optional `meta`,
`navigation`, and `footer` slots remain outside the body scroll region. Name
navigation using `navigationLabel`; label the body using `bodyProps` and opt it
into keyboard scrolling with `tabIndex: 0` where appropriate. The dialog fits the
dynamic viewport with token spacing around it, including short/narrow screens.
Do not give descendants a second full-height scroll viewport.

Popup props, including `ref`, `initialFocus`, `finalFocus`, `onKeyDown`, and
composition capture handlers, pass to the existing Base UI DialogContent. Use
`titleProps={{ ref: titleRef, tabIndex: -1 }}` and `initialFocus={titleRef}` for a
read-only inspector, or an input ref for an editing purpose. There is no universal
autofocus rule. Base UI owns modal containment, child overlays and dismissal.
The host owns return eligibility; supply a `finalFocus` resolver that checks the
current source/admission before returning an opener. Keyboard handlers run on
the popup bubble path after descendants. This component does not intercept keys.

The host also owns data, routes, admission, record order, boundary policy,
selection and actions. Navigation is arbitrary host markup: no fixture model,
record controller or business action is bundled into the chrome.

Styles use the shared contract and Tailwind scale, including viewport spacing.
Keep the normal `design-tokens.css` and `design-components/source.css` imports.
A local tarball at workspace version 0.4.0 is an unpublished candidate, not proof
that registry 0.4.0 exports this API. The release owner must allocate the next
core release before publication.

Proof compositions: Torque task/run evidence (dashboard idiom), existing
Messaging attachment/draft inspection (chat idiom), and an independent arbitrary
content demo at `demo/inspection.html`. App/story renderings of one screen alone
are not counted as independent consumers. Native OS IME and physical touch remain
outside headless browser proof.

Run the arbitrary-content demo with the package built, then use
`demo/scripts/inspection-proof.mjs`. Set `PROOF_URL`, `PROOF_OUTPUT`, and
`PLAYWRIGHT_MODULE` (an installed `@playwright/test` module URL); optionally set
`CHROMIUM_EXECUTABLE`. The script drives all four viewport sizes and preserves
geometry, captures and behavioral results in the chosen output directory.
