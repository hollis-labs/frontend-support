# Shared cn retirement — CW-20261002-0014

This is an internal refactor with no behaviour change on base `c7cb62b`.
The authored helpers have identical `clsx` + `extendTailwindMerge` configurations:
font-size from `TEXT_TOKENS`, with no other extensions. No class-output difference
comes from those configurations on this base.

PR #47 is separate and held for a radius decision. Its proposed configuration
would differ: `cn('rounded-lg', 'rounded-control')` currently retains both
classes but the proposed helper returns `rounded-control`; reversing the inputs
currently retains both but the proposed helper returns `rounded-lg`. This
receipt does not verify that proposed radius change. If it lands first, reassess
equivalence against the new main before landing this refactor.

## Before the production import swap

The existing `src/__tests__/cn.test.ts` ran unchanged against its local helper:
**6/6 passed**. Only the test's import was then temporarily redirected to
`@hollis-labs/design-components`: **6/6 passed** again, before any production
imports changed. The test was restored and the tree was clean.

- [Local helper run](receipts/shared-cn-before-local.log), 2026-10-02 01:20:50 UTC.
- [Shared helper run](receipts/shared-cn-before-shared.log), 01:20:52 UTC.

Orch approved preserving all six cases verbatim in `shared-cn.test.ts`, described
as “shared cn behaviour kit-chat relies on”. Expectations are unchanged. Its
header records their eventual home in design-components after #47 is decided.
The local helper and its old test filename are removed. All ten production
consumers (cards, ChatInput, ChatStream and markdown) use the shared export.
There are no design-components, root, dependency, version or range edits.

## Packed consumer proof

Reused agent 1's existing `release-verify/pack.py` and `run.py` unchanged, outside
the repository. The tarballs were packed from clean source commit
`f6ce16ed492077e9e78e00385418ab6ced7dfc5e`; the subsequent commit adds only this
report, logs and receipt. All executable source in the final PR is the packed
source. [Raw receipt and tarball/harness SHA-256 values](receipts/shared-cn-packed.json).
The receipt retains the harness's original CW-20261001-0659 task label; this
invocation and source pin verify CW-20261002-0014.

Run: `~/.cache/design-kit-tmp/release-verify/runs/20261002T012416Z`.
Node 24.21.0, Playwright 1.61.1, Chromium 153.0.8010.12, Linux x64.
The consumer installed real local tarballs with empty npm user/global configs,
no workspace links, duplicate Hollis packages, dependency problems or peer warnings.

| Check | Actual result |
| --- | --- |
| Desktop composer and message bubble, 1280px | Both 13px |
| Narrow composer and message bubble, 390px | Both 13px |
| Short-stream Jump to latest | Hidden |
| Long-stream Jump to latest | Visible; clicking reaches end, remainder 0px |
| Prepend anchor | 74.75px → 75.25px; 0.5px delta |
| History extent | 2048px → 2767px; scroll top 300px → 1018px |
| Browser diagnostics | Zero page errors and console warnings/errors |
| Full existing harness | All eight checks pass, including its negative CSS-import control |

The chat check's values match agent 1's prior passing run at
`20261001T231259Z` (source `ca88a833b07986451dd0029e65e85f14d561adc3`), including
13px at both widths, jump visibility, 0.5px prepend delta and 0px end remainder.
This is a comparison with that prior receipt, not a claim that it used today's
base. Today's pre-swap evidence is the authored configuration diff and exact
six-case run above.

## Reproduce

Use a clean committed checkout and the existing external harness:

```sh
export TMPDIR="$HOME/.cache/design-kit-tmp"
export GOTMPDIR="$TMPDIR"
python3 "$TMPDIR/release-verify/pack.py" /absolute/path/to/checkout \
  "$TMPDIR/0014-packed-rerun"
python3 "$TMPDIR/release-verify/run.py" "$TMPDIR/0014-packed-rerun"
```

`pack.py` installs, builds and packs six packages without publishing and records
the clean source pin. `run.py` creates a fresh consumer, installs and builds
positive/negative variants, then measures shipped output. It writes a unique
run receipt and refreshes the original harness task's external draft report.
`VERIFY_CHROMIUM` overrides the cached browser path if needed.

Repository checks all pass: typecheck, test:run (**650 tests**, kit-chat **100**
with the six cases retained), build (pack.py build/prepack), lint and design rules
(**0 violations**). No new count or source-agreement gate was added.

Scope: sampled packed components and scroll behavior in headless Chromium.
External applications, other browsers, the held radius proposal and publishing
are outside this task. This refactor ships with the next kit-chat release.
