import { RuleTester } from 'eslint'
import { describe, it } from 'node:test'
import { vocabularyFrom } from '../src/vocabulary.js'
import { plugin } from '../src/index.js'
import * as contractFixture from './vocabulary.fixture.js'
import * as kitFixture from './vocabulary.kit.fixture.js'

import noColorLiteral from '../src/rules/no-color-literal.js'
import noRawPaletteUtility from '../src/rules/no-raw-palette-utility.js'
import noArbitraryScale from '../src/rules/no-arbitrary-scale.js'
import noUndefinedToken from '../src/rules/no-undefined-token.js'
import noIdiomShadowingContract from '../src/rules/no-idiom-shadowing-contract.js'
import requireDisableReason from '../src/rules/require-disable-reason.js'

RuleTester.describe = describe
RuleTester.it = it

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
})

// require-disable-reason's fixtures mention `design/*` rule names in disable
// directives. RuleTester only registers the rule under test, so without the
// plugin present ESLint reports "Definition for rule ... was not found" and the
// test fails on harness noise rather than on the rule's behaviour.
const directiveTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: { design: plugin },
  linterOptions: { reportUnusedDisableDirectives: 'off' },
})

const contract = vocabularyFrom(contractFixture, 'contract')
const kit = vocabularyFrom(kitFixture, 'kit')

const tokenOpts = (voc, extra = {}) => [{
  tokens: [...voc.colors], families: [...voc.families], ...extra,
}]
const scaleOpts = (voc) => {
  const invert = (s) => Object.fromEntries(Object.entries(s).map(([k, v]) => [String(v), k]))
  return [{ text: invert(voc.textScale), radius: invert(voc.radiusScale), tracking: invert(voc.trackingScale) }]
}

