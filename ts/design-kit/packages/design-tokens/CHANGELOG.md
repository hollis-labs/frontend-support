# @hollis-labs/design-tokens

## 0.5.0 — 2026-10-10

No token implementation change since 0.4.0; align the six-package core version. Upgrade the six core packages together; ^0.4.0 excludes this minor.


## 0.4.0 — 2026-10-02

- Strengthen `ring` in Graphite dark (`#6e8aa8` → `#96969c`), Hacker light
  (`#006e8c` → `#4d5e69`) and P4 dark (`rgb(63 63 70 / 60%)` → `#83838b`).
  Together with full-strength component focus rings, built-in themes reach
  >=3:1 on the measured surrounding surfaces in both modes. Other `ring`
  values are unchanged. No token is added; `ring-soft` remains retired.
  Chat drag feedback, workflow selection/connection strokes and dashboard's
  general outline-color mapping deliberately follow the stronger ring in those
  same three pairs. Their before/after computed styles are recorded in the
  repo's `docs/screenshots/focus-ring/` audit; styling polish is deferred.
  Native text-field click rings strengthen along with keyboard focus
  (CW-20261002-0091).

- Tailwind `dark:` utilities also match
  when no explicit mode marker is in scope, aligning first paint with the default
  dark palette. Explicit light scopes remain excluded unless a dark ancestor or
  island already matches the existing variant. Mode matching stays inside
  zero-specificity `:where()`, independent of the OS. The dark-variant change
  itself changes no token values.

## 0.3.0 — 2026-10-02 — version alignment, no code change

Released with the other core packages so that one number selects a compatible set.
No source or behaviour changed; the published files differ from 0.2.0 only in `package.json`
and this changelog.

## 0.2.0 — 2026-10-01

Co-released with design-components, design-app-runtime, eslint-config-design, kit-chat
and kit-dashboard. **`@hollis-labs/kit-dashboard` 0.2.0 requires this version**: it
imports the theme-storage exports below, which 0.1.0 does not have.

**Light variants for the four sysop palettes (CW-20261001-0498).** `sysop-p4-white`,
`sysop-green-phosphor`, `sysop-amber-phosphor` and `sysop-hi-contrast` were dark-only
alternates in 0.1.0. Each now ships a light set, so all ten built-in themes carry both
modes. These are new design values. Text and
feedback contrast was also corrected across the built-ins so every theme passes in both
modes (before/after screenshots and measured ratios are in the repository at
`docs/screenshots/README.md`), which means some dark and light values shift slightly from
0.1.0. `tokens.css` adds a Tailwind `dark` custom variant that follows the app's explicit
mode (`data-mode="dark"` or `.dark`), and `setMode` now also toggles the `.dark` class
and sets `color-scheme`.

**Health feedback tones (CW-20260913-0035).** In Concrete & Signal, success is a pale
green (it was grey) and warning a cream/amber (it was the same pink as danger);
Flat/Mono's warning is a distinct amber. Names, danger values and every other palette
are unchanged; the matching 10% tints and the generated CSS are updated. Text contrast of
the new tones is at least 4.56:1 on all five surfaces in both modes.

**Colour derivation rules as functions (CW-20260913-0027).** Typed R1–R4 are exported:
`deriveMuted`, `mixSrgb`, `deriveHover`, `deriveActive`, `deriveSurfaceActive`,
`relativeLuminance`, `contrastRatio`, `deriveForeground` and `deriveSyntax` (plus the
`ColorRepresentation` type). The built-in themes consume them. The README states each
rule's colour space: R2 mixes gamma-encoded sRGB, R3 uses WCAG relative luminance, R4
interpolates in Oklab. Three authored danger-hover overrides are excluded from the
derivation manifest.

**Theme-only persistence helpers (CW-20260911-0071).** `readStoredTheme`,
`persistTheme`, `THEME_STORAGE_KEY` (default key `hollis.theme`) and the
`ThemeStorageOptions` type, with a configurable key, default and accepted ids. They guard
inaccessible storage, including a throwing `localStorage` getter. The theme+mode
preference store is separate: `createThemeStore` in design-app-runtime.

**Packaging (CW-20260912-0097).** `tailwindcss: ^4.0.0` is declared as an optional peer.
npm does not auto-install it or warn when it is missing; an incompatible installed major
fails peer resolution. JavaScript-only consumers can continue without Tailwind.

## 0.1.0 — 2026-09-11

First release, alongside the five other packages in this repo. The set shares a
version number; the release record for all of it is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

**The token contract** — 48 colour token names and their types — plus ten built-in
themes, four added type steps, two radius steps and two tracking steps. No React, no
framework, no dependencies at all.

A **synthesis of two working implementations**, `libs/sysop-ui` and `apps/nanite`,
rather than an extraction of either: both palette sets survive whole, and the
`--hl-*` value layer under a `--color-*` contract layer is Nanite's design.

Notable, because they are easy to mistake for oversights:

- **`chart-1` … `chart-5` are names with placeholder values.** Every built-in sets
  all five to the same magenta and `theme.chartPalette === 'placeholder'` says so in
  the data. The palette is a pending design pass. Five identical magentas make a
  chart obviously wrong; five plausible colours would make it quietly unreviewed.
- **`DERIVED_TOKEN_VALUES` exports the 168 values nobody chose** — the ones filled by
  rule where neither source implementation had one. Exporting the list is how that
  stays honest; none has been through design review.
- **`Theme.tokens.light` is optional**, the one place the contract was not
  implemented literally, because sysop-ui's four palettes are dark-only alternates
  rather than modes and do not acquire light variants by being asked.

Corrected in this README at publish: the tracking scale is **two** steps
(`tracking-label` 0.18em, `tracking-eyebrow` 0.28em), not one at 0.16em; the derived
value count is 168 across four rules, not 88 across three; and `kit-dashboard` names
its status colours `status-*` from its own theme values — the `dash` prefix is
reserved and unused.
