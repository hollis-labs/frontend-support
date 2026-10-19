# @hollis-labs/eslint-config-design

## 0.5.0 — 2026-10-10

No rule implementation change since 0.4.0; align token peer and core version. Upgrade the six core packages together; ^0.4.0 excludes this minor.


## 0.4.0 — 2026-10-02 — version alignment, no code change

Co-released with the other core packages. No source or behavior change. The
design-tokens peer range is now `^0.4.0`.

## 0.3.0 — 2026-10-02 — version alignment, no code change

Released with the other core packages so that one number selects a compatible set. The `@hollis-labs/design-tokens` peer is now `^0.3.0`. The package documentation gains a section
on running the ratchet in an app whose TypeScript is newer than `typescript-eslint` supports (an
isolated lint-tool package); this is documentation only.
No source or behaviour changed; the published files differ from 0.2.0 only in `package.json`,
this changelog and the documentation above.

## 0.2.0 — 2026-10-01

Co-released with design-tokens, design-components, design-app-runtime, kit-chat and
kit-dashboard. The `@hollis-labs/design-tokens` peer is now `^0.2.0`.

**Baseline/ratchet mode (CW-20261001-0499).** Existing codebases can adopt the gate
without a big-bang fix. Record the current violation counts as
`.eslint-design-baseline.json`; CI then fails only when new violations are **added**, not
on the existing backlog.

- `src/ratchet.js` — the logic: `countByRule`, `buildBaseline`, `parseBaseline`,
  `compare`, `formatReport`, `DESIGN_RULES`. Importable as
  `@hollis-labs/eslint-config-design/ratchet`.
- `scripts/ratchet.mjs` — the CLI: `--update`, `--no-config` (cross-repo), `--json`,
  `--quiet`, `--colors` and `--baseline <file>`.
- Exit codes: `0` no new violations (or `--update` succeeded), `1` the ratchet failed
  because violations increased, `2` a configuration or environment error. The ratchet
  **fails closed**: a path that lints no files, any parse error (the files are listed),
  and, under `--no-config`, a TypeScript parser that cannot be loaded all exit `2` rather
  than reporting a clean result.
- The ratchet compares per-rule totals, so fixing one violation and adding another
  elsewhere nets to zero, and an `--update` that raises the baseline passes CI:
  reviewers should read baseline diffs. `docs/ratchet.md` is the adopter guide.

**Biome consumer support (CW-20260913-0031).** Decision: run ESLint alongside Biome,
scoped to the design rules only. Biome's GritQL cannot inject the live vocabulary from
`@hollis-labs/design-tokens`, and a static pattern list would drift from the contract.
`scripts/biome-check.mjs` wraps the ratchet's `--no-config` mode, so a Biome project adds
one npm script and a few devDependencies (`eslint`, `typescript-eslint`, this package and
design-tokens) with no ESLint config file. `typescript-eslint ^8.0.0` is an **optional
peer**, needed only for that path on TypeScript sources. `docs/biome-consumers.md` is the
decision record and adoption guide.

**Kit-owned idiom vocabularies (CW-20261001-0529).** Register a kit's exact idiom names
with `designConfig({ idiomManifests })`. A manifest is checked against the kit's shipped
stylesheet before registration (names, bindings and deprecations must agree both ways),
and the registration applies only to the files you scope it to. Base-contract shadowing
rules and kit deprecations stay separate. The ratchet's `--no-config` mode and Biome
consumers opt in with a repeatable `--idiom-manifest <file>`. Enrollment is explicit: no
prefix-wide permission and no crawl of installed kits.

**Packaging (CW-20260912-0097).** `tailwindcss: ^4.0.0` is declared as an optional peer for
the consumer-owned CSS pipeline. npm does not auto-install it or warn when it is missing;
an incompatible installed major fails peer resolution.

## 0.1.0 — 2026-09-11

First release, alongside the five other packages in this repo. The set shares a
version number; the release record for all of it is the repo's
[`CHANGELOG.md`](https://github.com/hollis-labs/design-kit/blob/main/CHANGELOG.md).

**The gate.** Six rules enforcing that a component may name a token, never a value —
`no-color-literal`, `no-raw-palette-utility`, `no-arbitrary-scale`,
`no-undefined-token`, `no-idiom-shadowing-contract`, `require-disable-reason`.

`no-undefined-token` is the one that earns the package. Four invented token names
were live in production across two separately-reviewed codebases at 16 use sites,
every one rendering no colour at all. A hex literal at least renders something.

The vocabulary is **injected, never hardcoded** — a copy of the token names here
would be a third list that drifts invisibly. `@hollis-labs/design-tokens` is the
default source and is declared as a `peerDependency`, so npm installs it for you and
the first lint run works.

Adopt it at `severity: 'warn'` first and read the counts before flipping to `error`;
the README has the full sequence.
