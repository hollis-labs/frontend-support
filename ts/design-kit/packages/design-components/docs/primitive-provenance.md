# Earlier primitive provenance

Attribution audit for CW-20261002-0053, 2026-10-02. **Ships with the next
lockstep release.** This records inherited source; it takes no new implementation
and does not change published tarballs or the package.json licence declaration.

Read the current files and their history before the README's blanket
classification. The original sysop-ui
[components.json](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/components.json)
selects shadcn's `base-nova` registry. File-level comparisons below verify
derivation; Base UI imports alone are not evidence of an independently authored
wrapper. Native HTML, cmdk and Sonner compositions can also be shadcn-derived.

The comparison reference is shadcn/ui
[`36139f6`](https://github.com/shadcn-ui/ui/commit/36139f6200d9c2684ef7695fce5f3d9787378e26)
(2026-05-14), preceding sysop-ui's initial recorded import. Its
[MIT licence](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/LICENSE.md)
carries `Copyright (c) 2023 shadcn` and matches the notice already retained in
this package. This is a historical comparison reference, **not a claim about the
original generator's exact revision**. The earlier copy date/revision is
unrecorded. Dates below are the first recorded commits in this repository's
sysop-ui lineage, not an inferred upstream vendoring date.

Each row compares `src/components/ui/<file>` at that first recorded commit
against `apps/v4/styles/base-nova/ui/<file>` at the reference above. History then
runs through workspace import `9af6845` and design-components extraction
`371a5c6`; Checkbox is recreated during extraction, so follow-renames alone
does not expose its earlier `6c5a828` source. The current wrapper preserves
its indeterminate indicator and state styling. Existing implementation changes
are summarized separately in each header; none are made by this audit.

| Current file (under src/components/ui) | Classification | First recorded sysop-ui source | shadcn registry reference | Evidence from first-recorded comparison |
|---|---|---|---|---|
| [alert-dialog.tsx](../src/components/ui/alert-dialog.tsx) | shadcn-derived | [f4c193c (2026-05-18)](https://github.com/hollis-labs/design-kit/blob/f4c193c446b6fd1f0f8e6446c10a011d56065279/src/components/ui/alert-dialog.tsx) | [base-nova/alert-dialog.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/alert-dialog.tsx) | Same composition/classes except local Button import and cn-font-heading normalization. |
| [badge.tsx](../src/components/ui/badge.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/badge.tsx) | [base-nova/badge.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/badge.tsx) | Byte-for-byte identical. |
| [button.tsx](../src/components/ui/button.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/button.tsx) | [base-nova/button.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/button.tsx) | Byte-for-byte identical. |
| [card.tsx](../src/components/ui/card.tsx) | shadcn-derived | [fe8493c (2026-05-17)](https://github.com/hollis-labs/design-kit/blob/fe8493c3fff57a87de79df99d10dc9cc310e3bad/src/components/ui/card.tsx) | [base-nova/card.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/card.tsx) | Same seven subcomponents and size layout; local surface/border/corner and heading changes. |
| [checkbox.tsx](../src/components/ui/checkbox.tsx) | shadcn-derived | [6c5a828 (2026-05-18)](https://github.com/hollis-labs/design-kit/blob/6c5a828b7b26e44102b08a9a73ace17d93788753/src/components/ui/checkbox.tsx) | [base-nova/checkbox.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/checkbox.tsx) | Same Root/Indicator wrapper and focus/invalid/checked styling; local indeterminate icon/state handling. |
| [command.tsx](../src/components/ui/command.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/command.tsx) | [base-nova/command.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/command.tsx) | Same cmdk composition, slots and classes; sibling import paths and icon ordering differ. |
| [dialog.tsx](../src/components/ui/dialog.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/dialog.tsx) | [base-nova/dialog.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/dialog.tsx) | Same dialog subcomponents, close-button composition and slots; local scrolling Viewport and heading changes. |
| [dropdown-menu.tsx](../src/components/ui/dropdown-menu.tsx) | shadcn-derived | [fe8493c (2026-05-17)](https://github.com/hollis-labs/design-kit/blob/fe8493c3fff57a87de79df99d10dc9cc310e3bad/src/components/ui/dropdown-menu.tsx) | [base-nova/dropdown-menu.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/dropdown-menu.tsx) | Same menu/submenu/check/radio composition and classes; directive, helper classes and formatting differ. |
| [input-group.tsx](../src/components/ui/input-group.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/input-group.tsx) | [base-nova/input-group.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/input-group.tsx) | Same CVA variants, addon focus handling and composition; sibling imports and directive differ. |
| [input.tsx](../src/components/ui/input.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/input.tsx) | [base-nova/input.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/input.tsx) | Byte-for-byte identical. |
| [label.tsx](../src/components/ui/label.tsx) | shadcn-derived | [fe8493c (2026-05-17)](https://github.com/hollis-labs/design-kit/blob/fe8493c3fff57a87de79df99d10dc9cc310e3bad/src/components/ui/label.tsx) | [base-nova/label.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/label.tsx) | Only use-client directive removed. |
| [popover.tsx](../src/components/ui/popover.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/popover.tsx) | [base-nova/popover.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/popover.tsx) | Same popup/positioner and slots; directive removed and heading class added. |
| [scroll-area.tsx](../src/components/ui/scroll-area.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/scroll-area.tsx) | [base-nova/scroll-area.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/scroll-area.tsx) | Only unused React import removed. |
| [select.tsx](../src/components/ui/select.tsx) | shadcn-derived | [f4c193c (2026-05-18)](https://github.com/hollis-labs/design-kit/blob/f4c193c446b6fd1f0f8e6446c10a011d56065279/src/components/ui/select.tsx) | [base-nova/select.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/select.tsx) | Same Root alias, trigger, List and indicators; helper classes, import order and formatting differ. |
| [separator.tsx](../src/components/ui/separator.tsx) | shadcn-derived | [fe8493c (2026-05-17)](https://github.com/hollis-labs/design-kit/blob/fe8493c3fff57a87de79df99d10dc9cc310e3bad/src/components/ui/separator.tsx) | [base-nova/separator.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/separator.tsx) | Only use-client directive removed. |
| [sheet.tsx](../src/components/ui/sheet.tsx) | shadcn-derived | [f4c193c (2026-05-18)](https://github.com/hollis-labs/design-kit/blob/f4c193c446b6fd1f0f8e6446c10a011d56065279/src/components/ui/sheet.tsx) | [base-nova/sheet.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/sheet.tsx) | Same dialog-based sheet, side layout and close composition; sibling imports, icon order and heading differ. |
| [skeleton.tsx](../src/components/ui/skeleton.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/skeleton.tsx) | [base-nova/skeleton.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/skeleton.tsx) | Same element/slot/pulse/corner structure; local background and formatting differ. |
| [sonner.tsx](../src/components/ui/sonner.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/sonner.tsx) | [base-nova/sonner.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/sonner.tsx) | Same toaster options, CSS-variable mapping and icon set; next-themes removed, dark default and import changes. |
| [switch.tsx](../src/components/ui/switch.tsx) | shadcn-derived | [fe8493c (2026-05-17)](https://github.com/hollis-labs/design-kit/blob/fe8493c3fff57a87de79df99d10dc9cc310e3bad/src/components/ui/switch.tsx) | [base-nova/switch.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/switch.tsx) | Only use-client directive removed. |
| [table.tsx](../src/components/ui/table.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/table.tsx) | [base-nova/table.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/table.tsx) | Only use-client directive removed. |
| [tabs.tsx](../src/components/ui/tabs.tsx) | shadcn-derived | [fe8493c (2026-05-17)](https://github.com/hollis-labs/design-kit/blob/fe8493c3fff57a87de79df99d10dc9cc310e3bad/src/components/ui/tabs.tsx) | [base-nova/tabs.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/tabs.tsx) | Same CVA variants, four subcomponents and classes; directive and formatting differ. |
| [textarea.tsx](../src/components/ui/textarea.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/textarea.tsx) | [base-nova/textarea.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/textarea.tsx) | Byte-for-byte identical. |
| [tooltip.tsx](../src/components/ui/tooltip.tsx) | shadcn-derived | [4bc6303 (2026-05-15)](https://github.com/hollis-labs/design-kit/blob/4bc6303fc7f2a9e99cc69e0f60a254917cd92c98/src/components/ui/tooltip.tsx) | [base-nova/tooltip.tsx](https://github.com/shadcn-ui/ui/blob/36139f6200d9c2684ef7695fce5f3d9787378e26/apps/v4/styles/base-nova/ui/tooltip.tsx) | Only use-client directive removed. |

All 23 earlier primitives are verified shadcn-derived. None in this cohort is
classified as a Base UI wrapper only, ours, or unverified. Four first-recorded
files (Badge, Button, Input, Textarea) match byte-for-byte; the others retain the
registry's implementation with the listed differences. This classification
does not assign shadcn authorship to later Hollis Labs modifications.

ButtonGroup, Collapsible and HoverCard were already attributed separately in
[upstream-versions.md](upstream-versions.md); this audit leaves their source and
headers alone. The package LICENSE now names those three and these 23 files.
It retains Hollis Labs MIT first and the complete shadcn MIT notice after it.
No Apache source is introduced by this audit; the broader package.json licence
policy remains with the release owner and Chrispian.

To reproduce the source comparison, retrieve the two linked file revisions for
a row and diff them. To follow local changes, use
`git log --follow -- packages/design-components/src/components/ui/<file>`
and the earlier `git log -- src/components/ui/<file>` (needed for recreated
files such as Checkbox). Read the diffs rather than inferring origin from
component names or a similarity score.