// ---------------------------------------------------------------------------
// no-undefined-token — the discrimination that matters most.
// ---------------------------------------------------------------------------
tester.run('no-undefined-token', noUndefinedToken, {
  valid: [
    // Multi-segment token names that a structural parser reports as invented.
    { code: 'const c = "bg-bg-elevated"', options: tokenOpts(contract) },
    { code: 'const c = "bg-mode-default text-mode-default"', options: tokenOpts(contract) },
    { code: 'const c = "text-fg-muted border-border-subtle"', options: tokenOpts(contract) },
    { code: 'const c = "bg-status-running/10"', options: tokenOpts(contract) }, // family unknown -> conservative
    { code: 'const c = "bg-status-done"', options: tokenOpts(kit) },
    // Tailwind utilities that share a color prefix must never be candidates.
    { code: 'const c = "text-center text-sm text-ellipsis text-nowrap"', options: tokenOpts(contract) },
    { code: 'const c = "border-2 border-dashed border-collapse"', options: tokenOpts(contract) },
    { code: 'const c = "bg-cover bg-no-repeat bg-clip-text"', options: tokenOpts(contract) },
    // Opacity modifiers and variants must be peeled before testing membership.
    { code: 'const c = "hover:bg-surface-hover/50 data-[state=open]:bg-bg-elevated"', options: tokenOpts(contract) },
    // A palette utility is the other rule's finding, not this one's.
    { code: 'const c = "text-zinc-500"', options: tokenOpts(contract) },
    // No vocabulary configured -> the rule is inert rather than wrong.
    { code: 'const c = "bg-whatever-nonsense"', options: [{}] },
    // Contract §3.7: the generated shadcn aliases are legal, just never authored.
    // Omitting them reported badge.tsx's `primary-foreground` (5 real uses) as invented.
    { code: 'const c = "bg-primary text-primary-foreground"', options: tokenOpts(contract) },
    { code: 'const c = "bg-muted text-muted-foreground border-input"', options: tokenOpts(contract) },

    // ── var(--…): what must NOT be flagged ───────────────────────────────────
    // A correctly-prefixed reference to a real token.
    { code: 'const s = { color: "var(--color-fg)" }', options: tokenOpts(contract) },
    { code: 'const s = { background: "var(--color-bg-elevated)" }', options: tokenOpts(contract) },
    // A property that is not a token at all. --radius, --anchor-width and a
    // library's own API are all legitimate, and guessing at them is how a rule
    // starts crying wolf.
    { code: 'const s = { borderRadius: "var(--radius)" }', options: tokenOpts(contract) },
    { code: 'const s = { width: "var(--anchor-width)" }', options: tokenOpts(contract) },
    { code: 'const s = { "--normal-bg": "var(--color-bg-elevated)" }', options: tokenOpts(contract) },
    // A family the vocabulary does not declare — same conservatism as the class
    // path, so an app's own namespace is not this rule's business.
    { code: 'const s = { color: "var(--color-brandish-thing)" }', options: tokenOpts(contract) },
    // THE BLIND SPOT, PINNED AS A PASS SO IT IS VISIBLE RATHER THAN FORGOTTEN.
    // A name built by concatenation has no complete reference to test: the chunk
    // ends at `--color-` with no terminator. Skipped, never guessed at.
    { code: 'const s = { color: `var(--color-${name})` }', options: tokenOpts(contract) },
    // `ignore` is the escape valve, and it takes either spelling.
    { code: 'const s = { color: "var(--popover)" }', options: [{ ...tokenOpts(contract)[0], ignore: ['--popover'] }] },
  ],
  invalid: [
    // ── var(--…): THE NINE DEAD REFERENCES, AS A REGRESSION CORPUS ───────────
    //
    // Every one of these shipped, in two packages, past this gate reporting the
    // packages clean — because no rule read anything but class names. If one of
    // them stops failing, the rule is narrower than the evidence that justified it.
    //
    // All nine are the same shape: a real token named through the bare property
    // shadcn's template uses, which this codebase never declared.
    {
      // time-series-chart.tsx — axis ticks, spread onto SVG <text>
      code: 'const t = { fill: "var(--muted-foreground)", fontSize: 9 }',
      options: tokenOpts(contract),
      errors: [{ messageId: 'bareTokenProperty' }],
    },
    {
      // time-series-chart.tsx — the tooltip, never themed in any palette
      code: 'const s = { background: "var(--popover)", border: "1px solid var(--border)", color: "var(--popover-foreground)" }',
      options: tokenOpts(contract),
      errors: [
        { messageId: 'bareTokenProperty' },
        { messageId: 'bareTokenProperty' },
        { messageId: 'bareTokenProperty' },
      ],
    },
    {
      // time-series-chart.tsx — the hover cursor
      code: 'const c = { stroke: "var(--border)", strokeDasharray: "2 2" }',
      options: tokenOpts(contract),
      errors: [{ messageId: 'bareTokenProperty' }],
    },
    {
      // donut-chart.tsx — the track
      code: 'const c = "var(--muted)"',
      options: tokenOpts(contract),
      errors: [{ messageId: 'bareTokenProperty' }],
    },
    {
      // sonner.tsx — the toaster, found during the design-components extraction
      code: 'const s = { "--normal-bg": "var(--popover)", "--normal-text": "var(--popover-foreground)", "--normal-border": "var(--border)" }',
      options: tokenOpts(contract),
      errors: [
        { messageId: 'bareTokenProperty' },
        { messageId: 'bareTokenProperty' },
        { messageId: 'bareTokenProperty' },
      ],
    },
    {
      // An invented token behind a CORRECT prefix — the other half of the check.
      // `status-running` is this epic's own production example, in a style object.
      code: 'const s = { color: "var(--color-status-running)" }',
      options: tokenOpts(kit),
      errors: [{ messageId: 'undefinedCustomProperty' }],
    },
    {
      // A retired name reached through a var() is a migration, not a break, and
      // must say so — the same discrimination the class path makes.
      code: 'const s = { borderColor: "var(--color-border-strong)" }',
      options: tokenOpts(contract, { deprecated: { 'border-strong': 'border' } }),
      errors: [{ messageId: 'retired' }],
    },

    // The genuinely invented four, at their real spellings.
    {
      code: 'const c = "border border-border-subtle bg-bg-surface"',
      options: tokenOpts(contract),
      errors: [{ messageId: 'undefinedToken' }],
    },
    {
      code: 'const c = "bg-status-running/10 text-status-running"',
      options: tokenOpts(kit),
      errors: [{ messageId: 'undefinedToken' }, { messageId: 'undefinedToken' }],
    },
    {
      code: 'const c = "bg-status-info/10 text-status-info border-status-info/30"',
      options: tokenOpts(kit),
      errors: 3,
    },
    {
      code: 'const c = "text-warning-fg"',
      options: tokenOpts({ ...contract, colors: new Set([...contract.colors].filter((t) => t !== 'warning-fg')) }),
      errors: [{ messageId: 'undefinedToken' }],
    },
    // A RETIRED name renders correctly today, so it must not be reported as
    // rendering nothing. 158 real uses across kit/tether/tesseract.
    {
      code: 'const c = "border-border-strong"',
      options: tokenOpts(contract, { deprecated: { 'border-strong': 'border' } }),
      errors: [{ messageId: 'retired' }],
    },
    {
      code: 'const c = "border-b-border-soft"',
      options: tokenOpts(contract, { deprecated: { 'border-soft': 'divider' } }),
      errors: [{ messageId: 'retired' }],
    },
    // cva / object maps, not just className.
    {
      code: 'const tones = { ok: "bg-success", bad: "bg-bg-surface" }',
      options: tokenOpts(contract),
      errors: 1,
    },
    // Template literals.
    {
      code: 'const c = `flex ${x} bg-bg-surface`',
      options: tokenOpts(contract),
      errors: 1,
    },
  ],
})

