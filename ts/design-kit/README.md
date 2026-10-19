# design-kit

`hollis-labs/design-kit` — the Hollis Labs frontend layering, in one monorepo.

Rebuilt so appearance has exactly one authority. **The one rule: a component may
name a token, never a value.** That covers scale as much as color — a component
reaching for `text-[13px]` is naming a value exactly as much as one reaching for
`#1a1b26`.

## The four layers

1. **headless behavior** — no appearance.
2. **token contract** — the names, and their types. A vocabulary, not values.
3. **theme** — the values, plus idiom extensions. The only layer that may name a color.
4. **components** — styled compositions of (1) referencing only (2).

Tokens come before components: a component authored with no token contract
available just relocates the drift somewhere harder to see.

## Packages

| Package | What | License |
|---|---|---|
| `packages/design-tokens` | the contract (names + types) + default values | MIT |
| `packages/design-components` | idiom-free base | MIT |
| `packages/design-app-runtime` | api client, hooks, router, storage, toast, status | MIT |
| `packages/design-bindings` | the binding contract — "this schema renders as these components" | MIT |
| `packages/kit-dashboard` | the dashboard idiom — forked whole from `@hollis-labs/sysop-ui` 0.9.0 | MIT |
| `packages/kit-chat` | chat input + stream, and the interactive card set | MIT AND Apache-2.0 |
| `packages/kit-account` | controlled local-first account surfaces; private `0.0.0`, unpublished | MIT |
| `packages/kit-settings` | controlled schema-driven settings forms, provenance and a setup wizard; release version `0.2.0` | MIT |
| `packages/plugin-host-ui` | host importmap entries, Vite provisioning and owned stylesheet leases; `./vite` only | MIT |
| `packages/kit-observe` | controlled read-only health, stats, sample series and diagnostics; release version `0.1.1` | MIT |
| `packages/kit-admin` | controlled admin directory, settings/setup, status and diagnostics; release version `0.1.0` | MIT |
| `packages/kit-voice` | voice input and output components (speech input, microphone and voice selection, transcript, audio playback); private `0.0.0`, unpublished | MIT AND Apache-2.0 |
| `packages/kit-workflow` | opt-in controlled workflow canvas; private `0.0.0`, unpublished | MIT AND Apache-2.0 |
| `packages/kit-code` | code and developer presentation; private `0.0.0`, unpublished | MIT AND Apache-2.0 |
| `packages/eslint-config-design` | the gate | MIT |

Current releases: the six core packages (`design-tokens`, `design-components`,
`design-app-runtime`, `kit-dashboard`, `kit-chat` and `eslint-config-design`) at **`0.4.0`**,
released together at one number; `design-bindings` at `0.1.0`; `kit-settings` at `0.2.0`;
and `kit-observe` at `0.1.1`. `kit-account` is private. See
[`CHANGELOG.md`](./CHANGELOG.md).
`kit-chat` was an empty stub when the first six published, so it was excluded rather than
holding five finished packages for it, and shipped separately — CW-20260912-0042.

## Using it — the one line people miss

```css
@import "tailwindcss";
@import "@hollis-labs/design-tokens/design-tokens.css";
@import "@hollis-labs/design-components/source.css";   /* ← without this, no colour */
```

**Tailwind v4 emits a utility only for a class string it has seen, and it does not
scan `node_modules`.** Our class strings ship inside `dist`. Leave out that third
line and the components render, render *mostly unstyled*, and **nothing errors** —
the defect is in what the build did not produce rather than in anything the code
says, so there is nothing to grep for.

Every package that ships class strings ships a `source.css` that registers it, so a
consumer writes an import rather than a glob. Taking `kit-dashboard` instead? Its
`theme.css` imports both and is the only line you need.

Measured in a scratch consumer built from the published tarballs: 11 of 19 probed
utilities existed **only** because of that import, and the compiled stylesheet went
from 28,924 to 94,518 bytes. See [`CHANGELOG.md`](./CHANGELOG.md) and
`packages/design-components/README.md`.

## Relationship to sysop-ui

`@hollis-labs/sysop-ui` 0.9.0 is **deprecated on npm** and scheduled for removal; existing
installs keep working until then, and the deprecation message points at
`@hollis-labs/kit-dashboard`. `libs/sysop-ui` itself has **not** moved and stays frozen.
`design-kit` is a **fork**, seeded by cloning it — so `packages/kit-dashboard` carries
sysop-ui's real git history, and nothing done here can break a live consumer. Each project
migrates onto design-kit later, in its own session.

## Commands

```bash
npm install        # installs all workspaces and links the siblings — see the note below
npm run build      # every workspace with a build script. RUN THIS FIRST on a fresh clone.
npm run typecheck
npm run lint
npm run test:run
npm run demo       # kit-dashboard's component gallery
```

