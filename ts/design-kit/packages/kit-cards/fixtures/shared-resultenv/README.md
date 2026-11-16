# Shared result envelope fixture snapshot

These files mirror `agent/resultenv/schema/resultenv.schema.json` and
`agent/resultenv/testdata/fixtures.json` from the `hollis-labs/libs` work on
CW-20261116-0007. The source branch is `chatsdk/CW-20261116-0007-result-envelope`;
this snapshot was copied from pushed head `6fe38f6b77bad3d63a206b882b0a99c4e0a2a9dc`.

The schema and provenance checks run during the kit-cards build and typecheck.
They reject a changed local snapshot until its contract, adapter, and source
commit are reviewed. The shared fixtures feed the gallery and DOM tests.
Before integration, run `npm run check:resultenv-upstream -- --sdk-root <libs-checkout>`
against the exact reviewed libs head. The command fails if that head or either
copied file differs from `provenance.json`.
