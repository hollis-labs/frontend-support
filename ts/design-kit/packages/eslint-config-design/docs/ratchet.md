# eslint-config-design: ratchet adoption guide

The ratchet lets an existing codebase adopt the design gate without a big-bang
fix. You record today's violation counts as a baseline, commit that file, and
CI passes as long as nobody adds new violations. Fix them when you can;
the baseline follows the code down, never up.

## Why a ratchet

Flux has ~650 arbitrary-value classes and ~1,090 hex literals. Turning the gate
on at `severity: 'error'` today would block every PR until all of them are
fixed — that is a big-bang fix nobody asked for. The ratchet makes adoption
possible without a long freeze:

- Day 1: record the baseline (1,740 violations).
- Day 7: a PR that added 3 new ones fails CI immediately.
- Day 30: three cleanup sprints later, 400 violations remain; commit that new
  baseline. Future PRs start from 400.

**The count can only go down.** Once a violation class is fixed, it cannot come
back without breaking CI.

## Quick start

```bash
# 1. Install
npm install --save-dev @hollis-labs/eslint-config-design @hollis-labs/design-tokens

# 2. Add the config (warn first — you will see the count before it blocks you)
cat > eslint.config.js << 'EOF'
import { designConfig } from '@hollis-labs/eslint-config-design'
export default [
  ...(await designConfig({ severity: 'warn' })),
]
EOF

# 3. Record the baseline
node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs \
  --update --note "initial baseline — $(date -u +%Y-%m-%d)" \
  src

# 4. Commit both files
git add eslint.config.js .eslint-design-baseline.json
git commit -m "chore: adopt eslint-config-design with initial ratchet baseline"
```

That is it. From this point forward, CI fails only if the count goes up.

## The baseline file

The baseline is stored in `.eslint-design-baseline.json` at the repo root (or
wherever you point `--baseline`). Commit it. The diff is the changelog:

```json
{
  "version": 1,
  "recorded": "2026-10-01T18:00:00Z",
  "note": "initial baseline",
  "counts": {
    "design/no-color-literal": 4,
    "design/no-raw-palette-utility": 0,
    "design/no-arbitrary-scale": 650,
    "design/no-undefined-token": 2,
    "design/no-idiom-shadowing-contract": 0,
    "design/require-disable-reason": 0
  }
}
```

**Never gitignore it.** The baseline is the contract between this codebase and
CI. Without it, every run is a first run and nothing is enforced.

## CI integration

Add one step (or a `package.json` script):

```yaml
# GitHub Actions example
- name: Design lint ratchet
  run: |
    node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs src
```

```json
// package.json
{
  "scripts": {
    "lint:design": "node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs src"
  }
}
```

Exit codes:
- `0` — ratchet holds (no new violations), or `--update` succeeded.
- `1` — ratchet failed (violations increased above baseline).
- `2` — configuration or environment error (see below).

### Exit 2 — what it means and how to fix it

The ratchet exits 2 rather than silently passing whenever the lint run itself
cannot be trusted. There are three cases:

**No files were linted.** If the path does not exist, the `--root` is wrong, or
ESLint's ignore rules exclude everything under the path, the result set is empty
and all counts are zero. Comparing zeros against a real baseline would produce a
false "improvement" — 650 violations apparently fixed by a typo. The script
reports the exact path it tried and exits 2 so the misconfiguration is visible.

```
error: no files were linted for path "/repo/apps/tangent/ui/sr".
       Check that the path exists relative to --root, that cwd is correct,
       and that your ESLint config is not ignoring everything under it.
```

**Parse errors.** Any file ESLint cannot parse is silently skipped by the
default `countByRule` logic (fatal messages have `ruleId === null`). This is
intentional in the unit-test helper, but wrong in the CLI: a file that fails to
parse contributes zero to its rule counts, so one bad import or a generated file
without an ignore can hide real violations. The script lists up to 5 offending
files and exits 2. Fix: correct the parse error, or add an `// eslint-ignore`
comment / an `ignores` entry in `eslint.config.js` for generated files.

```
error: 3 file(s) could not be parsed:
  src/generated/schema.ts: Parsing error: Unexpected token
  … and 2 more
       Fix the parse errors, or add ESLint ignores for generated files.
```

**TS parser unavailable (`--no-config` only).** Without a project `eslint.config.js`,
the script sets up the TypeScript parser itself. If `typescript-eslint` is not
installed, `.ts` and `.tsx` files would silently use the default JS parser, miss
half the codebase, and again count zero violations. The script exits 2 with
install instructions rather than falling back.

```
error: --no-config requires typescript-eslint to parse .ts/.tsx files,
       but it could not be imported. Install it as a devDependency:
         npm install --save-dev typescript-eslint
       or pass --config to use your own eslint.config.js instead.
```

