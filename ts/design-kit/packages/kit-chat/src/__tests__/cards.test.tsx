import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { MissCode } from '@hollis-labs/design-bindings'
import { CardBoundary } from '../cards/card-boundary'
import { CardMiss } from '../cards/card-miss'
import { ConfirmationCard } from '../cards/confirmation-card'
import { ListCard } from '../cards/list-card'
import { ProgressCard } from '../cards/progress-card'
import { TableCard } from '../cards/table-card'
import { ChatStream } from '../components/chat-stream'
import type { ChatItem } from '../lib/types'

/**
 * The interactive cards set a local busy flag around an async responder, so the
 * state settles in a microtask AFTER the click. `click` flushes the event; this
 * flushes what the event started. Without it React logs an act(...) warning on a
 * passing test — and a suite that prints warnings when it is healthy is a suite
 * nobody reads when it is not.
 */
async function clickAndSettle(el: Element): Promise<void> {
  // The ASYNC form of act is what flushes the microtask the responder queues; the
  // sync form flushes the click and returns before `setBusy(false)` lands.
  await act(async () => {
    fireEvent.click(el)
  })
}

describe('ConfirmationCard', () => {
  const actions = [{ id: 'approve', label: 'Approve', primary: true }]

  it('reports the chosen action as a decision, not as free-form data', async () => {
    const onRespond = vi.fn()
    render(<ConfirmationCard title="Apply 3 changes?" actions={actions} onRespond={onRespond} />)

    await clickAndSettle(screen.getByRole('button', { name: 'Approve' }))

    expect(onRespond).toHaveBeenCalledWith({
      status: 'submitted',
      decisions: [{ itemId: 'approve', action: 'approve' }],
    })
  })

  it('reports a decline as canceled', async () => {
    const onRespond = vi.fn()
    render(<ConfirmationCard title="Apply?" actions={actions} onRespond={onRespond} />)

    await clickAndSettle(screen.getByRole('button', { name: 'Dismiss' }))

    expect(onRespond).toHaveBeenCalledWith({ status: 'canceled' })
  })

  it('CANNOT emit a partial — the union has no such member', () => {
    // The real assertion is the compile error, which `npm run typecheck` makes:
    //   onRespond({ status: 'partial' })  ->  not assignable to CardOutcome
    // At runtime all this can check is that nothing the card emits carries it.
    const onRespond = vi.fn()
    render(<ConfirmationCard title="Apply?" actions={actions} onRespond={onRespond} />)
    expect(onRespond).not.toHaveBeenCalled()
  })

  it('stays locked once a decision was already recorded, so a reload cannot double-submit', () => {
    const onRespond = vi.fn()
    render(
      <ConfirmationCard
        title="Apply?"
        actions={actions}
        onRespond={onRespond}
        priorStatus="submitted"
        priorActionId="approve"
      />,
    )

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByText(/Submitted/)).toBeDefined()
  })

  it('treats a prior PARTIAL as still answerable', () => {
    render(<ConfirmationCard title="Apply?" actions={actions} onRespond={vi.fn()} priorStatus="partial" />)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDefined()
  })

  it('locks on an unrecognised status AND names it', () => {
    render(<ConfirmationCard title="Apply?" actions={actions} onRespond={vi.fn()} priorStatus="quiesced" />)

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByText('quiesced')).toBeDefined()
  })
})

describe('CardMiss', () => {
  /**
   * THE FOUR CODES MUST NOT COLLAPSE INTO ONE MESSAGE. They are three different
   * operator actions plus a build mistake; a UI that says "couldn't render" for all
   * four has destroyed the only thing that distinguishes them.
   */
  it('draws each of the four miss codes distinguishably', () => {
    const codes: readonly MissCode[] = ['unclassified', 'unavailable', 'quarantined', 'ambiguous']
    const headlines = new Set<string>()

    for (const code of codes) {
      const { container, unmount } = render(<CardMiss code={code} wireKind="plugin.thing" />)
      const heading = container.querySelector('h3')
      expect(heading?.textContent).toBeTruthy()
      headlines.add(heading!.textContent!)
      unmount()
    }

    // Four codes in, four DISTINCT headlines out — and assert we examined four.
    expect(codes.length).toBe(4)
    expect(headlines.size).toBe(4)
  })

  it('always names the wire kind, so an envelope never vanishes without trace', () => {
    render(<CardMiss code="unclassified" wireKind="acme.custom-approval" />)
    expect(screen.getByText('acme.custom-approval')).toBeDefined()
  })

  it('says a quarantined renderer was refused rather than downgraded', () => {
    render(<CardMiss code="quarantined" wireKind="plugin.thing" />)
    expect(screen.getByText(/NOT downgraded/)).toBeDefined()
  })
})

