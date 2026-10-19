import type { ReactNode } from 'react'

/**
 * The chat item model.
 *
 * WHY A DISCRIMINATED UNION AND NOT A MESSAGE WITH OPTIONAL FIELDS. An
 * optional-field grab-bag lets an author write a "message" that carries a marker's
 * label and no content, and nothing objects until it renders as an empty row. Here
 * `kind` selects the shape, so the invalid combination does not typecheck.
 *
 * AND A CARD IS A SIBLING VARIANT RATHER THAN A FIELD ON A MESSAGE — added by
 * CW-20260910-0129, exactly as this comment predicted it would be. A card that lives
 * *inside* a message forces every consumer of `ChatMessageItem` to know about
 * envelopes, and forces a card to inherit a message's role and author when it has
 * neither. Adding `| ChatCardItem` was additive; unpicking a nested field later
 * would not have been.
 */
export type ChatItem = ChatMessageItem | ChatMarkerItem | ChatCardItem

/** Who a message is from. Not a token — this is chat vocabulary, so it lives here. */
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

interface ChatItemBase {
  /** Stable across re-renders. Used for scroll anchoring and jump-to-message. */
  readonly id: string
}

export interface ChatMessageItem extends ChatItemBase {
  readonly kind: 'message'
  readonly role: ChatRole
  /**
   * ALREADY RENDERED. This package never parses markdown — see the README's
   * "What ChatStream does not do". A host that wants markdown imports
   * `@hollis-labs/kit-chat/markdown` and puts the result here, or renders its own.
   */
  readonly content: ReactNode
  readonly author?: ReactNode
  readonly timestamp?: ReactNode
  /** Rendered after the content, inside the row — actions, reactions, footnotes. */
  readonly footer?: ReactNode
  /**
   * The plain / Markdown text this message was rendered from. `content` is already a
   * `ReactNode` and cannot be turned back into text, so the built-in Copy and
   * Download actions work from this. A message without `source` gets neither action.
   */
  readonly source?: string
}

export interface ChatMarkerItem extends ChatItemBase {
  readonly kind: 'marker'
  /**
   * What the marker is announcing. Distinct from a message because a date break, a
   * tool-call banner and a context-compaction notice are not things anyone said.
   */
  readonly variant: 'date' | 'tool' | 'compaction' | 'error' | 'info'
  readonly label: ReactNode
}

/**
 * The state of a reply that is arriving but is not a message yet.
 *
 * TYPED AS A UNION BECAUSE THE STATES ARE NOT INDEPENDENT. `content` is meaningless
 * when idle, `error` is meaningless while streaming, and a boolean pair
 * (`isStreaming`, `isStalled`) admits `{ isStreaming: false, isStalled: true }`,
 * which is not a state this component can be in. Nanite tracks streaming content
 * separately from committed messages plus a stall timer, and this is that, made
 * explicit.
 */
export type ChatStreamStatus =
  | { readonly status: 'idle' }
  | { readonly status: 'streaming'; readonly role: ChatRole; readonly content: ReactNode }
  | { readonly status: 'stalled'; readonly role: ChatRole; readonly content: ReactNode }
  | { readonly status: 'error'; readonly message: ReactNode }

/**
 * A card in the transcript.
 *
 * THE CARD ITSELF IS A `ReactNode`, AND THAT IS THE SEAM. This package does not
 * resolve bindings, does not own a binding table, and does not import a renderer: a
 * binding table is host-local by construction, so the host resolves the kind, draws
 * the card and puts the result here. `ChatStream` places it in the transcript and
 * owns nothing about what is inside.
 *
 * `wireKind` RIDES ALONG EVEN THOUGH NOTHING HERE READS IT, because a card is the one
 * item type whose identity is not visible in its own content. It is what a host needs
 * for `key`-ing a `CardBoundary`, what jump-to-message and debugging need, and what
 * every miss card has to name. Carrying it is cheap; recovering it from a rendered
 * `ReactNode` is impossible.
 *
 * THERE IS NO `status` FIELD HERE. A card's resolved state belongs to the card —
 * `ConfirmationCard` takes `priorStatus` directly — and duplicating it on the stream
 * item would create two places that can disagree about whether a decision was made.
 */
export interface ChatCardItem extends ChatItemBase {
  readonly kind: 'card'
  /** The wire kind this card was drawn for. See above for why it is here. */
  readonly wireKind: string
  /** Already drawn by the host. */
  readonly content: ReactNode
  /** Optional label above the card — "from the planner", a timestamp. */
  readonly author?: ReactNode
  readonly timestamp?: ReactNode
}
