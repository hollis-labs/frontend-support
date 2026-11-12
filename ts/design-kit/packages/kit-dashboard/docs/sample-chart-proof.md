# Timestamp-sample chart evidence

CW-20261002-0001, base `9c31579`, 2026-10-02. This is a controlled feature fixture,
not a deployed consumer or a claim about retention. Start the package demo and
open `/samples.html`. The sample fixture contains gauge and cumulative-counter
views, and existing day-summing bar and area views.

At **1440px and 390px**, under `prefers-reduced-motion: reduce`, the browser proof
reads the actual SVG plot bounds, dots, paths and zero-axis tick. It verifies:

- Null has no mark at its timestamp x, and no path segment connects its neighbours.
- Zero has a dot at the zero-axis baseline.
- Same-day values 2 and 4 stay two plotted samples at their timestamps. The other
  finite values (0 and 3) are unchanged; no day sum is used.
- The line and dots resolve the named `primary` token, no hidden chart is a tab
  stop, the null row is available in the text table, and the page has no horizontal
  overflow. There are no browser exceptions.

All three geometry checks pass at both widths. Negative controls temporarily
change the **actual component**, then restore it in `finally`:

| Mutation | Assertion that fails | Widths |
| --- | --- | --- |
| `connectNulls=true` | Gap: a segment joins across the missing x | 1440, 390 |
| Filter out finite zero | Zero: no dot at its x/baseline | 1440, 390 |
| Sum the same-day fixture's values for each finite point | Gauge: points no longer have the supplied y values | 1440, 390 |

The correct implementation is rechecked after restoration. The negative runner
succeeds only when the targeted assertion fails; an ordinary proof run exits
nonzero for these wrong implementations. These are feature tests, not a new CI
gate or a ratchet over mutable documentation.

## Existing day chart

`time-series-chart.tsx` is byte-identical to base `9c31579`, SHA-256
`33b35631cdbf47411fb7705b5b769ad79f4d213a4876dd2fd039d11ac1950163`.
Every existing dashboard test file is unchanged: **25 existing tests pass**, plus
3 new text-alternative tests. The primary tree has no pre-existing
TimeSeriesChart-specific test or fixture, so the new browser fixture exercises
both old kinds without modifying them: two events on the same UTC day sum to 6,
and the earlier days are zero-filled.

Before the negative experiments, baseline markup is captured from these old
bar/area fixtures with time fixed to `2026-10-01T12:00:00Z`. After restoring the new
component, the old fixture markup is compared as exact strings, including SVG
paths and attributes. **4/4 old rendered outputs are byte-identical** (two kinds
at two widths); no ID normalization or geometry tolerance is used for that check.
This supplements unchanged-source and unchanged-test evidence.

## Reproduce

From the repository root, build siblings, then start:

```sh
TMPDIR="$HOME/.cache/design-kit-tmp" GOTMPDIR="$HOME/.cache/design-kit-tmp" \
  npm run demo -w @hollis-labs/kit-dashboard -- --host 127.0.0.1 --port 5201
```

In another terminal, set `PLAYWRIGHT_MODULE` to an installed `playwright-core`
module and `CHROMIUM_PATH` to a Chromium executable; add any needed runtime-library
path via `LD_LIBRARY_PATH`. These tools are isolated from workspace dependencies;
no package or lockfile changes are needed. Then:

```sh
PROOF_BASELINE=1 node packages/kit-dashboard/demo/scripts/sample-proof.mjs
node packages/kit-dashboard/demo/scripts/sample-negative-controls.mjs
```

`PROOF_URL` can override the server URL. `PROOF_OUTPUT` can redirect artifacts to
a scratch directory. Committed receipts are in
[screenshots/timestamp-samples](screenshots/timestamp-samples): `before.json`,
`after.json`, three negative receipts, two exact old-fixture baselines and desktop/
narrow screenshots. Run from the repo root to use the default artifact path.

The root typecheck, lint, test and build pass, and the design-rules gate reports
**0 violations**. No version/range changes or publishing happen here. This
additive API ships in the next coordinated dashboard minor; kit-observe cannot
publish until that release is on the registry.
