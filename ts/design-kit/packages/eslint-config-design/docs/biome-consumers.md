# Design rules for Biome consumers — decision record (CW-20260913-0031)

## The problem

`@hollis-labs/eslint-config-design` enforces the one rule — a component may
name a token, never a value — through ESLint flat config. Tangent, and any
other app that uses Biome as its primary linter, has no ESLint at all. Without
additional steps, the rule that the whole design layer rests on is enforced
only in packages that already run ESLint.

## Options considered

**Option 1 — ESLint alongside Biome, design rules only.** Add eslint and this
package as devDependencies; run a single npm script that checks only the design
rules and produces no ESLint config conflict with Biome. Works today. One
additional devDependency.

**Option 2 — Biome plugin / GritQL patterns.** Write the rules in GritQL so
they run natively inside Biome. Native to the consumer; no second toolchain.
But see below — this does not work for the rules that matter most.

**Option 3 — Standalone checker CLI.** Reuse the rule logic outside an ESLint
host. Architecturally clean; one implementation. The ratchet's `--no-config`
mode is already most of this.

**Option 4 — Accept it.** Enforce the rule in design-kit packages; adopters
are on their own. Unsatisfactory: Tangent is the first real consumer and it
already exists.

## Decision: Option 1

**ESLint alongside Biome, via `scripts/biome-check.mjs`.**

The wrapper script pre-sets `--no-config`, so the consumer adds exactly one
npm script and two devDependencies — no ESLint config file, no conflict with
Biome's own rules, no understanding of ESLint flat config required.

### Why not GritQL (Option 2)

The two rules that matter most to Tangent — `no-undefined-token` and
`no-raw-palette-utility` — require the **current token vocabulary injected at
runtime** from `@hollis-labs/design-tokens`. A correct implementation must
know which token names are valid today, not at the time the rule was written.

Biome's GritQL integration (as of Biome 2.5, tested against 2.5.12 — the version
Tangent currently pins) has no mechanism to inject a
dynamic vocabulary from an npm package at rule evaluation time. Any GritQL
implementation would require hardcoding the token list inside the `.grit` file.
That is the exact failure mode this package was built to prevent: a third list
of token names that drifts invisibly from the contract. When a token is added
to `@hollis-labs/design-tokens`, the ESLint rule picks it up automatically; the
GritQL pattern would not.

Rules that do not depend on the vocabulary — `no-color-literal`,
`no-raw-palette-utility` at the palette level — could be expressed in GritQL.
But implementing only those rules while skipping `no-undefined-token` would give
a false sense of coverage. Option 2 is not closed permanently; if Biome gains
plugin-level configuration injection, it becomes viable.

### Why not a standalone CLI (Option 3)

`scripts/ratchet.mjs --no-config` already is the standalone CLI. The only
thing Option 3 would add over the current code is a different entry point.
`scripts/biome-check.mjs` provides that entry point without duplicating logic.

## Adoption for a Biome consumer

### 1. Install

```bash
npm install --save-dev eslint typescript-eslint \
  @hollis-labs/eslint-config-design @hollis-labs/design-tokens
```

`eslint`, `typescript-eslint`, and `@hollis-labs/design-tokens` are the only
additions. `typescript-eslint` is declared as an optional peer so npm will
install it automatically when you install this package, but it is listed here
explicitly so the intention is visible. No `eslint.config.js` is required; the
script builds a minimal config internally.

### 2. Add a script to `package.json`

```json
{
  "scripts": {
    "check:design": "node node_modules/@hollis-labs/eslint-config-design/scripts/biome-check.mjs src",
    "check:design:update": "node node_modules/@hollis-labs/eslint-config-design/scripts/biome-check.mjs --update src"
  }
}
```

### 3. Record the baseline (first run)

```bash
npm run check:design:update -- --note "initial baseline"
git add .eslint-design-baseline.json
git commit -m "chore: adopt eslint-config-design design rules (Biome project)"
```

### 4. CI

```yaml
- name: Design rule check
  run: npm run check:design
```

Exit 0 means no new violations. Exit 1 means the ratchet failed. Exit 2 is a
configuration error (wrong path, parse errors, missing TS parser — see
`docs/ratchet.md` §"Exit 2").

### 5. Full option reference

All options from `scripts/ratchet.mjs` work with `biome-check.mjs`. The only
difference is that `--no-config` is pre-set.

```
node scripts/biome-check.mjs [options] <path>

  --update              Record a new baseline. Exits 0.
  --note <text>         Human note stored in the baseline with --update.
  --baseline <file>     Baseline file. Default: .eslint-design-baseline.json.
  --root <dir>          Repo root. Default: cwd.
  --severity warn|error Rule severity. Default: error.
  --quiet               One-line summary only.
  --json                Machine-readable JSON.
```