### On a fresh clone, run the root build before any package one

`npm install` links the workspace siblings but does **not** build them. Most packages
here use a `prepack` script rather than `prepare`, deliberately — `prepare` runs during
install and npm does not order workspace installs by dependency, which is what turned
CI red once already. The consequence is that `packages/design-components/dist` does not
exist until something builds it, so a package that depends on it fails to resolve:

```
Failed to resolve entry for package "@hollis-labs/design-components"
```

That is not a broken package. `npm run build` at the root fixes it, and the published
packages are unaffected — a consumer installs built tarballs. The root build works
because npm walks the workspaces in directory order and every `design-*` package sorts
before every `kit-*` one, which is an alphabetical accident rather than a declared
dependency order. It has now surfaced in three places; it is written down here so the
fourth person does not rediscover it.

## CI — the gate

`.github/workflows/ci.yml` runs typecheck, test, build, lint and the design rules
across every workspace, on every push to `main` and every pull request.

It is **blocking from day one and green on arrival**, which is not a contradiction:

- **Lint is scoped, not suppressed.** The five packages authored clean against the
  contract block at zero. `kit-dashboard` — forked from `libs/sysop-ui`, which had no
  CI and whose lint was already red — is **reported every run with its counts, and
  never blocks**. Its two `react-refresh` errors in `json-payload.tsx` are present at
  the identical lines in sysop-ui on its own pinned plugin, so they are inherited, not
  introduced. `CW-20260910-0131` retires the exemption by rebasing the package;
  `CW-20260910-0125` removes the two errors along the way.

  **The gate counts nothing, deliberately.** An earlier version recorded those two
  errors by exact count in `.github/lint-baseline.json` and failed the build if the
  count rose *or fell* — a fall meaning someone had fixed one. That is a rule about
  the state of a mutable file, and it breaks the build when the codebase improves:

  > A gate may assert a **property of the code**. It may never assert a **quantity of
  > the codebase**. "This package has no violations" is a property. "This file
  > contains exactly two errors" is a census — and a census punishes progress.

  What that trades away, stated plainly: nothing notices if `kit-dashboard`'s error
  count grows. The debt stays visible on every run and is owned by a named task rather
  than by a tripwire, which is the better half of the trade before release.

- **The design rules use the same policy** — blocking for packages authored against
  the contract, reporting-only for `kit-dashboard`, which predates the contract by
  construction. Its migration is CW-20260910-0125. The count is printed on every run
  rather than hidden, so the debt stays visible without stopping work nobody has been
  asked to do yet. Two gates, one policy.

- **The design rules are enforced, at zero, across every package.** They needed the
  token vocabulary from `@hollis-labs/design-tokens`, which has landed, and the
  config refuses to run without it rather than falling back to a stale list. Both
  `REPORT_ONLY` lists are now empty and the gate prints *"REPORTED, not blocking —
  none. Every package is enforced at zero."* `kit-dashboard`'s two inherited
  `react-refresh` errors were fixed by CW-20260910-0125 rather than exempted.

No step uses `command -v tool && tool || echo skipping`. That idiom prints the skip
message when the tool runs and finds something, so a real failure is
indistinguishable from an absent check.

## Adopting the gate in a consumer repo

Deliberately not automatic, and deliberately not part of this epic. Nanite and
Tangent would fail on day one, and turning that into a red build across the
portfolio before anyone asked converts a leverage move into a blocker. Adoption is
each project's own task, on its own schedule.

The steps below are **projected, not measured** — no consumer repo has run them yet,
because none has adopted. The one number in them that *is* measured is the
arbitrary-radius autofix, counted across the portfolio during the sweep. Treat the
rest as the shape of the work rather than as a report.

The short version:

1. Install `@hollis-labs/eslint-config-design` and `@hollis-labs/design-tokens`.
2. Add it at `severity: 'warn'` first, and read the counts. That sizes the problem
   without stopping anyone.
3. Run `npx eslint . --fix` for the free wins — every arbitrary value that restates
   a named step is rewritten. Portfolio-wide that is 149 of 212 arbitrary radii.
4. Name your theme layer in `themeFiles`. **If your hex count looks catastrophic,
   this is almost certainly why** — Nanite's famous "463 hex" is 627 occurrences of
   which ~590 are in its theme layer, where naming colors is correct.
5. Declare your own idiom tokens in the vocabulary you pass, so `no-undefined-token`
   can see your families.
6. Flip to `error` once the count is zero.

`packages/eslint-config-design/README.md` has the full version, the rule table, and
what each exemption does and does not cover.

## A note on kits

A KIT is layers 3 + 1 bundled: which components exist and how pages lay out. That
is not a CSS concern and is not swappable by variables — which is why kits are
separate packages rather than themes.
