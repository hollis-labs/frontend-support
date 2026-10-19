# Registry consumer styling verification

CW-20260913-0032, measured 2026-10-01. This closes the rendering evidence gap
left by the 0.1.0 install check. It also found a typography bug; source registration
alone did not make the published package render at its declared type scale.

## Candidate and environment

The baseline was installed from `https://registry.npmjs.org/` into a scratch
consumer, with no workspace links: kit-chat, design-components and design-tokens
0.1.0; React/React DOM 19.2.4; Base UI 1.3.0; lucide-react 1.7.0. Build tools:
Node 24.21.0, npm 11.19.0, Vite 5.4.21, plugin-react 4.7.0, Tailwind and
@tailwindcss/vite 4.3.3. Playwright 1.63.0 drove the cached Chromium build 1243.
The only missing browser library was supplied from an existing extracted
libasound directory through the process's `LD_LIBRARY_PATH`; no system install.

The four stylesheet imports were exactly those in the 0.1.0 CHANGELOG:

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
@import "@hollis-labs/kit-chat/source.css";
```

Both components rendered with their default item renderer, a user turn, an
assistant turn, a date marker, stalled streaming content and a reference menu
opened by typing `@`. The host supplied layout but no Tailwind utility strings,
so it could not accidentally supply the package's missing classes. Browser
measurements used `getComputedStyle`, at 1024 × 800 with default theme/dark mode.
No browser page errors occurred in either baseline variant or the fixed candidate.

## Published 0.1.0: source-registration negative control

The negative build removed only the kit-chat source import. The other three
imports and React fixture remained identical. Outputs were built **outside** the
consumer's source directory, so Tailwind could not scan a previously generated
bundle and invalidate the negative control.

| Built CSS | Bytes (uncompressed) |
| --- | ---: |
| Four imports | 99,272 |
| Without kit-chat/source.css | 94,850 |
| Difference | 4,422 |

Observed CSS rules absent in the negative build include `.rounded-panel`,
`.bg-surface`, `.max-w-lg`, `.items-end`, `.bottom-full`, `.top-full`,
`.items-baseline`, `.max-h-64`, `.bg-divider`, `.border-danger`,
`.bg-danger-muted` and `.text-danger-fg`. This is a measured subset, not an
assertion about how many utilities future releases must contain.

| Computed property | Four imports | Without kit-chat source |
| --- | --- | --- |
| User row alignment | flex-end | normal |
| User bubble background | rgb(39, 39, 42) | transparent |
| User bubble corner radius | 10px | 0px |
| User bubble maximum width | 512px | none |
| Suggestion menu corner radius | 10px | 0px |
| Viewport horizontal/top padding | 16px / 24px | 16px / 24px |
| Composer gap | 8px | 8px |

The last two rows show why checking a handful of familiar utilities is
insufficient: the base component source registration already emits some of the
same classes. A screenshot or successful import would not distinguish that
partial styling from correct package registration.

## Defect and local fix

The published message bubble still computed **16px** with all four imports.
`cn('text-control text-fg')` from design-components returned just `text-fg`:
tailwind-merge classified the custom font-size name as a text color and discarded
it. The stylesheet contained the font-size utility, but the rendered element
no longer named it. The desktop textarea computed **14px**, because the base
primitive's `md:text-sm` superseded kit-chat's unprefixed `text-control`.

Kit-chat now extends the merger's font-size group from `TEXT_TOKENS`, applying
it to transcript, cards and markdown wrappers. It does not copy token names or
values. The composer passes a typed length reference to the same control token
at the desktop breakpoint so the existing primitive's merger can recognize the
override. Shared primitive merging is tracked separately in CW-20261001-0520;
this task changes only kit-chat.

After building and packing the modified kit-chat, the **tarball** was installed
into the same consumer; siblings remained published registry 0.1.0 packages.
No workspace links were introduced and nothing was published.

| Computed property | Registry 0.1.0 | Packed candidate |
| --- | --- | --- |
| User bubble font size | 16px | 13px (control token) |
| Desktop composer font size | 14px | 13px (control token) |
| Candidate composer at 390px viewport | — | 13px |
| User bubble foreground | rgb(244, 244, 245) | rgb(244, 244, 245) |
| User bubble radius/background | 10px / rgb(39, 39, 42) | 10px / rgb(39, 39, 42) |
| Stalled status font size | 10px | 10px (caption token) |

Unit regressions verify that every contract typography token survives alongside
color, while same-axis size overrides and responsive overrides still replace
one another. These test merge behavior; the consumer browser measurements are
the separate evidence that emitted CSS produces the intended appearance.

## ChatStream without markdown

A second registry-only entrypoint imported only `ChatStream` from the main
package and rendered plain React content. There was **no streamdown directory**,
no streamdown dependency in `npm ls`, no `/markdown` import, no markdown stylesheet
and no streamdown `@source` directive. Its production build and browser render
passed with no page errors; the transcript viewport computed 16px / 24px padding
and `overflow-y: auto`. The optional markdown boundary still holds at 0.1.0.

## Reproduce

Make a new scratch directory and install the registry baseline:

```sh
npm install --registry=https://registry.npmjs.org \
  @hollis-labs/kit-chat@0.1.0 @base-ui/react@1.3.0 \
  lucide-react@1.7.0 react@19.2.4 react-dom@19.2.4
