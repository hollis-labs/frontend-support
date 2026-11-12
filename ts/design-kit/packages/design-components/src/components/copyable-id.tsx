import { Check, Copy } from 'lucide-react'
import { useCopy } from '../hooks/use-copy'
import { rowInteractiveProps } from '../lib/row-activation'

interface CopyableIdProps {
  id: string
  /** Optional shorter label to display in place of the full id. */
  label?: string
  /**
   * Mark this control as owning its own clicks, so an ancestor with a row or
   * card activation handler skips it. Default true — this is a button, and
   * clicking it should never also open the row it sits in.
   */
  stopRowActivation?: boolean
}

/** Inline monospace id with click-to-copy — mirrors Torque's CopyableId. */
export function CopyableId({ id, label, stopRowActivation = true }: CopyableIdProps) {
  // sysop-ui inlined useState + navigator.clipboard + a 1500ms setTimeout here —
  // the exact body of `useCopy`, which its two sibling copy affordances already
  // used. Both files land in this package, so the duplicate collapses.
  const { copied, copy } = useCopy()

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    copy(id)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-mono text-caption text-fg-faint transition-colors hover:text-fg-secondary"
      title={`Copy ${id}`}
      aria-label={copied ? `Copied ${id}` : `Copy ${id}`}
      {...rowInteractiveProps(stopRowActivation)}
    >
      {label ?? id}
      {copied ? (
        <Check className="h-2.5 w-2.5 text-success" />
      ) : (
        <Copy className="h-2.5 w-2.5" />
      )}
    </button>
  )
}
