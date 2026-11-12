# Chat core slice A verification

CW-20261002-0044, 2026-10-02. Chromium against the built kit-chat and
Base UI design-components exports, with Tailwind v4 source registration and
all ten built-in token themes. The fixture is [demo/chat-core.tsx](../demo/chat-core.tsx).
The Vite/Playwright harness ran in the agent's private TMPDIR, without app data or transport.

Verified next/wraparound selection, host action callback and visible tooltip.
Computed shimmer animation and token gradient were checked for all 20 theme/mode
combinations. Reduced motion disables animation/gradient and keeps readable text.
Removing only the opt-in shimmer CSS rules gives ordinary readable muted text.
The 390px mobile reduced-motion fixture has no horizontal overflow. No page errors.
See [computed-style receipt](chat-core-a-browser.json).

| Theme | Light | Dark |
| --- | --- | --- |
| dir-a | [image](screenshots/chat-core-a/dir-a-light.png) | [image](screenshots/chat-core-a/dir-a-dark.png) |
| dir-b | [image](screenshots/chat-core-a/dir-b-light.png) | [image](screenshots/chat-core-a/dir-b-dark.png) |
| dir-d | [image](screenshots/chat-core-a/dir-d-light.png) | [image](screenshots/chat-core-a/dir-d-dark.png) |
| dir-e | [image](screenshots/chat-core-a/dir-e-light.png) | [image](screenshots/chat-core-a/dir-e-dark.png) |
| dir-f | [image](screenshots/chat-core-a/dir-f-light.png) | [image](screenshots/chat-core-a/dir-f-dark.png) |
| nanite-default | [image](screenshots/chat-core-a/nanite-default-light.png) | [image](screenshots/chat-core-a/nanite-default-dark.png) |
| sysop-amber-phosphor | [image](screenshots/chat-core-a/sysop-amber-phosphor-light.png) | [image](screenshots/chat-core-a/sysop-amber-phosphor-dark.png) |
| sysop-green-phosphor | [image](screenshots/chat-core-a/sysop-green-phosphor-light.png) | [image](screenshots/chat-core-a/sysop-green-phosphor-dark.png) |
| sysop-hi-contrast | [image](screenshots/chat-core-a/sysop-hi-contrast-light.png) | [image](screenshots/chat-core-a/sysop-hi-contrast-dark.png) |
| sysop-p4-white | [image](screenshots/chat-core-a/sysop-p4-white-light.png) | [image](screenshots/chat-core-a/sysop-p4-white-dark.png) |

[Mobile reduced motion](screenshots/chat-core-a/mobile-reduced-motion.png).

Root npm ci/initial build, typecheck, lint, test:run, build and design-rules gate
all exited 0. The design gate reported zero violations. npm pack --dry-run --json
--ignore-scripts includes LICENSE and src/styles/keyframes.css. No version,
dependency or range changed; the opt-in stylesheet export was added.

This creates the package LICENSE and changes the next published tarball. It does
not publish the package. App integration, screen-reader behavior, other browsers,
and downstream notice redistribution were not verified. Collapsible-dependent
components, Tool/Confirmation/Queue and the rest of batch 1 belong to later PRs.
