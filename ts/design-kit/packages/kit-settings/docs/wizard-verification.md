# CW-20261001-0507 wizard verification

Package-only setup wizard, based on merged main `5e1e938`. Grouping/final-submit semantics follow explicit Torque routing8098: static schema-only required-first ordering, one step per group plus review, dynamic validation, one ordered intent array and no multi-group atomicity. No manifest/contract/root/dependency/app changes.

| Check | Result |
| --- | --- |
| `npm run build` | PASS, all workspaces |
| `npm run typecheck` | PASS, all workspaces |
| `npm run test:run` | PASS, all workspaces; kit-settings61 tests (49 prior+12 wizard) |
| `npm run lint` | PASS, all workspaces |
| `node .github/scripts/design-rules-gate.mjs` | PASS,0 violations |
| `npm run demo:build -w @hollis-labs/kit-settings` | PASS |

Production Chromium153.0.8010.12 evidence: [wizard receipt](wizard-browser-receipt.json), [re-run script](wizard-browser.mjs), [existing form/provenance regression receipt](wizard-forms-receipt.json).

| Measurement | 1280px | 390px |
| --- | --- | --- |
| Secret replacement input font/radius | 13px /6px | 13px /6px |
| Read-only text context font | 13px | 13px |
| Group panel radius | 10px | 10px |
| Viewport /document width | 1280 /1280 | 390 /390 |
| Browser errors /fetch-XHR checks | none /none | none /none |

Both authored example manifests complete using keyboard actions (Space/Enter and typed input; no pointer clicks/fill calls). The Nanite flow edits a boolean, sees deployment configuration as a labeled OUTPUT with no inputs, supplies a transient secret, requests explicitly simulated host check results, reviews redacted changes and submits. The Tachyon example edits a connection URL, requests its host result and submits. These are local fixtures, not app onboarding or real connectivity checks.

Required negative controls passed at both widths:

- Absent required secret and a deliberately emptied invalid replacement both keep Next disabled; local feedback exposes `aria-invalid`.
- An unreported check is “Not reported,” never OK. A failed host-required check blocks Next; only a reported OK permits it.
- No save report means “Not reported,” never Saved.
- A two-group intent gets Saved for preferences and Failed for the secret. Both outcomes display truthfully; the failed secret draft remains and resumes when the host supplies its step again. An explicit manual retry completes the remaining group; no automatic retry occurs.
- Step labels/order stay unchanged while drafts and completion change.

Unit checks also cover required field partitioning, controlled navigation, resume from supplied step+draft, optional failed checks, running/idle blocking checks, read-only context, secret redaction, ordered plans shrinking after host snapshot/draft refresh, invalid resumed review submission, saving/busy guards and unsupported schema/version/step failure without controls. Validators are imported unchanged from the existing model.

The existing settings/provenance browser suite still passes at both widths, including style checks and its unknown-source/failed-apply/empty-target/read-only negatives. Accessible names, label associations, current-step markers, error/status text and keyboard behavior are browser semantics evidence. **Live screen-reader speech was not tested.** Real backend authorization, validation, connectivity, atomic writes per group, conflict reconciliation and durability remain host responsibilities. No Tachyon onboarding/provider/plugin integration, publication or packed-consumer gate is included.

## Re-run

Build workspace dependencies and `npm run demo:build -w @hollis-labs/kit-settings`, then serve `packages/kit-settings/demo/dist` on loopback18755. Run:

```sh
FIXTURE_URL=http://127.0.0.1:18755 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_PATH=/absolute/path/to/chromium \
node packages/kit-settings/docs/wizard-browser.mjs $HOME/.cache/design-kit-tmp/wizard-browser-receipt.json
```

The same environment runs `docs/browser.mjs` for the form/provenance regression. Playwright/Chromium are verification tools, not package dependencies. All installs use empty npm user/global configs; scratch and raw logs are under `~/.cache/design-kit-tmp/CW-20261001-0507`.
