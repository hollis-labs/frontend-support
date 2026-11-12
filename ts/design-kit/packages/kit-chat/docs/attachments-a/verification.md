# Attachment slice evidence

CW-20261002-0045, PR A. Primary package source was read before browser evidence.
The demo fixture mounted `demo/attachments.tsx` with React 19, Vite 5.4.21,
Tailwind 4, the three documented CSS imports and explicit Tailwind registration
of the demo source. Themes/modes were set on the document root. The chosen image
was a local workflow demo capture supplied through the real native file input;
no remote asset or screenshot-capture component was added.

`browser.json` records Chromium checks for real file selection/image previews,
local file drop and drag feedback (including cancelling disabled file drops), host removal/URL revocation, disabled intake,
unchanged ChatInput @ trigger, real Popover keyboard Enter opening, click/touch-tap opening,
Escape closing and focus return. Twenty screenshots capture the open preview in
all ten themes, light and dark. The list names `border-border` explicitly.

Unit tests use the real components and native events for data presentation,
removal/cancellation/disabled behavior, native picker reset/cancellation, accept
MIME/extension and size/count rejection events, and local drop/host cancellation.
They deliberately do not open Base UI Portal/Positioner/Popup: this environment's
jsdom hangs on that primitive independently of kit code. The actual open popup
and focus lifecycle are covered by Chromium; there are no skipped tests.

A separate registry-only consumer installed the packed candidate, published
design-components/design-tokens 0.3.0 and the documented React/Base UI/lucide
peers, with optional dependencies omitted. Vite's platform binaries were added
only as scratch tooling. `npm ls streamdown` returned empty; no streamdown
directory existed. An entry importing only ChatStream produced a production
build and rendered a plain transcript in Chromium with zero page errors.
This checks the optional renderer boundary, not consumer CSS coverage.

The registry design-components 0.3.0 tarball was inspected directly: Button,
Popover/Trigger/Content, Dialog and Command exports already exist there. This
slice imports no unreleased ButtonGroup, Collapsible, HoverCard or shared hook.

Not covered: uploading/server validation, persistence, app migrations, clipboard
file intake, global drop, attachment-only ChatInput submission, or other browsers.
The host owns accepted file/list/URL lifecycle and appropriate media destinations.
