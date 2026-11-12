import { memo, useCallback, useMemo, useEffect, useRef, useState, type ReactNode } from 'react'
import { MessageScroller } from '@shadcn/react/message-scroller'
import { Check, Copy, Download, Info, LoaderCircle } from 'lucide-react'
import { cn, Button } from '@hollis-labs/design-components'
import { MessageAction, MessageActions } from './message'
import { copyText, downloadMarkdown, safeFileName } from '../lib/message-export'
import type {
  ChatCardItem,
  ChatItem,
  ChatMarkerItem,
  ChatMessageItem,
  ChatStreamStatus,
} from '../lib/types'

export interface ChatStreamProps {
  /** Ordered oldest-first. The host owns this list; this component never mutates it. */
  readonly items: readonly ChatItem[]

  /**
   * The reply in flight, if any. Rendered after `items` and outside them, because a
   * partially-arrived message is not a message yet.
   */
  readonly status?: ChatStreamStatus

  /**
   * Render one item. Optional — there is a reasonable default — but this is the seam
   * a kit or an app uses to render its own bubbles, and the seam CW-20260910-0129
   * uses to draw a card when it adds `ChatCardItem` to the union.
   */
  readonly renderItem?: (item: ChatItem) => ReactNode

  /**
   * Built-in per-message actions for the default renderer: Copy and Download
   * (Markdown) appear on any message that carries `source`; Details appears when
   * `onDetails` is given. Ignored by a custom `renderItem`, which owns its own row.
   * Off by default so existing transcripts do not change.
   */
  readonly messageActions?: {
    readonly copy?: boolean
    readonly download?: boolean
    readonly onDetails?: (item: ChatMessageItem) => void
  }

  /** Shown when `items` is empty and nothing is streaming. */
  readonly empty?: ReactNode
  /** Initial history load; suppresses the empty-conversation state. */
  readonly loading?: boolean
  /** Presentation only. The host or a history adapter owns fetching and pagination. */
  readonly history?: {
    readonly hasOlder: boolean
    readonly loading: boolean
    readonly onLoadOlder: () => void
    readonly error?: ReactNode
  }

  /** Label for the jump-to-latest control. */
  readonly jumpLabel?: ReactNode

  /**
   * Keep the view pinned to the newest message. Scrolling away releases it; the
   * scroller handles that, and the jump control brings it back.
   */
  readonly autoScroll?: boolean

  /**
   * Hold scroll position when older items are prepended, so loading history does not
   * move the reader. On by default because a chat that jumps on backfill is broken.
   */
  readonly preserveScrollOnPrepend?: boolean

  readonly className?: string
  readonly viewportClassName?: string
  readonly 'aria-label'?: string
}

const MARKER_TONE = {
  date: 'text-fg-faint',
  tool: 'text-info',
  compaction: 'text-fg-muted',
  error: 'text-danger',
  info: 'text-fg-muted',
} as const satisfies Record<ChatMarkerItem['variant'], string>

const ROLE_ALIGN = {
  user: 'items-end',
  assistant: 'items-start',
  system: 'items-start',
  tool: 'items-start',
} as const satisfies Record<ChatMessageItem['role'], string>

function DefaultMessageActions({ item, actions }: { readonly item: ChatMessageItem; readonly actions: NonNullable<ChatStreamProps['messageActions']> }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const source = item.source
  const onCopy = useCallback(() => {
    if (source === undefined) return
    void copyText(source).then(() => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    }, () => undefined)
  }, [source])
  const showCopy = actions.copy && source !== undefined
  const showDownload = actions.download && source !== undefined
  if (!showCopy && !showDownload && !actions.onDetails) return null
  return (
    <MessageActions data-slot="chat-message-actions">
      {showCopy ? <MessageAction label={copied ? 'Copied' : 'Copy message'} tooltip="Copy" onClick={onCopy}>{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</MessageAction> : null}
      {showDownload ? <MessageAction label="Download message as Markdown" tooltip="Download" onClick={() => downloadMarkdown(safeFileName(`${item.role}-${item.id}`, 'message'), source ?? '')}><Download className="size-3.5" /></MessageAction> : null}
      {actions.onDetails ? <MessageAction label="Message details" tooltip="Details" onClick={() => actions.onDetails?.(item)}><Info className="size-3.5" /></MessageAction> : null}
    </MessageActions>
  )
}