// ---------------------------------------------------------------------------
// no-arbitrary-scale — narrow on purpose.
// ---------------------------------------------------------------------------
tester.run('no-arbitrary-scale', noArbitraryScale, {
  valid: [
    { code: 'const c = "text-xs text-sm rounded-md tracking-wide"', options: scaleOpts(contract) },
    { code: 'const c = "text-caption rounded-panel tracking-label"', options: scaleOpts(contract) },
    // §8: layout geometry and icon-sized boxes are explicitly NOT linted.
    { code: 'const c = "h-[18px] w-[18px] w-[480px] max-w-[calc(100vw-2rem)] size-[14px]"', options: scaleOpts(contract) },
    { code: 'const c = "min-h-[40px] top-[3px] z-[9999] inset-[2px]"', options: scaleOpts(contract) },
    // Spacing is at 99.4% adherence and gets no tokens — no rule.
    { code: 'const c = "py-[7px] gap-[3px] px-[5px] leading-[1.2]"', options: scaleOpts(contract) },
    // Arbitrary VARIANT selectors are selectors, not values.
    { code: 'const c = "data-[side=right]:rounded-md group-data-[size=sm]:text-sm"', options: scaleOpts(contract) },
    { code: 'const c = "has-[>svg]:px-2 aria-[current=page]:text-fg"', options: scaleOpts(contract) },
    // CSS-wide keywords name no length, so no step can be equivalent and every
    // message this rule has would be wrong. Real: scroll-area.tsx:20 carries
    // `rounded-[inherit]` to clip to whatever surface contains it.
    { code: 'const c = "rounded-[inherit]"', options: scaleOpts(contract) },
    { code: 'const c = "rounded-[initial] rounded-[unset] rounded-[revert] rounded-[revert-layer]"', options: scaleOpts(contract) },
    // The exemption is per-dimension, not radius-only.
    { code: 'const c = "text-[inherit] tracking-[inherit]"', options: scaleOpts(contract) },
    // CSS keywords are case-insensitive; the exemption matches that.
    { code: 'const c = "rounded-[INHERIT]"', options: scaleOpts(contract) },
  ],
  invalid: [
    // Restates a Tailwind step -> unambiguous autofix.
    {
      code: 'const c = "text-[12px]"', options: scaleOpts(contract),
      output: 'const c = "text-xs"',
      errors: [{ messageId: 'named' }],
    },
    {
      code: 'const c = "rounded-[4px]"', options: scaleOpts(contract),
      output: 'const c = "rounded-sm"',
      errors: [{ messageId: 'named' }],
    },
    // Restates a CONTRACT step -> autofix to the new name.
    {
      code: 'const c = "text-[10px]"', options: scaleOpts(contract),
      output: 'const c = "text-caption"',
      errors: [{ messageId: 'named' }],
    },
    {
      code: 'const c = "text-[13px]"', options: scaleOpts(contract),
      output: 'const c = "text-control"',
      errors: [{ messageId: 'named' }],
    },
    {
      code: 'const c = "rounded-[10px]"', options: scaleOpts(contract),
      output: 'const c = "rounded-panel"',
      errors: [{ messageId: 'named' }],
    },
    // Variants and opacity survive the fix.
    {
      code: 'const c = "hover:text-[11px]"', options: scaleOpts(contract),
      output: 'const c = "hover:text-label"',
      errors: 1,
    },
    // Half-pixels: suggestion only, never an autofix — rounding is a design call.
    {
      code: 'const c = "text-[10.5px]"', options: scaleOpts(contract),
      output: null,
      errors: [{
        messageId: 'offScale',
        suggestions: [{ desc: 'Use text-caption (10)', output: 'const c = "text-caption"' }],
      }],
    },
    // The two spellings of one tracking value both land on the same step — and
    // that value is now 0.18em, `tracking-label`'s, so both AUTOFIX. They were
    // `offScale` until review round 3 moved `label` from the band's midpoint to
    // its mode; the inversion below is the same change seen from the other side.
    {
      code: 'const c = "tracking-[.18em]"', options: scaleOpts(contract),
      output: 'const c = "tracking-label"', errors: [{ messageId: 'named' }],
    },
    {
      code: 'const c = "tracking-[0.18em]"', options: scaleOpts(contract),
      output: 'const c = "tracking-label"', errors: [{ messageId: 'named' }],
    },
    // And 0.16em, which used to be the exact match, is now off-scale.
    { code: 'const c = "tracking-[0.16em]"', options: scaleOpts(contract), output: null, errors: [{ messageId: 'offScale', suggestions: 1 }] },
    // Computed values are reported but never autofixed. Real: kit x3.
    {
      code: 'const c = "rounded-[min(var(--radius-md),10px)]"', options: scaleOpts(contract),
      output: null, errors: [{ messageId: 'computed' }],
    },
    // The keyword exemption is the exact CSS-wide set and not a prefix match —
    // an exemption that widened by accident would silence real off-scale values.
    {
      code: 'const c = "rounded-[inherits]"', options: scaleOpts(contract),
      output: null, errors: [{ messageId: 'unparsed' }],
    },
  ],
})

