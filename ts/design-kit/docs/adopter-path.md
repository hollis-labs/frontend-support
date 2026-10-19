# Adopting design-kit in an application

Installing packages, compiling CSS, and rendering the intended appearance are
separate steps. This guide follows the first Tangent adoption and Folio's
published-package dashboard and chat scaffolds. It describes consumer checks;
it adds no lint rule, repository gate, or automatic enforcement.

## Wire the consumer's CSS build

Use Tailwind v4 and configure its Vite, PostCSS, or CLI integration. With Vite,
install `tailwindcss` and `@tailwindcss/vite` at compatible v4 versions, then add
the Tailwind plugin alongside the React plugin. A peer installed by npm does not
configure the app's compiler. The app's entrypoint must import its stylesheet.

For base components, start with:

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";
```

For chat, add:

```css
@import "@hollis-labs/kit-chat/source.css";
```

For the supplied dashboard theme, the alternative entrypoint is:

```css
@import "tailwindcss";
@import "@hollis-labs/kit-dashboard/theme.css";
```

Dashboard's theme imports the token bundle and both dashboard and base-component
source registrations. A consumer supplying its own dashboard theme instead
needs `tokens.css`, its value layer, both `source.css` imports, and the dashboard
idiom declarations used by its components. Fifty base values do not implement
those additional idiom tokens.

Tailwind skips dependency directories during automatic scanning. Package class
strings live in published `dist`, so each package must register its own output.
Import the shipped `source.css` instead of inventing a dependency glob: its paths
resolve relative to that stylesheet. Base-component registration also defines
`data-horizontal` / `data-vertical` variants for Base UI's `data-orientation`
attribute and the `no-scrollbar` utility. A handwritten `@source` glob supplies
neither definition.

Runtime hooks and bindings alone need no component source registration. Once a
binding renders components, or the runtime hosts an AppShell or kit, import the
stylesheets for the rendered packages. `shell-reset.css` is a separate opt-in
viewport/scroll reset; it provides neither colors nor source registration.

Restart the development server after changing stylesheet imports. Tangent's
Tailwind Vite plugin retained stale styles across an `@import` edit until a
restart; verify a fresh production build rather than trusting that dev session.

## Bring your own values: 50 declarations

`design-tokens.css` supplies built-in values. `tokens.css` supplies the contract
without them. With the latter, declare **48 color values plus two font stacks**
in the scope where components render. These are the complete base value-layer
names, read from `src/tokens.ts` and `src/generate/css.ts`:

| Family | Declarations |
| --- | --- |
| Surfaces | `--hl-bg`, `--hl-bg-elevated`, `--hl-surface`, `--hl-surface-hover`, `--hl-surface-active` |
| Text | `--hl-fg`, `--hl-fg-secondary`, `--hl-fg-muted`, `--hl-fg-faint` |
| Borders | `--hl-border`, `--hl-border-subtle`, `--hl-divider` |
| Primary | `--hl-primary`, `--hl-primary-hover`, `--hl-primary-active`, `--hl-primary-muted`, `--hl-primary-fg` |
| Brand | `--hl-brand`, `--hl-brand-hover`, `--hl-brand-active`, `--hl-brand-muted`, `--hl-brand-fg` |
| Selection | `--hl-selection`, `--hl-selection-fg`, `--hl-ring` |
| Danger | `--hl-danger`, `--hl-danger-hover`, `--hl-danger-muted`, `--hl-danger-fg` |
| Warning | `--hl-warning`, `--hl-warning-muted`, `--hl-warning-fg` |
| Success | `--hl-success`, `--hl-success-muted`, `--hl-success-fg` |
| Info | `--hl-info`, `--hl-info-muted`, `--hl-info-fg` |
| Charts | `--hl-chart-1`, `--hl-chart-2`, `--hl-chart-3`, `--hl-chart-4`, `--hl-chart-5` |
| Syntax | `--hl-syntax-key`, `--hl-syntax-string`, `--hl-syntax-number`, `--hl-syntax-boolean`, `--hl-syntax-null` |
| Fonts | `--hl-font-sans`, `--hl-font-mono` |

Declare fonts globally, or inherit them into each theme scope. Colors must be
complete for every mode the app offers. Generated shadcn aliases reuse these
values; they require no additional palette declarations. Type, radius, tracking,
and Tailwind spacing scales are already supplied by the contract. Built-in chart
colors remain explicit placeholders, not a designed categorical palette.

The indirections have no fallback: `--font-sans` maps to
`var(--hl-font-sans)`, just as a color maps to `var(--hl-…)`. Tangent supplied all
48 colors but omitted the fonts; the page silently fell back to browser-default
serif. A utility may exist yet resolve to an invalid value.

The `Theme.tokens` type checks the **colors**, not these two font declarations.
`emitThemeCss(theme)` emits a theme's colors only. When using it with `tokens.css`,
add font values yourself, for example in the consumer's theme stylesheet:

```css
:root {
  --hl-font-sans: ui-sans-serif, system-ui, sans-serif;
  --hl-font-mono: ui-monospace, monospace;
}
```

`emitThemesCss(themes, defaultId)` also emits the default font stacks at `:root`.
If generating a consumer-owned stylesheet, run that consumer's formatter after
writing it. Tangent's Biome rejected the generated long font-stack line until
its generation script ended with `biome format --write` on the output file.
Do not hand-edit generated output; make regeneration produce a clean tree.

## Verify the production consumer in a browser

Run the app's install, typecheck, lint and clean production build. Serve the
production output on loopback using the actual host layout. A workspace demo or
successful package import does not establish the consumer's emitted CSS.

Mount a focused package component whose utilities the host does not already
use. For example, render `LiveDot` with `label="Consumer live indicator"` and its
default size/pulsing behavior. Avoid copying its utility strings into the host
fixture: that would make Tailwind emit them even without package registration.
After the element appears, inspect it in Playwright:

```js
const sample = await page.getByRole('status', {
  name: 'Consumer live indicator',
}).evaluate((dot) => {
  const pulse = dot.firstElementChild
  const inner = dot.lastElementChild
  return {
    outer: [getComputedStyle(dot).width, getComputedStyle(dot).height],
    inner: [getComputedStyle(inner).width, getComputedStyle(inner).height],
    animation: getComputedStyle(pulse).animationName,
    opacity: getComputedStyle(pulse).opacity,
    font: getComputedStyle(dot).fontFamily,
  }
})
```

For the measured default component, the outer and inner dimensions were 8px and
6px, the pulse animation was `ping`, and opacity was 0.8. Also exercise an actual
Command/scroll region for `no-scrollbar` and an orientation-sensitive primitive
for the custom variants if the app uses them. Compare computed colors, font
family and font size with the selected theme/scale, not only whether a selector
exists. Inspect missing package-only selectors in the built CSS; nested
`@layer`/`@media` rules require recursively walking CSSOM `cssRules`.

For a diagnostic negative control, build a second output with only the relevant
source import removed. Put both output directories outside the scanned source
tree so an old compiled bundle cannot supply the missing class strings. Restart
servers between variants. The comparison should affect package-only utilities;
if the host already uses them, choose another component/property. Do not turn
bundle sizes or selector counts into fixed tests: they change with releases.

Check at desktop and narrow widths, including actual interaction and scrolling.
Screenshots show composition; computed styles reveal absent utilities, unresolved
values and responsive overrides. A passing style probe covers its sampled
properties, not every component or every visual state.

## What the real consumers showed

Tangent's September 12, 2026 adoption used registry 0.1.0 packages, Tailwind 4.3.3
and Vite 8.2.2. With only `design-components/source.css` removed, both builds
succeeded with no errors or warnings. CSS grew from 132.45 to 187.10 kB when
registration was restored (+54.65 kB, about 41%); JavaScript was byte-identical.
LiveDot's outer span changed from 0 × 0 to 8 × 8, its pulse from `none` to `ping`,
and the small inner dot gained its 6 × 6 size. `no-scrollbar` changed from
`auto` to `none`.

The page looked almost correct in both screenshots because Tangent's own source
already used the token vocabulary. Its scan generated most shared utilities;
only a few package-only widgets broke. In a greenfield consumer, missing
registration can leave most components unstyled. During adoption, it can leave
an otherwise convincing page with invisible or broken widgets. The latter is
harder to notice, not evidence that the import is unnecessary. These historical
measurements are recorded in [Tangent PR #48](https://github.com/hollis-labs/tangent/pull/48)
and the task's first-consumer records; they are not present-day bundle budgets.

Tangent's current [remaining-color adoption, PR #73](https://github.com/hollis-labs/tangent/pull/73)
merged at `9967d1b729e94381b10af22d1df6b51153b2f9e6`.
It already imports `source.css`; it supplies no new missing-import negative
control. The component diff replaces literal colors with existing contract
roles. The merged [mapping](https://github.com/hollis-labs/tangent/blob/9967d1b729e94381b10af22d1df6b51153b2f9e6/docs/evidence/CW-20260913-0033/mapping.md)
distinguishes exact, near and role-collapse replacements using a disclosed
RGB/opacity heuristic, not a perceptual-equivalence claim. The signal hover
becomes `info/90`, a darker treatment; muted status fills now composite the
theme's 12% status color over the existing surface. Its
[computed-style evidence](https://github.com/hollis-labs/tangent/blob/9967d1b729e94381b10af22d1df6b51153b2f9e6/docs/evidence/CW-20260913-0033/computed-styles.json)
shows actual semantic changes: removed-line text moves from `rgb(240, 170, 166)`
to the theme's danger value `rgb(217, 107, 103)`, for example. Token migration
should verify intended roles and contrast rather than promise byte-identical
appearance. A CSP-coupled sandbox iframe ring remains an explicit exception.
The adoption's verification record reports a passing clean install/build and
frontend tests, with the full Wails gate limited by the host's missing pkg-config.
Its unpublished Biome/ratchet check remains proof-only;
CI wiring waits for a release. Those boundaries must accompany the browser
proof, rather than treating a local tool or merged source as a shipped check.

Folio's [app-dashboard adoption](https://github.com/hollis-labs/folio/pull/13)
installed and built the published dependencies in a generated app. That verifies
package resolution and build wiring, without claiming every rendered style.
The [chat-app verification](https://github.com/hollis-labs/folio/blob/2a13610/docs/chat-app-consumer-verification.md)
then served the actual generated production Go app in Chromium at 1024 × 800
and 390 × 800: alignment, backgrounds, radius, width, scroll padding and emitted
chat utilities passed; send/echo/reset worked with no page errors or horizontal
overflow.

Yet those published 0.1.0 chat bubbles still computed 16px against a 13px control
token; the desktop composer computed 14px while narrow computed 13px. The
`.text-control` utility **was emitted**. Class merging had removed the bubble's
size token, and a responsive primitive override won on desktop. Thus source
registration can pass while typography still fails. The
[kit-chat measurement and packed-candidate fix](../packages/kit-chat/docs/consumer-verification.md)
separates registry behavior from corrected source/tarball behavior.

Record exact installed versions and whether each dependency came from the
registry, a packed candidate, or a workspace link. A merged fix is not a
published fix. Folio's single `design_kit_version` input pins the six core packages with one number,
which is why they release together; `^0.2.0` excludes 0.3.0, so each new minor requires a
deliberate default bump.
Consumer verification must follow the installed artifact rather than main's
source or a green CI badge.