function DefaultMessage({ item, actions }: { readonly item: ChatMessageItem; readonly actions?: ChatStreamProps['messageActions'] }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', ROLE_ALIGN[item.role])}>
      {item.author || item.timestamp ? (
        <div className="flex items-baseline gap-2">
          {item.author ? (
            <span className="text-label tracking-label text-fg-secondary uppercase">
              {item.author}
            </span>
          ) : null}
          {item.timestamp ? <span className="text-caption text-fg-faint">{item.timestamp}</span> : null}
        </div>
      ) : null}
      {/*
        * ONLY A USER MESSAGE GETS A BUBBLE. An assistant turn runs full width, because
        * its content is usually rich — a code block, a table, a list — and a bubble
        * sized to a conversational line squeezes all of it into a column. Caught by
        * rendering markdown in a browser rather than by reading the class list: the
        * first version constrained both roles and the tables came out unreadable.
        *
        * The constraint is `max-w-lg`, a named step, and not the `max-w-[85%]` it
        * replaced — a named step reads better and does not encode a magic percentage.
        *
        * CORRECTION, 2026-09-12, found by `design-kit-a3`. An earlier version of this
        * comment said the design gate "does not check `max-w`" and framed that as
        * something the rule fails to catch. That is wrong, and it is worth correcting
        * rather than deleting because the wrong version is the intuitive one.
        * `max-w` is listed in `NEVER_SCALE_PREFIXES` **deliberately**, alongside every
        * other layout-geometry prefix, and the lint package says why: "layout geometry
        * and icon-sized boxes are one-off facts, not a repeated design decision —
        * `h-[18px]` on an icon wrapper is legitimate in a way `text-[13px]` is not."
        * Contract §7 carries the measurement behind it: 6,751 named spacing utilities
        * against 39 arbitrary ones, 99.4% adherence, so Tailwind's scale IS the spacing
        * contract and is inherited rather than redefined.
        *
        * So the gate accepting `max-w-[85%]` is the rule correctly declining to judge
        * layout, by design and on evidence — not a hole in it. The change below stands
        * on readability; it was never a gate repair.
        */}
      <div
        className={cn(
          'min-w-0 rounded-panel px-3 py-2 text-control leading-relaxed text-fg [overflow-wrap:anywhere]',
          typeof item.content === 'string' ? 'whitespace-pre-wrap' : null,
          item.role === 'user' ? 'max-w-lg bg-surface' : 'w-full bg-bg-elevated',
        )}
      >
        {item.content}
      </div>
      {actions ? <DefaultMessageActions item={item} actions={actions} /> : null}
      {item.footer ? <div className="text-caption text-fg-muted">{item.footer}</div> : null}
    </div>
  )
}

function DefaultMarker({ item }: { readonly item: ChatMarkerItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3" role="separator">
      <span className="h-px flex-1 bg-divider" />
      <span className={cn('min-w-0 text-center text-caption tracking-eyebrow uppercase [overflow-wrap:anywhere]', MARKER_TONE[item.variant])}>
        {item.label}
      </span>
      <span className="h-px flex-1 bg-divider" />
    </div>
  )
}

/**
 * A CARD IS NOT GIVEN A BUBBLE, AND THAT IS THE POINT OF IT BEING A SIBLING VARIANT.
 * A message bubble is chrome that says "someone said this"; a card is a surface that
 * already carries its own frame, and nesting one inside the other double-frames it.
 * So this row contributes alignment and an optional byline and nothing else — the
 * host's card draws itself.
 */
function DefaultCard({ item }: { readonly item: ChatCardItem }) {
  return (
    <div className="flex min-w-0 w-full flex-col gap-1 items-start" data-wire-kind={item.wireKind}>
      {item.author || item.timestamp ? (
        <div className="flex items-baseline gap-2">
          {item.author ? (
            <span className="text-label tracking-label text-fg-secondary uppercase">
              {item.author}
            </span>
          ) : null}
          {item.timestamp ? <span className="text-caption text-fg-faint">{item.timestamp}</span> : null}
        </div>
      ) : null}
      <div className="min-w-0 w-full">{item.content}</div>
    </div>
  )
}

function renderDefault(item: ChatItem, actions?: ChatStreamProps['messageActions']): ReactNode {
  // Exhaustive by construction: adding a variant to ChatItem without handling it
  // here is a compile error at the `never` below, not a blank row at runtime.
  switch (item.kind) {
    case 'message':
      return <DefaultMessage item={item} actions={actions} />
    case 'marker':
      return <DefaultMarker item={item} />
    case 'card':
      return <DefaultCard item={item} />
    default: {
      const exhaustive: never = item
      return exhaustive
    }
  }
}

/**
 * One transcript row, memoized on the item and the renderer.
 *
 * WHY: without this every parent render — a keystroke in a sibling composer, a
 * streaming token — re-ran `renderItem` for every row and re-rendered every rendered
 * `content` node, which is quadratic on a long thread. Hosts keep `items` entries
 * referentially stable when unchanged (replace only the entry that changed) and pass a
 * stable `renderItem`; an inline arrow defeats the memo but stays correct.
 */
const ChatStreamRow = memo(
  function ChatStreamRow({ item, renderItem }: { readonly item: ChatItem; readonly renderItem: (item: ChatItem) => ReactNode }) {
    return (
      <MessageScroller.Item messageId={item.id} data-slot="chat-stream-item">
        {renderItem(item)}
      </MessageScroller.Item>
    )
  },
  (a, b) => a.item === b.item && a.renderItem === b.renderItem,
)