npm install -D vite@5.4.21 @vitejs/plugin-react@4.7.0 \
  tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 playwright@1.63.0
```

Use a standard Vite React entrypoint with `base: './'` and plugins
`[react(), tailwind()]`. Place the four CSS imports above in `style.css` and import
it from the entrypoint. The fixture can be:

```jsx
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatInput, ChatStream } from '@hollis-labs/kit-chat'
import './style.css'

function App() {
  const [value, setValue] = useState('')
  const items = [
    { kind: 'message', id: 'user', role: 'user', author: 'Operator',
      timestamp: '10:00', content: 'Hello from the consumer' },
    { kind: 'marker', id: 'date', variant: 'date', label: 'Today' },
    { kind: 'message', id: 'assistant', role: 'assistant', author: 'Agent',
      content: 'This is the assistant reply' },
  ]
  return <main>
    <section><ChatStream items={items} status={{ status: 'stalled',
      role: 'assistant', content: 'Still streaming' }} /></section>
    <ChatInput value={value} onValueChange={setValue} onSubmit={() => {}}
      triggers={[{ id: 'files', kind: 'reference', char: '@', items: [
        { id: 'readme', label: 'README', description: 'Project documentation' },
      ] }]} toolbarEnd={<span>Toolbar</span>} />
  </main>
}
createRoot(document.getElementById('root')).render(<App />)
```

The measured host CSS used flex-column layout on `main` and `section`, a
720px × 640px main, and `section { min-height: 0; flex: 1 }`. Host body colors
were `var(--color-bg)` and `var(--color-fg)`. Set `data-mode="dark"` on the HTML
element. Build two separate outputs outside the scratch source tree with
`npx vite build --outDir <outside-directory>`, removing only the last source import
for the second build. Serve those outputs on loopback.

In Playwright, collect `pageerror` events, wait for the textarea, fill it with
`@`, wait for `[data-slot="chat-input-suggestions"]`, then evaluate
`getComputedStyle` on the textarea, suggestion menu and user bubble:

```js
const sample = await page.evaluate(() => {
  const user = document.querySelector('[data-slot="chat-stream-item"] > div > div:last-child')
  const style = getComputedStyle(user)
  return { size: style.fontSize, radius: style.borderRadius,
    background: style.backgroundColor, width: style.maxWidth }
})
```

To compare emitted utilities, recursively walk each stylesheet's `cssRules`
(Tailwind rules are nested under `@layer` and responsive `@media`), collect
`selectorText`, and diff positive versus negative sets. Measure the CSS file's
actual byte length, not Vite's rounded kB display.

For the optional-peer check, replace the entrypoint with a sole `ChatStream`
import and a plain message, keeping the same four CSS imports. Do not install
streamdown. For the fix check, build kit-chat and use `npm pack -w
@hollis-labs/kit-chat --pack-destination <outside-directory>`, install that
tarball in the consumer, restore the two-component fixture and source import,
and repeat the measurements at desktop and narrow viewport widths.

This record covers default transcript/composer styling and source registration,
not every card, markdown theme, browser or production host layout. The visual/UX
polish and ops-chat dogfood follow in CW-20261001-0502. It does not claim the
unreleased fix is already available from the registry.