If the app’s TypeScript is newer than the parser supports, use the [isolated lint tool recipe](biome-consumers.md#when-your-typescript-is-newer-than-typescript-eslint-supports); a peer bypass cannot fix a parser’s runtime refusal.

### Non-blocking caveats worth knowing

**The ratchet is per-rule, not per-file.** Fixing one `no-color-literal` in
`card.tsx` while adding one in `table.tsx` nets to zero per rule — the ratchet
passes. This is intentional: a rule-total baseline is the coarsest useful
granularity (per-file baselines are unmaintainable). Reviewers who want
finer-grained enforcement should look at the per-rule counts in the report, not
just the exit code.

**`--update` can raise the baseline.** Committing an `--update` run that records
*more* violations than the previous baseline passes CI — the new baseline is
higher. The git diff on `.eslint-design-baseline.json` is the only record of
this. During code review, a baseline file that shows count increases (positive
delta in the diff) should be treated the same as a `// eslint-disable` comment:
intentional and documented, or a mistake. Require a reason in the commit message.

## Fixing violations

```bash
# See what the rules are finding
npx eslint src --format=compact 2>&1 | grep design/

# Autofix arbitrary values that restate a named step (safe, unambiguous):
npx eslint src --fix --rule 'design/no-arbitrary-scale: error'

# After fixing, update the baseline:
node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs \
  --update --note "fixed arbitrary-scale in card components" src
git add .eslint-design-baseline.json
git commit -m "chore: 30 fewer arbitrary-scale violations (ratchet)"
```

## Accepting technical debt

Sometimes you need to land a PR that introduces a new violation (prototyping,
temporary bridge code). The decision to accept it should be explicit:

```bash
# Update the baseline to include the new violations
node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs \
  --update --note "accept 2 new arbitrary values in prototype/chart.tsx" src

git add .eslint-design-baseline.json
git commit -m "chore(ratchet): accept 2 new violations — bridge chart.tsx (TODO: token)"
```

The commit message is the paper trail. Anyone reading `git log` on
`.eslint-design-baseline.json` sees when and why violations were accepted.

## Phasing out the ratchet

When you reach zero violations, switch the ESLint config to `severity: 'error'`
and remove the ratchet step:

```js
// eslint.config.js — once the baseline is zero for all rules
export default [
  ...(await designConfig({ severity: 'error' })),
]
```

```bash
# Remove the baseline file — it is no longer needed
git rm .eslint-design-baseline.json
git commit -m "chore: no more violations — ratchet retired, gate is strict"
```

At this point the standard ESLint run is the gate and fails on any violation.

## All options

```
node scripts/ratchet.mjs [options] <path>

Options:
  --update              Write a new baseline from the current counts. Exits 0.
  --note <text>         Human note stored in the baseline with --update.
  --root <dir>          Repo root. Default: cwd.
  --baseline <file>     Baseline file path. Default: <root>/.eslint-design-baseline.json.
  --config <file>       ESLint flat config file. Default: the repo's own eslint.config.js.
  --no-config           Use the design rules directly (no eslint.config.js needed).
  --severity warn|error Rule severity in --no-config mode. Default: error.
  --rules <r,r,...>     Comma-separated ruleIds to count. Default: all design/* rules.
  --colors / --no-colors  Force or suppress ANSI output.
  --quiet               Only print the summary line.
  --json                Output machine-readable JSON.
```

## Without eslint.config.js (`--no-config`)

The `--no-config` flag runs the design rules directly, without loading the
project's own ESLint config. This is useful for cross-repo checks or for
running the ratchet against a codebase that has not yet added an
`eslint.config.js`:

```bash
# Count violations in Tangent without touching its config
node node_modules/@hollis-labs/eslint-config-design/scripts/ratchet.mjs \
  --no-config \
  --root /path/to/hollis-labs \
  --baseline /tmp/tangent-probe.json \
  --update \
  apps/tangent/ui/src
```

This is how the CI verify step for adoption is run.

## Biome consumers (CW-20260913-0031)

Biome does not support custom lint plugins, so the design rules cannot run
under Biome today. CW-20260913-0031 is the separate decision task for a Biome
adoption path. A Biome consumer can run the ratchet script alongside Biome's
own checks — the two tools are not exclusive.

## Reading the output

```
eslint-design ratchet — src

  rule                              baseline current   delta
  ─────────────────────────────────────────────────────────
  no-color-literal                         4       4
  no-raw-palette-utility                   0       0
  no-arbitrary-scale                     650     623      -27
  no-undefined-token                       2       2
  no-idiom-shadowing-contract              0       0
  require-disable-reason                   0       0

  ✓ Ratchet holds — 27 violation(s) fixed since baseline.
```

A failure looks like this:

```
  ✗ RATCHET FAILED — new violations introduced:
    design/no-arbitrary-scale: +3

  To fix: remove the new violations, then re-run.
  To accept as debt: run with --update to advance the baseline.
```

## Programmatic API

The ratchet logic is also importable for custom scripts:

```js
import {
  DESIGN_RULES,
  countByRule,
  buildBaseline,
  serializeBaseline,
  parseBaseline,
  compare,
  formatReport,
} from '@hollis-labs/eslint-config-design/ratchet'
```

See [`src/ratchet.js`](../src/ratchet.js) for the full API surface.