// ---------------------------------------------------------------------------
// CLOSING THE SCALE must be a config change, not a rewrite.
//
// Chrispian chose extend-now and kept closing it alive as a future option. The
// close is: stop exporting INHERITED_TEXT_STEPS from design-tokens. These two cases
// pin that a passed table REPLACES the defaults — if the rule merged Tailwind's
// steps in unconditionally, `text-[14px]` would forever report as "restates
// text-sm" and the close would be unrepresentable without editing the rule.
// ---------------------------------------------------------------------------
const closedScale = [{ text: { 9: 'micro', 10: 'caption', 11: 'label', 13: 'control' } }]
tester.run('no-arbitrary-scale (scale closed)', noArbitraryScale, {
  valid: [],
  invalid: [
    {
      // With Tailwind's steps withdrawn, 14px no longer has a name to restate — it
      // is off-scale, suggestion only, and NOT silently autofixed to `text-sm`.
      code: 'const c = "text-[14px]"', options: closedScale,
      output: null,
      errors: [{ messageId: 'offScale', suggestions: 1 }],
    },
    {
      // A contract step still autofixes under the closed scale.
      code: 'const c = "text-[13px]"', options: closedScale,
      output: 'const c = "text-control"',
      errors: [{ messageId: 'named' }],
    },
  ],
})

// ---------------------------------------------------------------------------
// no-color-literal
// ---------------------------------------------------------------------------
tester.run('no-color-literal', noColorLiteral, {
  valid: [
    'const c = "bg-surface text-fg"',
    // A git sha is not a color: more hex digits follow, so the lookahead rejects it.
    'const sha = "#aef2dff7c0cf318a409689b5ab2b873b2aad46f4"',
    'const id = "#section-heading"',
    { code: 'const c = "bg-[var(--color-surface)]"', options: [{ functions: true }] },
  ],
  invalid: [
    { code: 'const c = "#1a1b26"', errors: [{ messageId: 'hex' }] },
    { code: 'const c = "text-[#abc123]"', errors: [{ messageId: 'hex' }] },
    { code: 'const c = "#fff"', errors: [{ messageId: 'hex' }] },
    { code: 'const c = "#aabbccdd"', errors: [{ messageId: 'hex' }] },
    { code: 'const s = "rgba(255,255,255,.06)"', errors: [{ messageId: 'fn' }] },
    { code: 'const c = "bg-[rebeccapurple]"', errors: [{ messageId: 'arbitrary' }] },
    { code: 'const s = "rgb(1,2,3)"', options: [{ functions: true }], errors: 1 },
    { code: 'const s = "rgb(1,2,3)"', options: [{ functions: false }], errors: 0, only: false, output: null },
  ].filter((t) => t.errors !== 0),
})

