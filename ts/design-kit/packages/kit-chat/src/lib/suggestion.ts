import type { IconComponent } from '@hollis-labs/design-components'

/**
 * The suggestion model, and the pure functions the composer's autocomplete is built
 * on.
 *
 * TWO TRIGGER KINDS, NOT ONE WITH A DIFFERENT CHARACTER. Settled with Chrispian
 * 2026-09-12: *"we want to use them to insert references into the chat like files,
 * and / will give a list of slash commands the user can select."* Those are different
 * operations and typing them as one is how a props surface grows an options bag:
 *
 *   `@` — a REFERENCE. The selection becomes text in the message body and travels
 *         with it when the message is sent. Insertion is the whole point.
 *   `/` — a COMMAND. The selection is a choice, not a word. It may set a pending
 *         command, clear the composer, or fire an action, and assuming it inserts
 *         text is wrong.
 *
 * So `CommandTrigger` REQUIRES an `onSelect` — a command that does nothing is a bug,
 * and here it is a compile error — while `ReferenceTrigger` carries the insertion
 * knobs (`value`, `suffix`) that mean nothing to a command.
 *
 * BOTH ARE HOST-SUPPLIED. This package does not know what a file is, what commands
 * exist, or how to search either. It renders a menu over items it is given and
 * reports a selection. The moment it knows what a file is it stops being reusable.
 *
 * THE FUNCTIONS BELOW ARE PURE ON PURPOSE. Caret arithmetic is where autocomplete
 * actually goes wrong — a trigger matched mid-word, a query that swallows the next
 * line, an insertion that loses the text after the caret — and none of that is
 * observable by rendering a menu and looking at it.
 */

/** The shape a suggestion must have. Hosts extend it; the composer is generic over it. */
export interface SuggestionItem {
  readonly id: string
  readonly label: string
  /** For a reference, the text inserted in place of the query. Defaults to `label`. */
  readonly value?: string
  readonly description?: string
  readonly icon?: IconComponent
  /** Extra strings the filter should match on, beyond `label`. */
  readonly keywords?: readonly string[]
}

interface TriggerBase<TItem extends SuggestionItem> {
  readonly id: string
  /** Single character that opens the menu. */
  readonly char: string
  readonly items: readonly TItem[]
  /** Only trigger at the start of a line. Commands usually want this; references do not. */
  readonly atLineStart?: boolean
  /** Keep the menu open across spaces. Off by default — a space normally ends a query. */
  readonly allowSpaces?: boolean
  /** Shown when the query matches nothing. */
  readonly emptyLabel?: string
}

/**
 * `@`-style. Selecting inserts `value ?? label` into the message body, replacing the
 * trigger and query.
 */
export interface ReferenceTrigger<TItem extends SuggestionItem = SuggestionItem>
  extends TriggerBase<TItem> {
  readonly kind: 'reference'
  /** Appended after the inserted value. Defaults to a single space. */
  readonly suffix?: string
  /** Notification only — the insertion happens either way. */
  readonly onInsert?: (item: TItem) => void
}

/**
 * `/`-style. Selecting reports the choice and does NOT insert the item as text.
 *
 * The composer removes the `/query` span, because leaving `/cle` behind after
 * choosing `clear` is wrong in every host. Anything beyond that is the host's: it owns
 * `value`, so `onSelect` may set the composer to whatever it likes, and a later write
 * wins over the removal.
 */
export interface CommandTrigger<TItem extends SuggestionItem = SuggestionItem>
  extends TriggerBase<TItem> {
  readonly kind: 'command'
  readonly onSelect: (item: TItem) => void
}

export type ChatTrigger<TItem extends SuggestionItem = SuggestionItem> =
  | ReferenceTrigger<TItem>
  | CommandTrigger<TItem>

export interface ActiveSuggestion<TItem extends SuggestionItem = SuggestionItem> {
  readonly trigger: ChatTrigger<TItem>
  /** Text between the trigger character and the caret. May be empty. */
  readonly query: string
  /** Index of the trigger character in the source text. */
  readonly from: number
  /** Caret index — the end of the query. */
  readonly to: number
}

const WHITESPACE = /\s/

/**
 * Find the suggestion in play at `caret`, if any.
 *
 * A trigger opens a query when its character sits at the start of the text or after
 * whitespace — never mid-word, so an email address does not open a reference menu and
 * a path does not open a command menu. Returns `null` rather than throwing for every
 * "no menu here" case, including an out-of-range caret, because a caret arriving ahead
 * of a controlled value is ordinary during fast typing rather than an error.
 */
export function detectSuggestion<TItem extends SuggestionItem>(
  text: string,
  caret: number,
  triggers: readonly ChatTrigger<TItem>[],
): ActiveSuggestion<TItem> | null {
  if (caret < 0 || caret > text.length) return null

  for (const trigger of triggers) {
    if (trigger.char.length !== 1) continue

    let from = -1
    for (let i = caret - 1; i >= 0; i--) {
      const ch = text[i]
      if (ch === trigger.char) {
        from = i
        break
      }
      if (!trigger.allowSpaces && WHITESPACE.test(ch)) break
      if (ch === '\n') break
    }
    if (from === -1) continue

    const before = from === 0 ? '' : text[from - 1]
    const atLineStart = from === 0 || before === '\n'
    if (trigger.atLineStart && !atLineStart) continue
    if (!atLineStart && !WHITESPACE.test(before)) continue

    return { trigger, query: text.slice(from + 1, caret), from, to: caret }
  }

  return null
}

/**
 * Replace a REFERENCE's trigger-and-query span with the chosen item.
 *
 * Returns the whole next value plus where the caret belongs, rather than mutating a
 * textarea, so the composer stays controlled and this stays testable. Text after the
 * caret is preserved — the bug this shape exists to prevent.
 */
export function applyReference<TItem extends SuggestionItem>(
  text: string,
  active: ActiveSuggestion<TItem>,
  trigger: ReferenceTrigger<TItem>,
  item: TItem,
): { readonly text: string; readonly caret: number } {
  const inserted = `${trigger.char}${item.value ?? item.label}${trigger.suffix ?? ' '}`
  const next = text.slice(0, active.from) + inserted + text.slice(active.to)
  return { text: next, caret: active.from + inserted.length }
}

/**
 * Remove a COMMAND's trigger-and-query span, leaving the rest of the draft intact.
 *
 * Separate from `applyReference` because a command inserts nothing, and expressing
 * that as "insert the empty string" would put the two operations behind one function
 * whose behaviour depends on a flag.
 */
export function removeSuggestion<TItem extends SuggestionItem>(
  text: string,
  active: ActiveSuggestion<TItem>,
): { readonly text: string; readonly caret: number } {
  return { text: text.slice(0, active.from) + text.slice(active.to), caret: active.from }
}

/**
 * Filter a trigger's items against the query.
 *
 * Case-insensitive substring over `label`, `value` and `keywords`. An empty query
 * matches everything, which is what makes typing the bare trigger character show the
 * full list. Deliberately not fuzzy: `cmdk` does its own scoring when it filters, and
 * two filters disagreeing about what matched is worse than one plain one.
 */
export function filterSuggestions<TItem extends SuggestionItem>(
  items: readonly TItem[],
  query: string,
): readonly TItem[] {
  const q = query.trim().toLowerCase()
  if (q === '') return items
  return items.filter((item) => {
    const haystack = [item.label, item.value ?? '', ...(item.keywords ?? [])]
    return haystack.some((h) => h.toLowerCase().includes(q))
  })
}
