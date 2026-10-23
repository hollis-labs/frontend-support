/**
 * @hollis-labs/kit-cards — the card chassis, the card shapes, and what answers them.
 *
 * PROPS DOWN, OUTCOMES UP. This package never fetches, sends or subscribes, and never
 * builds a wire response: a card reports a `CardOutcome` and the host owns the wire
 * kind, payload binding, routing, mutations, approval policy, state and persistence.
 * The lifecycle engine (`@hollis-labs/kit-cards/engine`) is headless and takes its
 * rules as data and its clock from the host.
 *
 * ONE Envelope chassis lives here. `@hollis-labs/kit-chat` re-exports it rather than
 * carrying a second; chat-only chrome stays in kit-chat.
 *
 * PROMOTION RULE. A card is promoted into this package when TWO OR MORE apps use it,
 * and it ships with (1) a golden example payload, (2) a story/fixture per state, and
 * (3) token-only styling. An app's one-off card composes from the primitives here and
 * contributes back once a second app wants it.
 */

export * from './cards'

/* The response seam. See response.ts for why emit is closed and read is open. */
export { acceptsInput, classifyPriorResponse } from './response'
export type {
  CardAnswer,
  CardDecision,
  CardOutcome,
  CardResponder,
  PriorResponseState,
} from './response'

/* The tool-confirmation context: ConfirmationCard owns it, kit-chat's slots read it. */
export { ConfirmationCardContext, useConfirmationCard } from './confirmation-context'

/* Shared answerable state, the receipt slot and notices. */
export { AnswerableNotices, CardNotice, ResolvedFooter } from './answerable'
export type { CardNoticeProps, ResolvedFooterProps } from './answerable'
export { resolvedLabel, useAnswerable } from './answerable-state'
export type { AnswerableState, AnswerableStateProps, CardElevation, CardReceipt } from './answerable-state'

/* The closed layout set. */
export { ActionBar, Field, Row, Section, Stack } from './layout'
export { fieldDescribedBy, fieldIds } from './field-ids'
export type { ActionBarProps, FieldProps, LayoutGap, RowProps, StackProps } from './layout'

/* Form-from-schema: the JSON-Schema subset and its compile/validate layer. */
export { coerceValue, compileFormSchema, validateField, validateForm } from './form/schema'
export type { CompiledForm, FormErrors, FormField, FormFieldKind, FormValues } from './form/schema'
