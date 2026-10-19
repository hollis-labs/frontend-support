import { useCallback, useState } from 'react'

/**
 * UI, not transport — which is why this is in `design-components` and `use-poll`
 * is not.
 *
 * The clipboard write is one line of platform API and carries no opinion. The
 * value here is `copied`: a flag that holds a **button label swap** for 1.5s. That
 * is an affordance with a UI-tuned duration, both its callers are components, and
 * it ships with `CopyButton`.
 */
export interface UseCopyResult {
  /** True for `resetMs` after a successful copy. */
  copied: boolean
  /** Write `text` to the clipboard; flips `copied` true on success. */
  copy: (text: string) => void
}

/**
 * Clipboard hook — `copied` flips true for `resetMs` (default 1.5s) after a
 * successful `copy()`. Clipboard failures are swallowed silently.
 */
export function useCopy(resetMs = 1500): UseCopyResult {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    (text: string) => {
      // GUARDED, and this is a repair rather than caution. sysop-ui wrote
      // `navigator.clipboard.writeText(...)` and caught only the promise
      // rejection — but `navigator.clipboard` is UNDEFINED outside a secure
      // context, and reading `.writeText` off it throws synchronously, out of a
      // click handler, aborting React's dispatch for that event. The doc comment
      // said failures are swallowed silently; they were not. Found by the first
      // test written against this package, where jsdom has no clipboard.
      const clipboard = navigator.clipboard
      if (!clipboard) return
      void clipboard
        .writeText(text)
        .then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), resetMs)
        })
        .catch(() => {})
    },
    [resetMs],
  )

  return { copied, copy }
}
