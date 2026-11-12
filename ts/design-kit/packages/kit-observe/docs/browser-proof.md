# kit-observe browser proof

CW-20261001-0510, package half only. Base main `5e1e938` includes merged
kit-settings and the reviewed dashboard chart prerequisite (PR #43). The demo
reads the authored Nanite/Tachyon example manifests and supplies bounded fixture
responses. No live endpoint, transport, polling, retained-history owner or app
integration is claimed.

At **1440px and 390px**, both manifest demos are captured. Computed styles match
named contract utilities: the resource heading is `text-label` (11px in this
palette), panel borders match `border-border-subtle`, and the shared chart line
matches `primary`. Page width fits the viewport; the standalone demo allows
document scrolling rather than inheriting the fixed-shell clipping reset.

The same browser run verifies:

- Unknown aggregate/check health stays unknown, with no healthy label. A pending
  first request exposes no optimistic result. Returned degraded/unhealthy results
  are separate from request errors.
- Real zero, null/missing and pending stats remain distinct. Each row keeps its
  own resource state; a pending stat cannot acquire a loaded sibling's value.
- Initial loading, refresh with retained evidence, stale timestamp/age, failed
  refresh with the old timestamp/value, first failure with no chart, unsupported
  resources and paused polling. Retry invokes the controlled fixture callback.
- Null series rows, truncated/incomplete requested ranges, successful empty
  ranges, and Tachyon's undeclared history as unsupported. Exact plotted geometry
  and mutation controls belong to dashboard PR #43, consumed here without copying.
- Polite `role=status` announcements and loading `aria-busy`; error/validation
  alerts; named diagnostic data regions. Inline-schema details work by keyboard.
- Nested diagnostics remain plain text (the literal `<b>idle</b>` does not create
  HTML), copy writes only the supplied JSON, host invalid/unsupported validation
  is visible and withholds the payload, and remote schema references cause no
  network request. No browser exceptions occur.

A source-mutation negative control maps an unknown aggregate to healthy. The
**ordinary proof exits 1** at its “Unknown health must never render healthy”
assertion. A control run records detection at both widths. The runner restores
source in `finally`, then rechecks the correct implementation and re-captures
all four screenshots. This demonstrates the semantic assertion catches a false
healthy fallback; it is a feature control, not a new CI gate.

## Reproduce

Build the workspace and start the demo from repo root:

```sh
TMPDIR="$HOME/.cache/design-kit-tmp" GOTMPDIR="$HOME/.cache/design-kit-tmp" npm run build
TMPDIR="$HOME/.cache/design-kit-tmp" GOTMPDIR="$HOME/.cache/design-kit-tmp" \
  npm run demo -w @hollis-labs/kit-observe -- --host 127.0.0.1 --port 5202
```

Set `PLAYWRIGHT_MODULE` to an installed playwright-core module and `CHROMIUM_PATH`
to its Chromium executable, plus `LD_LIBRARY_PATH` if runtime libraries need an
isolated location. No browser dependency/lockfile edit is required. Then:

```sh
node packages/kit-observe/docs/observe-browser.mjs
node packages/kit-observe/docs/unknown-negative-control.mjs
```

`PROOF_URL` overrides the fixture URL; `PROOF_OUTPUT` redirects evidence to a
scratch directory. Default committed artifacts:

- [Desktop Nanite](screenshots/nanite-1440.png) and [narrow Nanite](screenshots/nanite-390.png).
- [Desktop Tachyon](screenshots/tachyon-1440.png) and [narrow Tachyon](screenshots/tachyon-390.png).
- [Computed-style/state receipt](receipts/observe-browser.json) and
  [negative control receipt](receipts/negative-unknown.json).

Sixteen feature tests cover controlled state/retention, clock failures, unknown
health, scalar distinctions, diagnostics and exact `at`→`t` delegation without
changing values. Existing workspace tests remain unchanged. The five-check gate
includes the new package at zero through the explicitly authorized enrollment.
No packed-tarball check or release is part of private 0.0.0; publishing must wait
for a dashboard minor with the new chart surface and coordinated range updates.

## StatCollection heading fix (CW-20261002-0082)

The updated existing browser check passes at 1440px and 390px: StatCollection's
h2 computes to **13px / 600** (`text-control font-semibold`). The undefined
`text-heading` utility previously left it inheriting body size and weight.
The same run passes the existing observation, diagnostic, keyboard and layout
checks with no page errors or remote-schema requests. See the
[heading-fix receipt](receipts/heading-fix-browser.json). This run uses the
workspace demo; it does not claim packed-artifact or consumer integration proof.
