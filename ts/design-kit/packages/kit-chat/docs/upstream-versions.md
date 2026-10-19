# AI Elements upstream inventory

| Adopted | CLI | Upstream commit | Source date |
| --- | --- | --- | --- |
| 2026-10-02 | ai-elements 1.9.0 | `6a9d5b1822ffb10bba4bd97175f01edd7d8651cd` | 2026-08-21 |

| Local source | Upstream source | Divergences |
| --- | --- | --- |
| src/components/artifact.tsx | packages/elements/src/artifact.tsx | Expanded viewer beside compact ArtifactCard; shared Base UI Button/Tooltip render composition; required nonempty labels, native buttons, bounded focusable content; host lifecycle/rendering; tokens |
| src/components/open-in.tsx | packages/elements/src/open-in-chat.tsx | Base UI menu; required host href/label/icon catalog; reject non-HTTP(S) destinations; native explicit new-tab links; no defaults/query construction/brand exports; tokens |
| src/components/suggestion.tsx | packages/elements/src/suggestion.tsx | Shared Button/cn; native focusable scrolling; token radius; host callback |
| src/components/context.tsx | packages/elements/src/context.tsx | Own numeric usage/cost props, no ai/tokenlens/catalog/network; unknown stays unknown; guarded native progress; Base UI Popover keyboard/touch |
| src/components/question.tsx | packages/elements/src/question.tsx | Shared Button/Textarea/cn; native radio/checkboxes; host text policy; async submission lock/error callback; no transport/persistence |
| src/components/model-selector.tsx | packages/elements/src/model-selector.tsx | Shared Base UI Dialog/Command, token styles; consumer ReactNode logo slot without brands/hotlinks; semantic title inside popup |
| src/components/attachments.tsx, src/lib/attachment.ts | packages/elements/src/attachments.tsx | Own data; shared Button/cn; Base UI Popover instead of hover-only preview; visible removal; tokens |
| src/components/attachment-dropzone.tsx | packages/elements/src/prompt-input.tsx (attachment sections only) | Local picker/dropzone emits files/rejections; host list and URL lifetime; no stores/global listeners/screenshots/composer logic; extension matching; tokens |
| src/components/message.tsx | packages/elements/src/message.tsx | Actions and branching only; Base UI tooltips; native group; controlled branch; normalized children/count; no AI SDK or markdown deps; tokens |
| src/components/shimmer.tsx, src/styles/keyframes.css | packages/elements/src/shimmer.tsx | motion/react → opt-in CSS; no module cache; token colors/spacing; reduced motion |
| src/components/tool.tsx | packages/elements/src/tool.tsx | Base UI; own ToolState/name; JsonViewer/host content instead of CodeBlock; falsy output retained; tokens |
| src/components/confirmation.tsx | packages/elements/src/confirmation.tsx | Subordinate slots inside existing ConfirmationCard; no second card/actions; opaque host-selected IDs and host messages; no AI SDK |
| src/components/queue.tsx | packages/elements/src/queue.tsx | Base UI; native bounded scrolling list; chevron follows aria-expanded; actions visible for keyboard/touch; token geometry/colors |
| src/components/reasoning.tsx | packages/elements/src/reasoning.tsx | Base UI/local state; host-rendered content and elapsed seconds; auto-open once per streaming run; no Streamdown/plugins; opt-in CSS; tokens |
| src/components/chain-of-thought.tsx | packages/elements/src/chain-of-thought.tsx | Base UI/local state; shared disclosure root fixes header/panel linkage; tokens; bounded image slot |
| src/components/sources.tsx | packages/elements/src/sources.tsx | Base UI root props; non-link provenance when href absent; merged classes; tokens |
| src/components/plan.tsx | packages/elements/src/plan.tsx | Base UI render composition; token radius; span Shimmer avoids nested paragraphs |

| src/components/image.tsx | packages/elements/src/image.tsx | Own native src/alt/mediaType props; no AI SDK/base64 conversion; token radius |
| src/components/inline-citation.tsx | packages/elements/src/inline-citation.tsx | Base UI interactive HoverCard, visible tabbability and verified keyboard portal handoff, host labels/text, controlled local pager/wraparound; no embla; tokens |

The package-root LICENSE ships the original Hollis Labs MIT text and upstream
Vercel attribution/full Apache-2.0 text. The pin contains no upstream NOTICE.
Keep upstream names and per-file provenance; record future pins without erasing
history. Follow design-components/docs/vendoring.md when updating these ports.
