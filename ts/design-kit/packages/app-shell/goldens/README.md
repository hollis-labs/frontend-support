# SF-6 page-type goldens (confirmed by Chrispian 2026-11-12)

Mocks of the six Substrate page types on the Hollis kit, theme nanite-default dark, at 1440 and 390 wide.
- golden-list-detail.html: list + detail (12 frames)
- golden-pages.html: settings, form, auth/keys, action menu, multi-plugin nav (22 frames)
- shots/: one PNG per frame (all frames). Open a frame with `#frame-id`.
- gen.py, gen2.py: generators (`python3 -I gen2.py`; gen2 imports gen). Output paths in them point at /tmp/sf6/out.
Mock CSS uses the kit's token values for fidelity; the real build uses kit components and token names only.
Spec, shared rules, kit components reused and gaps: tesseract item 01M6MRM52Q61PMK2A8DVBF0FCJ (project/designer/workspace/drafts/flows).
Secrets in the keys frames are placeholder values.
