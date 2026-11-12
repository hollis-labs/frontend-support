# Upstream versions

Ports follow the shared design-components vendoring convention.

| Component | Upstream source | Version | Vendored | Divergences |
|---|---|---|---|---|
| CodeBlock | packages/elements/src/code-block.tsx | ai-elements 1.9.0 @ 6a9d5b1822ffb10bba4bd97175f01edd7d8651cd (2026-08-21) | 2026-10-02 | Base UI primitives, plain root entry, host highlighter, contract vars, no global cache, copy lifecycle |
| Snippet | packages/elements/src/snippet.tsx | same pinned version | 2026-10-02 | Semantic group + shared Input/Button, contract tokens, read-only exact-source copying |
| FileTree | packages/elements/src/file-tree.tsx | same pinned version | 2026-10-02 | Base UI + shared controlled state; immutable Sets; honest groups/native buttons; sibling actions; contract tokens |
| StackTrace | packages/elements/src/stack-trace.tsx | same pinned version | 2026-10-02 | One disclosure root; sibling copy action; retained unknown frames; host path callback; linear delimiter parsing with length cap; safe coordinates; contract tokens |
| TestResults | packages/elements/src/test-results.tsx | same pinned version | 2026-10-02 | Base UI suites; finite bounded progress; zero duration; named statuses; contract tokens |
| Commit | packages/elements/src/commit.tsx | same pinned version | 2026-10-02 | Base UI trigger/sibling actions; phrasing metadata; initials marker; safe dates/counts; clipboard lifecycle; contract tokens |
| Agent | packages/elements/src/agent.tsx | same pinned version | 2026-10-02 | Local schema descriptor; shared JsonViewer; independent Base UI disclosures; inert instructions; contract tokens; no AI SDK |
| Terminal | packages/elements/src/terminal.tsx | same pinned version | 2026-10-02 | Opt-in `/terminal` on the optional ansi-to-react peer; contract tokens, ANSI roles as utilities; untrusted-output handling (no links, no inline colours, control sequences other than colour removed, bounded to the last `maxChars`); copy is the visible text; named status/labelled actions, `role="log"` focusable region, reduced-motion cursor |

All source ports are Vercel Apache-2.0; full terms are in LICENSE. The structural
highlight adapter, clipboard helper and `terminal-text.ts` are original Hollis Labs MIT code.
