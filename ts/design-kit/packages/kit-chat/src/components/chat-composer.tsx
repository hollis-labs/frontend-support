import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { ChatInput, type ChatInputProps } from './chat-input'
import type { SuggestionItem } from '../lib/suggestion'

export interface ChatComposerProps<TItem extends SuggestionItem = SuggestionItem>
  extends Omit<ChatInputProps<TItem>, 'value' | 'onValueChange' | 'onSubmit'> {
  readonly defaultValue?: string
  /**
   * Called with the trimmed draft; empty drafts are not submitted. The draft clears
   * once the call returns, unless it returned `false` (or a promise resolving to
   * `false`, or rejecting): the host kept the text, e.g. because a send failed.
   */
  readonly onSubmit: (value: string) => boolean | void | Promise<boolean | void>
  /** Reports each edit, for hosts that persist a draft. Optional; never required to type. */
  readonly onDraftChange?: (value: string) => void
}

/**
 * A composer that OWNS ITS DRAFT.
 *
 * `ChatInput` is controlled, which is right for a host that needs the text, but it
 * invites keeping the draft in the page component, so every keystroke re-renders the
 * transcript. This wrapper holds the draft here, memoized, so typing re-renders only
 * the composer. Pair it with `ChatStream`'s memoized rows.
 *
 * Switching conversations: give the composer a `key` per conversation so a send that is
 * still pending cannot clear the next conversation's draft.
 */
function ChatComposerImpl<TItem extends SuggestionItem = SuggestionItem>({
  defaultValue = '',
  onSubmit,
  onDraftChange,
  ...input
}: ChatComposerProps<TItem>) {
  const [draft, setDraft] = useState(defaultValue)
  // The latest draft, readable from a send that finishes later. Callbacks stay out of
  // state updaters: an updater may run more than once and must not notify the host.
  const draftRef = useRef(defaultValue)
  const mounted = useRef(true)
  const onDraftChangeRef = useRef(onDraftChange)
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange
  }, [onDraftChange])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const change = useCallback((next: string) => {
    draftRef.current = next
    setDraft(next)
    onDraftChangeRef.current?.(next)
  }, [])
  const submit = useCallback((raw: string) => {
    const text = raw.trim()
    if (!text) return
    // Clear only if the draft is still what was sent. A completion after the composer is
    // gone (unmount, or a conversation switch that remounts it via `key`) does nothing:
    // it must not tell the host to empty a draft that belongs to something else now.
    const clear = () => {
      if (!mounted.current || draftRef.current.trim() !== text) return
      draftRef.current = ''
      setDraft('')
      onDraftChangeRef.current?.('')
    }
    let result: boolean | void | Promise<boolean | void>
    try { result = onSubmit(text) } catch { return }
    if (result instanceof Promise) void result.then((ok) => { if (ok !== false) clear() }, () => undefined)
    else if (result !== false) clear()
  }, [onSubmit])
  return <ChatInput {...input} value={draft} onValueChange={change} onSubmit={submit} />
}

export const ChatComposer = memo(ChatComposerImpl) as typeof ChatComposerImpl