For the full exit-code documentation and caveats (per-rule totals, `--update`
raising the baseline), see [`docs/ratchet.md`](ratchet.md).

## When your TypeScript is newer than typescript-eslint supports

If the parser cannot load against the app's TypeScript, npm can reject the peer
combination, or `biome-check` exits 2 because the TS parser could not be imported.
For example, typescript-eslint 8.71.0 refused TypeScript 7.0 with the runtime
message `typescript-eslint does not support TS 7.0.` A peer-dependency bypass
cannot fix that runtime refusal.

Keep the lint tools in a separate private package with its own lockfile. This
leaves the app's compiler and Node pin intact. The following combination is from
[Tangent's merged recipe](https://github.com/hollis-labs/tangent/tree/0d4ebbf/ui/tools/design-lint)
(CW-20261001-0534), re-run from a fresh registry install on **Node 22.12.0**:

```text
ui/
  package.json                    # app compiler/dependencies stay unchanged
  .eslint-design-baseline.json
  src/
  tools/design-lint/
    package.json
    package-lock.json             # commit the separate registry lockfile
    .gitignore                    # node_modules/
```

`ui/tools/design-lint/package.json`:

```json
{
  "name": "tangent-design-lint",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0 <23" },
  "devDependencies": {
    "@hollis-labs/design-tokens": "0.2.0",
    "@hollis-labs/eslint-config-design": "0.2.0",
    "eslint": "9.39.5",
    "tailwindcss": "4.3.3",
    "typescript": "5.9.3",
    "typescript-eslint": "8.46.4"
  }
}
```

Generate and commit this package's lockfile with `npm install` in its directory;
subsequent installs use `npm ci`. This parser line uses eslint-visitor-keys 4.x,
compatible with Node 22.12; newer parser releases may require a newer Node through
transitive dependencies. Choose versions for the app's supported runtime.

In `ui/package.json`, add scripts pointing at the isolated package:

```json
{
  "scripts": {
    "check:design": "node tools/design-lint/node_modules/@hollis-labs/eslint-config-design/scripts/biome-check.mjs src",
    "check:design:update": "node tools/design-lint/node_modules/@hollis-labs/eslint-config-design/scripts/biome-check.mjs --update src"
  }
}
```

Run from the repository root under the pinned runtime (Tangent uses mise):

```sh
mise --no-config exec node@22.12.0 -- npm ci --prefix ui/tools/design-lint
mise --no-config exec node@22.12.0 -- npm --prefix ui run check:design
```

The wrapper pre-sets `--no-config`, resolves its parser from the isolated package,
and checks `ui/src/` against `ui/.eslint-design-baseline.json` because the script
runs from `ui/`. CI runs the same recipe after setting up the supported Node:

```yaml
- name: Install design rule tooling
  working-directory: ui/tools/design-lint
  run: npm ci
- name: Design rule ratchet
  working-directory: ui
  run: npm run check:design
```

The fresh Node 22.12 run had **zero parse errors**, exited 0 and matched Tangent's
committed per-rule baseline. This verifies that source tree and toolchain, not
all TypeScript 7 syntax, other parser versions or other Node versions. An older
parser can mis-parse newer syntax: the ratchet exits 2 on any reported parse
error rather than counting the file as clean. Compare rule counts when changing
parsers; do not hide source parse errors or raise the baseline to accept them.
Review deliberate baseline updates and never run `--update` in CI.

## What this does not cover

- **Fixing Biome + ESLint conflicts** — because this runs with `--no-config`
  and only the design rules enabled, there are no conflicts to fix. ESLint
  never sees Biome's rules and vice versa.

- **GritQL patterns for non-vocabulary rules** — `no-color-literal` could be
  expressed in GritQL (hex regex, named color pattern) and would not need
  vocabulary injection. If a consumer wants native Biome diagnostics for that
  rule specifically, it is a separate and smaller decision. It would not replace
  `no-undefined-token`.

- **Tangent adoption** — that is CW-20260913-0033. This doc is the decision
  record; the how is here.

## Future revision point

When Biome's plugin system gains a mechanism to load and inject npm-package
configuration at rule evaluation time, Option 2 becomes viable for all rules.
The GritQL expression of `no-undefined-token` would read the token list from
`@hollis-labs/design-tokens` the same way the ESLint rule does. At that point,
a native Biome plugin would be the right answer and this document should be
updated to reflect it.
