import { useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode, Ref } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import {
  cn,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  Textarea,
} from '@hollis-labs/design-components'
import {
  applyReference,
  detectSuggestion,
  filterSuggestions,
  removeSuggestion,
  type ActiveSuggestion,
  type ChatTrigger,
  type SuggestionItem,
} from '../lib/suggestion'

export interface ChatInputProps<TItem extends SuggestionItem = SuggestionItem> {
  /** Controlled. This component holds no draft of its own. */
  readonly value: string
  readonly onValueChange: (value: string) => void
  /** Enter submits; Shift+Enter inserts a newline. Not called while `busy`. */
  readonly onSubmit: (value: string) => void

  readonly placeholder?: string
  readonly disabled?: boolean
  /** A reply is in flight. The composer stays editable; submit is suppressed. */
  readonly busy?: boolean
  /** Optional host-owned cancellation. No transport or lifecycle action is implied. */
  readonly onStop?: () => void
  /** Hide the built-in action when a host supplies its own submit control. */
  readonly showSubmitButton?: boolean

  /**
   * What opens a menu. A `reference` trigger inserts its selection into the message;
   * a `command` trigger reports it and inserts nothing. See `lib/suggestion`.
   */
  readonly triggers?: readonly ChatTrigger<TItem>[]

  /**
   * Previously sent messages, newest last. Arrow-up from an empty composer walks
   * backwards through them.
   *
   * PROP-DRIVEN, DELIBERATELY. Nanite keeps this in `localStorage` at module scope
   * with a 50-entry cap, which means two composers on one page share a history and a
   * test cannot control it. Whose history it is, how long it lives and whether it
   * persists at all are the host's questions.
   */
  readonly history?: readonly string[]

  /**
   * Which way the suggestion menu opens. Defaults to `'top'`, which is right for a
   * composer at the bottom of a transcript — the idiom this package is for.
   *
   * THE COMPONENT DOES NOT MEASURE AVAILABLE SPACE, DELIBERATELY. Auto-flipping means
   * either a positioning dependency — the thing this package spent three decisions
   * avoiding — or hand-rolled measurement with resize and scroll listeners, which is
   * a lot of machinery to buy back a case the idiom does not have. A host that places
   * the composer mid-page knows something the component cannot, so it says so here.
   * If auto-flip ever becomes a real requirement, this prop is the seam it grows from.
   */
  readonly menuSide?: 'top' | 'bottom'

  readonly toolbarStart?: ReactNode
  readonly toolbarEnd?: ReactNode
  readonly className?: string
  readonly textareaRef?: Ref<HTMLTextAreaElement>
  readonly 'aria-label'?: string
}

/**
 * The composer.
 *
 * WHY A TEXTAREA AND NOT A RICH EDITOR. Decided by CW-20260910-0128 against measured
 * install cost: TipTap adds 14,832 kB to a consumer's `node_modules` and Lexical
 * 23,968 kB, while this route adds **nothing** — `cmdk` is already a runtime
 * dependency of `@hollis-labs/design-components`, and `Command`, `Textarea` and the
 * rest are already exported from it, already token-compliant and already lint-clean.
 * For a package many apps install, a suggestion menu composed from primitives that
 * are already paid for beats 14 MB of ProseMirror.
 *
 * THE COST, STATED RATHER THAN HIDDEN: a textarea cannot render a mention as an
 * inline chip. Nanite's TipTap composer can. What a textarea gives back is plaintext
 * fidelity on submit — which is what a chat message is, and what a rich document has
 * to be flattened into anyway. If chips become a requirement, this is the component
 * that changes and the change is contained to it.
 *
 * WHY THE MENU IS NOT IN A `Popover`. A popover portals its content and moves focus,
 * and this menu must leave focus in the textarea so typing keeps filtering it. Base
 * UI's focus management is right for a popover and wrong for a combobox driven from
 * another element, and fighting it is more code than positioning a container. `cmdk`
 * still provides the list semantics and the highlight; only the placement is ours.
 */
