# Chat extension slots

`kit-chat` renders host state. The host still owns context, shared items, drawers, context-slot selection, transcript items, and send/stop transport. These extension surfaces let an app keep those features without forking the composer or transcript.

| Need | Typed API | Where it renders |
| --- | --- | --- |
| Context chips | `ChatContextChips` with `ChatContextChip[]` | `ChatComposer.above` |
| Shared-item strip | `ChatSharedItemsStrip` with `ChatSharedItem[]` | `ChatComposer.above` |
| Drawer controls | `ChatDrawerToggles` with `ChatDrawerToggle[]` | `ChatComposer.toolbarStart` or `toolbarEnd` |
| Context-slot picker | `ChatSlotPicker` with `ChatSlotOption[]`, `value`, `onChange` | `ChatComposer.footer` or toolbar |
| Rich editor | `ChatComposer.renderEditor(ChatComposerEditorProps)` | Replaces only the default textarea |
| Message/card/marker rows | `ChatStream.renderers` | Per-kind override; unspecified kinds retain the default renderer |
| Notices | `ChatNotice` | From a marker renderer, or in a host status area |
| Steps fold | `ChatStepsFold` with `ChatStepItem[]` | In a host-rendered card or row |

The full rendered fixture is [`../demo/extension-slots.tsx`](../demo/extension-slots.tsx). It exercises every slot with local state, including a second editor built on `contentEditable`. The fixture has no API or transcript store.

## Composer editor contract

`renderEditor` receives the current plain-text `value`, `onValueChange`, guarded `onSubmit`, `placeholder`, `disabled`, `busy`, and an accessible label. The rich editor flattens its document to plain text before `onValueChange`. `ChatComposer` still owns draft isolation and clears a successful send only when the current draft matches what was sent. Returning or resolving `false`, rejecting, or throwing keeps the draft.

The default textarea retains the kit's `@`/`/` suggestion behavior, history arrows, and IME-safe Enter. A replacement editor owns its own suggestion UI, history keys, focus, and keyboard handling; `renderEditor` does not make Tiptap or another editor a dependency of kit-chat. Keep a stable `renderEditor` function when possible, and key `ChatComposer` by conversation so an old send cannot clear another conversation's draft.

## Stream contract

`renderers` can override `message`, `marker`, or `card` independently. Existing `renderItem` takes precedence when supplied. A renderer receives the typed item for its kind. Keep `renderers` and unchanged `items` entries referentially stable to preserve row memoization. A marker is a transcript event, while `ChatNotice` is its visual treatment; the host decides whether a compaction, error, or other event becomes a marker. `ChatStepsFold` accepts already rendered step content and does not parse tool receipts. The tool row and tool card are separate kit-cards/kit-chat surfaces.

For app adoption detail, see [`adoption-parity.md`](adoption-parity.md).
