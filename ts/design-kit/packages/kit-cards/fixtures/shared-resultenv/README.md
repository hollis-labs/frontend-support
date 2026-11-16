# Shared result envelope fixture snapshot

These files mirror `agent/resultenv/schema/resultenv.schema.json` and
`agent/resultenv/testdata/fixtures.json` from the `hollis-labs/libs` work on
CW-20261116-0007. The source branch is `chatsdk/CW-20261116-0007-result-envelope`;
this snapshot was copied from pushed head `6fe38f6b77bad3d63a206b882b0a99c4e0a2a9dc`.

The schema check in `scripts/check-resultenv-schema.mjs` runs during the
kit-cards build and typecheck. It rejects a changed schema until the generated
TypeScript contract and adapter are reviewed. The shared fixtures
feed the gallery and DOM tests. Before integration, compare this snapshot with
the exact reviewed libs head and update both files together if that head changed.