// ---------------------------------------------------------------------------
// no-raw-palette-utility
// ---------------------------------------------------------------------------
tester.run('no-raw-palette-utility', noRawPaletteUtility, {
  valid: [
    'const c = "bg-surface text-fg-muted border-border"',
    // §8 declines to tokenise scrim/overlay, so there is no token to point at.
    'const c = "bg-black/50 bg-white"',
    'const c = "text-red"',           // no shade — not a palette utility
    'const c = "grid-cols-12"',
    { code: 'const c = "bg-black/50"', options: [{ includeBlackWhite: false }] },
  ],
  invalid: [
    { code: 'const c = "text-zinc-500"', errors: [{ messageId: 'palette' }] },
    { code: 'const c = "text-zinc-500 text-zinc-400"', errors: 2 },
    { code: 'const c = "border-neutral-700 bg-slate-800"', errors: 2 },
    { code: 'const c = "hover:bg-emerald-500/20"', errors: 1 },
    { code: 'const c = "bg-black"', options: [{ includeBlackWhite: true }], errors: 1 },
  ],
})

// ---------------------------------------------------------------------------
// no-idiom-shadowing-contract — contract §9.3.2
// ---------------------------------------------------------------------------
const idiomOpts = [{ idioms: ['dash', 'chat'], contract: [...contract.colors] }]
tester.run('no-idiom-shadowing-contract', noIdiomShadowingContract, {
  valid: [
    { code: 'const c = "bg-chat-composer-bg"', options: idiomOpts },
    { code: 'const c = "bg-dash-status-done"', options: idiomOpts },
    { code: 'const c = "bg-primary"', options: idiomOpts },
    { code: 'const s = "--color-chat-composer-bg: red"', options: [{ idioms: ['chat'], contract: ['primary'] }] },
    { code: 'const c = "bg-chat-primary"', options: [{}] },
  ],
  invalid: [
    { code: 'const c = "bg-chat-primary"', options: idiomOpts, errors: [{ messageId: 'shadow' }] },
    { code: 'const s = "--color-chat-primary"', options: idiomOpts, errors: [{ messageId: 'shadow' }] },
    { code: 'const c = "text-dash-fg-muted"', options: idiomOpts, errors: [{ messageId: 'shadow' }] },
  ],
})

// ---------------------------------------------------------------------------
// require-disable-reason
// ---------------------------------------------------------------------------
directiveTester.run('require-disable-reason', requireDisableReason, {
  valid: [
    '// eslint-disable-next-line design/no-arbitrary-scale -- optical centering, no step fits\nconst c = "text-[10.5px]"',
    // A comment on the line above is a reason. This is how sysop-ui's use-sse.ts
    // documents both of its disables, and demanding the `--` form would have
    // reported well-documented code as unexplained.
    '// events is serialized into eventsKey; the raw array would re-run every render.\n// eslint-disable-next-line design/no-arbitrary-scale\nconst c = "text-[10.5px]"',
    '// eslint-disable-next-line no-unused-vars\nconst x = 1',
    'const x = 1',
  ],
  invalid: [
    {
      code: '// eslint-disable-next-line design/no-arbitrary-scale\nconst c = "text-[10.5px]"',
      errors: [{ messageId: 'needReason' }],
    },
    {
      // A preceding comment two lines up is not an explanation of this directive.
      code: '// unrelated note\n\n// eslint-disable-next-line design/no-arbitrary-scale\nconst c = "text-[10.5px]"',
      errors: [{ messageId: 'needReason' }],
    },
    {
      // requireInlineReason restores the strict form for a repo that wants it.
      code: '// a real reason on the line above\n// eslint-disable-next-line design/no-arbitrary-scale\nconst c = "text-[10.5px]"',
      options: [{ requireInlineReason: true }],
      errors: [{ messageId: 'needReason' }],
    },
    {
      // `eslint-disable-line` rather than a file-wide block: a block disable of a
      // rule RuleTester has not registered makes ESLint add its own
      // "rule not found" error, which is noise about the harness, not the rule.
      code: 'const c = "#fff" // eslint-disable-line design/no-color-literal',
      errors: [{ messageId: 'needReason' }],
    },
    {
      code: '// eslint-disable-next-line design/no-color-literal, design/no-arbitrary-scale\nconst c = "#fff"',
      errors: [{ messageId: 'needReason' }],
    },
  ],
})