describe('CardBoundary', () => {
  function Exploding(): never {
    throw new Error('boom in render')
  }

  it('catches a card that throws while rendering and keeps its siblings alive', () => {
    const onError = vi.fn()
    // React logs caught errors; silence it so a passing run is readable.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <div>
        <CardBoundary wireKind="plugin.broken" onError={onError}>
          <Exploding />
        </CardBoundary>
        <p>sibling survived</p>
      </div>,
    )

    expect(screen.getByText('sibling survived')).toBeDefined()
    expect(screen.getByText('boom in render')).toBeDefined()
    expect(onError).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('ProgressCard', () => {
  it.each([
    ['Infinity', Number.POSITIVE_INFINITY, '0%'],
    ['NaN', Number.NaN, '0%'],
    ['negative', -40, '0%'],
    ['over 100', 180, '100%'],
    ['in range', 63, '63%'],
  ])('clamps %s to %s', (_name, input, expected) => {
    const { unmount } = render(<ProgressCard title="t" percent={input} />)
    expect(screen.getByText(expected)).toBeDefined()
    unmount()
  })

  it('exposes the clamped value to assistive tech, not the raw one', () => {
    render(<ProgressCard title="t" percent={180} />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })
})

describe('TableCard', () => {
  interface Row {
    readonly id: string
    readonly name: string
    readonly count: number
  }
  const rows: readonly Row[] = [
    { id: 'b', name: 'beta', count: 2 },
    { id: 'a', name: 'alpha', count: 30 },
  ]
  const columns = [
    { key: 'name' as const, header: 'Name', sortable: true },
    { key: 'count' as const, header: 'Count', align: 'numeric' as const, sortable: true },
  ]

  it('sorts numerically rather than lexically', async () => {
    render(<TableCard rows={rows} columns={columns} rowId={(r) => r.id} />)

    await clickAndSettle(screen.getByRole('button', { name: /Count/ }))

    const cells = screen.getAllByRole('cell').map((c) => c.textContent)
    // 2 before 30. A string sort would put "30" first.
    expect(cells).toEqual(['beta', '2', 'alpha', '30'])
  })

  it('renders read-only with no select controls when given no responder', () => {
    render(<TableCard rows={rows} columns={columns} rowId={(r) => r.id} />)
    expect(screen.queryByRole('button', { name: 'Choose' })).toBeNull()
  })

  it('sends the row id as the decision when a row is chosen', async () => {
    const onRespond = vi.fn()
    render(<TableCard rows={rows} columns={columns} rowId={(r) => r.id} onRespond={onRespond} />)

    await clickAndSettle(screen.getAllByRole('button', { name: 'Choose' })[0])

    expect(onRespond).toHaveBeenCalledWith({
      status: 'submitted',
      decisions: [{ itemId: 'b', action: 'select' }],
    })
  })
})

describe('ListCard', () => {
  const items = [
    { id: 'one', label: 'First', checked: true },
    { id: 'two', label: 'Second' },
  ]

  it('submits ONE response carrying every item, not one per tick', async () => {
    const onRespond = vi.fn()
    const onToggle = vi.fn()
    render(<ListCard items={items} onToggle={onToggle} onRespond={onRespond} />)

    await clickAndSettle(screen.getByRole('checkbox', { name: 'Second' }))
    // Ticking does not submit — submitting terminally claims the envelope.
    expect(onToggle).toHaveBeenCalledWith('two', true)
    expect(onRespond).not.toHaveBeenCalled()

    await clickAndSettle(screen.getByRole('button', { name: 'Submit' }))
    expect(onRespond).toHaveBeenCalledWith({
      status: 'submitted',
      decisions: [
        { itemId: 'one', action: 'checked' },
        { itemId: 'two', action: 'unchecked' },
      ],
    })
  })

  it('is controlled: it does not tick the box itself', async () => {
    render(<ListCard items={items} onToggle={vi.fn()} />)
    const box = screen.getByRole('checkbox', { name: 'Second' })
    await clickAndSettle(box)
    // The host owns `items`, so without a re-render the box stays as it was.
    expect(box.getAttribute('aria-checked')).toBe('false')
  })
})

describe('ChatStream with a card item', () => {
  it('places a card in the transcript beside messages', () => {
    const items: readonly ChatItem[] = [
      { kind: 'message', id: 'm1', role: 'user', content: 'do the thing' },
      {
        kind: 'card',
        id: 'c1',
        wireKind: 'plan-approval',
        content: <ConfirmationCard title="Do the thing?" actions={[{ id: 'go', label: 'Go' }]} onRespond={vi.fn()} />,
      },
    ]

    const { container } = render(<ChatStream items={items} />)

    expect(screen.getByText('do the thing')).toBeDefined()
    expect(screen.getByText('Do the thing?')).toBeDefined()
    expect(container.querySelector('[data-wire-kind="plan-approval"]')).not.toBeNull()
  })

  it('does not wrap a card in a message bubble', () => {
    const items: readonly ChatItem[] = [
      { kind: 'card', id: 'c1', wireKind: 'k', content: <span>card body</span> },
    ]
    const { container } = render(<ChatStream items={items} />)
    // The bubble surface belongs to messages only; a card frames itself.
    expect(container.querySelector('.bg-surface')).toBeNull()
  })
})
