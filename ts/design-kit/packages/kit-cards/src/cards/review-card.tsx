import { useState, type ReactNode } from 'react'
import { GitPullRequestArrow } from 'lucide-react'
import { Button, Textarea } from '@hollis-labs/design-components'
import { AnswerableNotices, ResolvedFooter } from '../answerable'
import { useAnswerable, type AnswerableStateProps } from '../answerable-state'
import { ActionBar } from '../layout'
import type { CardResponder } from '../response'
import type { DiffSide } from './diff-card'
import { Envelope, EnvelopeBody, EnvelopeFooter, EnvelopeHeader } from './envelope'

/**
 * An answerable diff: look at before/after, then approve, request changes or reject.
 *
 * REUSE CHECK. `DiffCard` draws the two sides and is read-only with its own chassis,
 * so nesting it would put an Envelope inside an Envelope. The side panes are
 * re-drawn here from the same tokens rather than extracted, which is a duplication
 * the follow-up list records (extract a `DiffPanes` into cards/ once a third caller
 * exists). The decision row is the shared answerable machinery.
 *
 * "Request changes" requires a note; the note travels in `decisions[].note`, so the
 * host never has to guess what was wanted.
 */

export interface ReviewCardProps extends AnswerableStateProps {
  readonly title: ReactNode
  readonly description?: ReactNode
  readonly before: DiffSide
  readonly after: DiffSide
  readonly format?: 'text' | 'code'
  /** Opaque id the decision is recorded against. */
  readonly itemId: string
  readonly onRespond: CardResponder
  readonly className?: string
}

export function ReviewCard({
  title,
  description,
  before,
  after,
  format = 'text',
  itemId,
  onRespond,
  priorStatus,
  busy,
  stale,
  onReload,
  elevation,
  receipt,
  supersededBy,
  className,
}: ReviewCardProps) {
  const a = useAnswerable({ priorStatus, busy, stale, elevation })
  const [note, setNote] = useState('')
  const [asking, setAsking] = useState(false)
  const pane = format === 'code' ? 'font-mono text-xs' : 'text-control'

  function decide(action: 'approve' | 'request-changes' | 'reject', withNote?: string) {
    return a.run(() =>
      onRespond({
        status: 'submitted',
        decisions: [{ itemId, action, ...(withNote ? { note: withNote } : {}) }],
      }),
    )
  }

  return (
    <Envelope accent={a.live ? 'info' : undefined} muted={!a.live} className={className}>
      <EnvelopeHeader icon={GitPullRequestArrow} tone="info" label="Review" />
      <EnvelopeBody title={title} description={description}>
        <div className="grid grid-cols-1 overflow-hidden rounded-control border border-border-subtle sm:grid-cols-2">
          {[
            { side: before, tone: 'text-danger', dot: 'bg-danger' },
            { side: after, tone: 'text-success', dot: 'bg-success' },
          ].map(({ side, tone, dot }, index) => (
            <div key={index} className="min-w-0 border-border-subtle max-sm:border-t first:max-sm:border-t-0 sm:border-l first:sm:border-l-0">
              <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-1.5">
                <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
                <span className={`truncate font-mono text-caption font-semibold uppercase tracking-label ${tone}`}>{side.label}</span>
              </div>
              <div className={`max-h-64 overflow-auto whitespace-pre-wrap p-3 leading-relaxed text-fg-secondary ${pane}`}>{side.content}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <AnswerableNotices stale={stale} onReload={onReload} elevation={elevation} />
          {asking && a.live ? (
            <label className="flex flex-col gap-1.5 text-control font-medium text-fg">
              What should change?
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={a.disabled} className="text-control" />
            </label>
          ) : null}
        </div>
      </EnvelopeBody>
      {a.live && !elevation ? (
        <EnvelopeFooter>
          {a.busy ? <span role="status" className="text-caption text-fg-muted">Submitting…</span> : null}
          <ActionBar>
            {asking ? (
              <>
                <Button type="button" variant="ghost" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => setAsking(false)}>Back</Button>
                <Button type="button" size="sm" disabled={a.disabled || note.trim() === ''} className="max-sm:min-h-11" onClick={() => void decide('request-changes', note.trim())}>
                  Send request
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => void a.run(() => onRespond({ status: 'canceled' }))}>Dismiss</Button>
                <Button type="button" variant="outline" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => void decide('reject')}>Reject</Button>
                <Button type="button" variant="outline" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => setAsking(true)}>Request changes</Button>
                <Button type="button" size="sm" disabled={a.disabled} className="max-sm:min-h-11" onClick={() => void decide('approve')}>Approve</Button>
              </>
            )}
          </ActionBar>
        </EnvelopeFooter>
      ) : a.live ? null : (
        <ResolvedFooter state={a.state} receipt={receipt} supersededBy={supersededBy} focusOnMount={a.transitioned} />
      )}
    </Envelope>
  )
}