/**
 * The transcript.
 *
 * SCROLL IS THE HARD PART AND WE DO NOT OWN IT. `@shadcn/react`'s `MessageScroller`
 * handles anchoring a turn, releasing the view when the reader scrolls away, holding
 * position when history is prepended, and staying stable when content reflows under a
 * stream. Nanite hand-rolls that in 468 lines of `ChatTranscript.tsx`; the upstream
 * engine has ZERO runtime dependencies and adds 76 kB, which for the package that
 * carries the most dependencies in this repo made it not a close call.
 *
 * It is headless and ships no CSS, so it needs no `@source` of its own — only this
 * package's class strings do.
 *
 * WHAT THIS COMPONENT DOES NOT DO: parse markdown. `content` is a `ReactNode` the host
 * has already rendered. A streaming-safe markdown renderer is the optional
 * `/markdown` subpath, so a host that renders its own pays nothing for ours. The
 * consequence is that this component cannot see tokens arrive — see `useStallDetector`
 * for why stall is host-asserted rather than derived here.
 */
export function ChatStream({
  items,
  status = { status: 'idle' },
  renderItem,
  messageActions,
  empty,
  loading = false,
  history,
  jumpLabel = 'Jump to latest',
  autoScroll = true,
  preserveScrollOnPrepend = true,
  className,
  viewportClassName,
  'aria-label': ariaLabel = 'Conversation',
}: ChatStreamProps) {
  const render = useMemo(
    () => renderItem ?? ((item: ChatItem) => renderDefault(item, messageActions)),
    [renderItem, messageActions?.copy, messageActions?.download, messageActions?.onDetails], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const showEmpty = !loading && !history?.error && items.length === 0 && status.status === 'idle'

  return (
    <MessageScroller.Provider autoScroll={autoScroll} defaultScrollPosition="end">
      <MessageScroller.Root className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col', className)}>
        <MessageScroller.Viewport
          aria-label={ariaLabel}
          preserveScrollOnPrepend={preserveScrollOnPrepend}
          className={cn('min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6', viewportClassName)}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-control text-fg-muted" role="status">
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              Loading conversation…
            </div>
          ) : null}
          {history && (history.hasOlder || history.loading || history.error) ? (
            <div data-slot="chat-stream-history" className="mx-auto mb-5 flex w-full max-w-3xl flex-col items-center gap-2 py-2">
              {history.error ? <div className="text-control text-danger" role="alert">{history.error}</div> : null}
              {history.loading ? (
                <span className="flex items-center gap-2 text-caption text-fg-muted" role="status">
                  <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                  Loading older messages…
                </span>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={history.onLoadOlder}>
                  {history.error ? 'Retry loading history' : 'Load older messages'}
                </Button>
              )}
            </div>
          ) : null}
          {/* Keep controls outside the log: the upstream prepend detector compares
              the first Content child, which must be a message rather than a stable
              history control. Otherwise a prepend is mistaken for an append. */}
          <MessageScroller.Content className="mx-auto flex min-w-0 w-full max-w-3xl flex-col gap-5">
            {showEmpty ? <div data-slot="chat-stream-empty">{empty}</div> : null}

            {items.map((item) => (
              <ChatStreamRow key={item.id} item={item} renderItem={render} />
            ))}

            {status.status === 'streaming' || status.status === 'stalled' ? (
              <MessageScroller.Item
                messageId="__streaming"
                scrollAnchor
                data-slot="chat-stream-streaming"
                data-stalled={status.status === 'stalled' ? '' : undefined}
              >
                <div className={cn('flex min-w-0 flex-col gap-2', ROLE_ALIGN[status.role])}>
                  <div
                    className={cn(
                      'min-w-0 rounded-panel bg-bg-elevated px-3 py-2 text-control leading-relaxed text-fg [overflow-wrap:anywhere]',
                      typeof status.content === 'string' ? 'whitespace-pre-wrap' : null,
                      status.role === 'user' ? 'max-w-lg' : 'w-full',
                    )}
                  >
                    {status.content}
                  </div>
                  <span className={cn('flex items-center gap-2 text-caption', status.status === 'stalled' ? 'text-warning' : 'text-fg-muted')} role="status">
                    {status.status === 'streaming' ? <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
                    {status.status === 'stalled' ? 'Waiting for the response to continue…' : 'Responding…'}
                  </span>
                </div>
              </MessageScroller.Item>
            ) : null}

            {status.status === 'error' ? (
              <div
                data-slot="chat-stream-error"
                role="alert"
                className="min-w-0 rounded-panel border border-danger bg-danger-muted px-3 py-2 text-control leading-relaxed text-danger-fg [overflow-wrap:anywhere]"
              >
                {status.message}
              </div>
            ) : null}
          </MessageScroller.Content>
        </MessageScroller.Viewport>

        {/* The headless button stays mounted and inert when inactive; hide it too. */}
        <MessageScroller.Button
          direction="end"
          data-slot="chat-stream-jump"
          className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-control border border-border bg-bg-elevated px-3 py-1.5 text-caption text-fg-secondary shadow-md data-[active=false]:hidden"
        >
          {jumpLabel}
        </MessageScroller.Button>
      </MessageScroller.Root>
    </MessageScroller.Provider>
  )
}
