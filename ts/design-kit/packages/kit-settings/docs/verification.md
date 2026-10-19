# CW-20261001-0506 verification

Verified 2026-10-02 from a fresh task worktree based on main `4379fbe` (merged kit-settings PR42). This extends the private `0.0.0` package; no root/dependency/app changes or publication. The apply API follows the explicit routing in Torque comment8051: host-reconciled projection, no implicit target derivation and no kit-owned restart state.

| Check | Result |
| --- | --- |
| `npm run build` | PASS, all workspaces |
| `npm run typecheck` | PASS, all workspaces |
| `npm run test:run` | PASS, all workspaces; kit-settings 49 tests (30 existing +19 provenance/apply) |
| `npm run lint` | PASS, all workspaces |
| `node .github/scripts/design-rules-gate.mjs` | PASS, 0 violations |
| `npm run demo:build -w @hollis-labs/kit-settings` | PASS |

The final package was rebuilt and linted and the design gate repeated after the last permission-aware caption review. All passed.

[Browser receipt](browser-receipt.json), produced by [browser.mjs](browser.mjs) against the production demo with Chromium153.0.8010.12:

| Measurement | 1280px | 390px |
| --- | --- | --- |
| Input / select / save+apply button font | 13px | 13px |
| Input+button radius / panel radius | 6px / 10px | 6px / 10px |
| Viewport / document width | 1280 / 1280 | 390 / 390 |
| Page errors | none | none |

Both authored manifests render. The demo supplies explicit illustrative source/apply metadata: env deployment, override secrets/preferences, file connection and default connections after override removal. The renderer never interprets schema defaults as values or computes resolution.

At both widths, real keyboard Space toggled a boolean, Tab reached a select, ArrowDown changed it, and Enter activated save/reset and apply. Local errors expose `aria-invalid` and an associated description. Rejected saves retain drafts; successful secret replacement clears only through the host. Existing read-only negatives still reject real input and forced submission makes no save.

New negative controls at both widths:

- An unknown source kind makes that group unavailable; it renders no default provenance or mutation buttons.
- A host apply failure shows its error and retains `pending_restart`. Only a later host-supplied successful snapshot/projection changes the field to active.
- A conservative pending restart on a field with no declared target plus an empty host target list shows “the app did not say what to restart” and no apply button.

Unit coverage additionally exercises all four provenance kinds, presence-only secret sources, missing source, unknown apply state, contradictory declarations, busy apply callback guards, absent/invalid/duplicate targets, host targets different from declarations, unknown state never becoming active, and both directions of projection/snapshot disagreement. Pending state is read from props on every render; no restart state lives in the kit.

Browser accessibility evidence covers named forms, labels/required/invalid/disabled/descriptions/status/alerts and real keyboard behavior. **Live screen-reader speech was not tested.** Real app/backend authorization, resolution, restart lifecycle and durability, dogfood0508, wizard0507 and publishing/packed-tarball verification remain outside this work.

## Re-run

Build the workspace and demo, then serve `packages/kit-settings/demo/dist` on loopback (for example Python's HTTP server on18755). Run:

```sh
FIXTURE_URL=http://127.0.0.1:18755 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium \
node packages/kit-settings/docs/browser.mjs $HOME/.cache/design-kit-tmp/settings-browser-receipt.json
```

Playwright/Chromium are verification tools, not package dependencies. Npm uses empty user/global configs; scratch work and raw logs live under `~/.cache/design-kit-tmp/CW-20261001-0506`. Earlier0505 evidence remains in its task receipt directory.
