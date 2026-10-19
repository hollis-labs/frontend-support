# Changelog

## Unreleased

- Add opt-in `/terminal` (Terminal, TerminalHeader, TerminalTitle, TerminalStatus, TerminalActions, TerminalCopyButton, TerminalClearButton, TerminalContent) on the optional `ansi-to-react` peer; the main entry does not import it. Output is treated as untrusted: React text with `useClasses` and `linkify={false}` (no links, no inline colours), control sequences other than colour removed by linear patterns (a malformed sequence leaves no raw ESC: invariants checked on 240,000 seeded inputs), `\r`/`\b` normalised in linear time before the peer (its `escape-carriage` regex takes ~6 s on one line of 65,536 carriage returns), rendering bounded to the last `maxChars` (default 65,536) with a visible note, copy of the visible text. ANSI colours map onto contract utilities. `useClipboard` gains an optional lazy `getText`.
- Add Commit with a native Base UI trigger, sibling copy actions, phrasing metadata slots, guarded dates/counts and contract file-status tokens.
- Add Agent using local tool descriptors and shared JsonViewer, independent Base UI disclosures and inert instructions/schema text; no AI SDK types or highlighting dependency. Commit and AgentTool each needs next design-components release (unreleased).
- Add metadata tests and light/dark browser evidence across built-in themes.

- Add FileTree, StackTrace and TestResults with Base UI disclosures, contract tokens, immutable controlled expansion, sibling actions, exact trace copying and accessible bounded progress. These components use Collapsible/shared controlled state and each needs next design-components release (unreleased).
- Bound stack-frame regex matching to 1,000 characters; longer tool-supplied lines remain unknown text, preventing crafted delimiter backtracking during render.
- Add inspection tests and light/dark browser evidence across all built-in themes.

- Add CodeBlock with exact plain-text rendering, optional line numbers, header/actions, copy controls and Base UI language selectors; main entry has no highlighting dependency.
- Add Snippet with a read-only command input, prefix/addon slots and accessible copying.
- Add opt-in /highlight: one host-owned Shiki core JS-engine adapter shared structurally with kit-chat/markdown. Selected grammars only; contract colours and plain fallback; no global cache or code-key collisions.
- Retain AI Elements provenance and full Apache-2.0 terms. Add unit tests and light/dark evidence across built-in themes. Planned disclosure components need the next design-components release (unreleased).
- Add the private kit-code workspace skeleton; nothing publishes.