export function ChatInput<TItem extends SuggestionItem = SuggestionItem>({
  value,
  onValueChange,
  onSubmit,
  placeholder = 'Send a message…',
  disabled = false,
  busy = false,
  onStop,
  showSubmitButton = true,
  triggers,
  history,
  menuSide = 'top',
  toolbarStart,
  toolbarEnd,
  className,
  textareaRef,
  'aria-label': ariaLabel = 'Message',
}: ChatInputProps<TItem>) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null)
  const suggestionsRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState<ActiveSuggestion<TItem> | null>(null)
  const [highlighted, setHighlighted] = useState<string>('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)

  const matches = useMemo(
    () => (active ? filterSuggestions(active.trigger.items, active.query) : []),
    [active],
  )
  const open = active !== null

  // cmdk owns and overrides list/option IDs. Connect the external textarea to
  // those actual DOM IDs after commit rather than inventing dangling targets.
  useLayoutEffect(() => {
    const input = innerRef.current
    const list = suggestionsRef.current
    if (!input) return
    const option = list ? Array.from(list.querySelectorAll('[role="option"]'))
      .find((node) => node.getAttribute('data-value') === highlighted) : undefined
    if (open && list) input.setAttribute('aria-controls', list.id)
    else input.removeAttribute('aria-controls')
    if (open && option) input.setAttribute('aria-activedescendant', option.id)
    else input.removeAttribute('aria-activedescendant')
  }, [open, highlighted, matches])

  /*
   * `useImperativeHandle` rather than a hand-merged callback ref. Merging by hand
   * means writing to a ref that arrived as a prop, which `react-hooks/immutability`
   * objects to and is right to: a function that mutates a prop after render is how a
   * ref ends up pointing at a node from a previous render. React does the same
   * forwarding here, for both callback and object refs, without anyone mutating.
   */
  useImperativeHandle(textareaRef, () => innerRef.current as HTMLTextAreaElement, [])

  const refresh = useCallback(
    (text: string, caret: number) => {
      if (!triggers || triggers.length === 0) {
        setActive(null)
        return
      }
      const next = detectSuggestion(text, caret, triggers)
      setActive(next)
      const first = next ? filterSuggestions(next.trigger.items, next.query)[0] : undefined
      setHighlighted(first?.id ?? '')
    },
    [triggers],
  )

  const handleChange = useCallback(
    (text: string, caret: number) => {
      setHistoryIndex(null)
      onValueChange(text)
      refresh(text, caret)
    },
    [onValueChange, refresh],
  )

  const choose = useCallback(
    (item: TItem) => {
      if (!active) return
      const { trigger } = active

      /*
       * The two kinds diverge here and nowhere else. A reference becomes text; a
       * command has its span removed and is reported. The host owns `value`, so a
       * command's `onSelect` may set the composer to anything and its write lands
       * after ours.
       */
      const next =
        trigger.kind === 'reference'
          ? applyReference(value, active, trigger, item)
          : removeSuggestion(value, active)

      onValueChange(next.text)
      setActive(null)

      if (trigger.kind === 'reference') trigger.onInsert?.(item)
      else trigger.onSelect(item)

      // Restore the caret after React commits the controlled value.
      queueMicrotask(() => {
        const el = innerRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(next.caret, next.caret)
      })
    },
    [active, value, onValueChange],
  )

  const move = useCallback(
    (delta: number) => {
      if (matches.length === 0) return
      const at = matches.findIndex((m) => m.id === highlighted)
      const next = (at + delta + matches.length) % matches.length
      setHighlighted(matches[next].id)
    },
    [matches, highlighted],
  )

  const recall = useCallback(
    (delta: number) => {
      if (!history || history.length === 0) return false
      const at = historyIndex === null ? history.length : historyIndex
      const next = at + delta
      if (next < 0 || next > history.length) return false
      setHistoryIndex(next === history.length ? null : next)
      onValueChange(next === history.length ? '' : history[next])
      return true
    },
    [history, historyIndex, onValueChange],
  )

  const submit = useCallback(() => {
    const trimmed = value.trim()
    if (trimmed === '' || busy || disabled) return
    onSubmit(trimmed)
    setHistoryIndex(null)
  }, [value, busy, disabled, onSubmit])

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter commits an IME candidate before it can mean send or select.
      if (event.nativeEvent.isComposing || event.keyCode === 229 || disabled) return
      if (open) {
        if (event.key === 'ArrowDown') return event.preventDefault(), move(1)
        if (event.key === 'ArrowUp') return event.preventDefault(), move(-1)
        if (event.key === 'Escape') return event.preventDefault(), setActive(null)
        if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
          const item = matches.find((m) => m.id === highlighted)
          if (item) {
            event.preventDefault()
            choose(item)
            return
          }
        }
      }

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        submit()
        return
      }

      // Start recall from empty; keep walking until the recalled draft is edited.
      if (!open && (value === '' || historyIndex !== null) && event.key === 'ArrowUp' && recall(-1)) event.preventDefault()
      else if (!open && historyIndex !== null && event.key === 'ArrowDown' && recall(1))
        event.preventDefault()
    },
    [open, move, matches, highlighted, choose, value, disabled, submit, recall, historyIndex],
  )

  return (
    <div
      className={cn('relative flex min-w-0 flex-col gap-2 rounded-panel border border-border-subtle bg-bg-elevated p-3 transition-colors focus-within:border-ring', className)}
      data-slot="chat-input"
    >
      {open && active ? (
        <div
          className={cn(
            'absolute left-0 z-50 w-full overflow-hidden rounded-panel border border-border bg-bg-elevated shadow-lg',
            menuSide === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
          data-slot="chat-input-suggestions"
        >
          <Command shouldFilter={false} value={highlighted} onValueChange={setHighlighted}>
            <CommandList ref={suggestionsRef} className="max-h-64">
              <CommandEmpty className="text-control text-fg-muted">
                {active.trigger.emptyLabel ?? 'No matches'}
              </CommandEmpty>
              <CommandGroup>
                {matches.map((item) => {
                  const Icon = item.icon
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => choose(item)}
                      onPointerDown={(event) => event.preventDefault()}
                      className="gap-2"
                    >
                      {Icon ? <Icon className="size-4 text-fg-muted" aria-hidden /> : null}
                      <span className="text-control text-fg">{item.label}</span>
                      {item.description ? (
                        <span className="ml-auto text-caption text-fg-faint">{item.description}</span>
                      ) : null}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      ) : null}

      <Textarea
        ref={innerRef}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        // The primitive uses md:text-sm. A typed length reference lets its
        // merger replace that size even before it knows our named type scale.
        className="min-h-16 max-h-64 resize-none rounded-none border-0 bg-transparent px-0 py-1 text-control shadow-none focus-visible:ring-0 md:text-(length:--text-control)"
        onKeyDown={onKeyDown}
        onChange={(e) => handleChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        onClick={(e) => {
          const el = e.currentTarget
          refresh(el.value, el.selectionStart ?? el.value.length)
        }}
        onBlur={() => setActive(null)}
      />

      {toolbarStart || toolbarEnd || showSubmitButton ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2" data-slot="chat-input-toolbar">
          {toolbarStart}
          <div className="ml-auto flex items-center gap-2">
            {busy ? <span className="text-caption text-fg-muted" role="status">Responding…</span> : null}
            {toolbarEnd}
            {showSubmitButton ? (
              busy && onStop ? (
                <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onStop} aria-label="Stop response">
                  <Square className="size-3.5" aria-hidden />
                  Stop
                </Button>
              ) : (
                <Button type="button" size="sm" disabled={disabled || busy || value.trim() === ''} onClick={submit} aria-label="Send message">
                  <ArrowUp className="size-4" aria-hidden />
                  Send
                </Button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
