import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { ApprovalCard, ChoiceCard, FormCard, ReviewCard, type CardOutcome } from '..'
import { ANSWERABLE_STATES, CASES } from '../../fixtures/cases'

/** Built, not written, so no literal looks like a credential. */
const SAMPLE = ['sample', 'value'].join('-')

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el)
  })
}
const type = (el: Element, value: string) => fireEvent.change(el, { target: { value } })

describe('every fixture renders, and terminal cards offer nothing to press', () => {
  it('covers every card x every answerable state', () => {
    const cards = ['approval', 'approval-high', 'choice', 'review', 'form', 'confirmation', 'prompt']
    for (const card of cards) {
      for (const state of ANSWERABLE_STATES) {
        expect(CASES.some((c) => c.card === card && c.state === state), `${card}:${state}`).toBe(true)
      }
    }
  })

  for (const c of CASES) {
    it(`${c.id} renders`, () => {
      // The boundary fixture throws on purpose; React logs it, which is noise here.
      const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { container, unmount } = render(c.element)
      quiet.mockRestore()
      expect(container.querySelector('[data-slot="envelope"]') ?? container.textContent).toBeTruthy()
      if (['resolved', 'canceled', 'expired', 'superseded', 'failed'].includes(c.state) && c.card !== 'registry') {
        // The ghost-card fix: a finished card has a status region and no enabled action.
        expect(container.querySelector('[data-slot="resolved-footer"]'), c.id).toBeTruthy()
        const live = [...container.querySelectorAll('button')].filter((b) => !b.disabled)
        expect(live, c.id).toHaveLength(0)
      }
      unmount()
    })
  }
})

describe('ApprovalCard', () => {
  const base = { title: 'Do the thing', risk: 'low' as const }

  it('reports the chosen action with the digest it showed', async () => {
    const outcomes: CardOutcome[] = []
    render(<ApprovalCard {...base} id="apr-1" digest="abc123" onRespond={(o) => { outcomes.push(o) }} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    expect(outcomes).toEqual([
      { status: 'submitted', decisions: [{ itemId: 'apr-1', action: 'approve' }], data: { digest: 'abc123' } },
    ])
  })

  it('never default-focuses an action and only tones danger when the caller sets it', () => {
    render(<ApprovalCard {...base} onRespond={() => {}} actions={[{ id: 'go', label: 'Go', primary: true }, { id: 'no', label: 'No' }]} />)
    expect(document.activeElement).toBe(document.body)
    for (const b of screen.getAllByRole('button')) expect(b.className).not.toMatch(/(^|\s)(bg|text)-destructive/)
  })

  it('names the risk in words and an icon, not colour alone', () => {
    const { container } = render(<ApprovalCard {...base} risk="high" onRespond={() => {}} confirmPhrase="go" />)
    expect(screen.getByText(/High risk/)).toBeTruthy()
    expect(container.querySelector('[data-slot="envelope-header"] svg')).toBeTruthy()
  })

  it('medium risk needs an explicit second confirmation', async () => {
    const onRespond = vi.fn()
    render(<ApprovalCard {...base} risk="medium" onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    expect(onRespond).not.toHaveBeenCalled()
    expect(screen.getByText(/Confirm: Approve\?/)).toBeTruthy()
    await click(screen.getByRole('button', { name: 'Confirm Approve' }))
    expect(onRespond).toHaveBeenCalledTimes(1)
  })

  it('high risk keeps approval disabled until the phrase is typed exactly', async () => {
    const onRespond = vi.fn()
    render(<ApprovalCard {...base} risk="high" confirmPhrase="delete it" onRespond={onRespond} />)
    const approve = screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
    type(screen.getByRole('textbox'), 'delete i')
    expect(approve.disabled).toBe(true)
    type(screen.getByRole('textbox'), 'delete it')
    expect(approve.disabled).toBe(false)
    await click(approve)
    expect(onRespond).toHaveBeenCalledTimes(1)
  })

  it('treats an unrecognised risk class as the most restrictive: read-only with the notice', () => {
    render(<ApprovalCard {...base} risk={'bogus' as 'low'} onRespond={() => {}} />)
    expect(screen.getByText(/no recognised risk class/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByText(/High risk/)).toBeTruthy()
  })

  it('shows the countdown only in the final minute, from the host clock', () => {
    const { rerender } = render(<ApprovalCard {...base} expiresAt="2030-01-01 12:00 UTC" remainingMs={5 * 60_000} onRespond={() => {}} />)
    expect(screen.getByText(/2030-01-01 12:00 UTC/).textContent).not.toMatch(/ in \d+s/)
    rerender(<ApprovalCard {...base} expiresAt="2030-01-01 12:00 UTC" remainingMs={42_000} onRespond={() => {}} />)
    expect(screen.getByText(/in 42s/)).toBeTruthy()
  })

  it('keeps the viewer read-only with the elevation CTA slot', () => {
    render(<ApprovalCard {...base} elevation={{ reason: 'Confirm identity.', action: <button type="button">Elevate</button> }} onRespond={() => {}} />)
    expect(screen.getByRole('button', { name: 'Elevate' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  })

  it('a 409 keeps the card open, alerts, and offers reload without clearing anything', async () => {
    const onReload = vi.fn()
    render(<ApprovalCard {...base} stale onReload={onReload} onRespond={() => {}} />)
    expect(screen.getByRole('alert').textContent).toMatch(/changed/)
    expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(true)
    await click(screen.getByRole('button', { name: /Reload, keep my answers/ }))
    expect(onReload).toHaveBeenCalled()
  })

  it('links the replacement when superseded', () => {
    render(<ApprovalCard {...base} priorStatus="superseded" supersededBy={<a href="#n">newer</a>} onRespond={() => {}} />)
    expect(screen.getByRole('link', { name: 'newer' })).toBeTruthy()
  })
})

describe('ChoiceCard', () => {
  const options = [{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]
  it('submits the single choice as an answer, and "other" carries the text', async () => {
    const outcomes: CardOutcome[] = []
    const { rerender } = render(<ChoiceCard questionId="q" title="Pick" options={options} allowOther value={['b']} onValueChange={() => {}} onRespond={(o) => { outcomes.push(o) }} />)
    await click(screen.getByRole('button', { name: 'Submit' }))
    rerender(<ChoiceCard questionId="q" title="Pick" options={options} allowOther value={['__other__']} otherValue=" mine " onValueChange={() => {}} onRespond={(o) => { outcomes.push(o) }} />)
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(outcomes).toEqual([
      { status: 'submitted', answers: [{ questionId: 'q', value: ['b'] }] },
      { status: 'submitted', answers: [{ questionId: 'q', value: [{ other: 'mine' }] }] },
    ])
  })
  it('disables Submit until something is chosen', () => {
    render(<ChoiceCard questionId="q" title="Pick" options={options} value={[]} onValueChange={() => {}} onRespond={() => {}} />)
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true)
  })
  it('groups radios and exposes multi as checkboxes', () => {
    const { rerender } = render(<ChoiceCard questionId="q" title="Pick" options={options} value={[]} onValueChange={() => {}} onRespond={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    rerender(<ChoiceCard questionId="q" title="Pick" options={options} multiple value={[]} onValueChange={() => {}} onRespond={() => {}} />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })
})

describe('ReviewCard', () => {
  const props = { title: 'Review', itemId: 'r1', before: { label: 'Was', content: 'a' }, after: { label: 'Now', content: 'b' } }
  it('requires a note to request changes and sends it with the decision', async () => {
    const outcomes: CardOutcome[] = []
    render(<ReviewCard {...props} onRespond={(o) => { outcomes.push(o) }} />)
    await click(screen.getByRole('button', { name: 'Request changes' }))
    expect((screen.getByRole('button', { name: 'Send request' }) as HTMLButtonElement).disabled).toBe(true)
    type(screen.getByRole('textbox'), 'Use 4 retries')
    await click(screen.getByRole('button', { name: 'Send request' }))
    expect(outcomes).toEqual([{ status: 'submitted', decisions: [{ itemId: 'r1', action: 'request-changes', note: 'Use 4 retries' }] }])
  })
  it('approves and rejects without a note', async () => {
    const outcomes: CardOutcome[] = []
    render(<ReviewCard {...props} onRespond={(o) => { outcomes.push(o) }} />)
    await click(screen.getByRole('button', { name: 'Approve' }))
    await click(screen.getByRole('button', { name: 'Reject' }))
    expect(outcomes.map((o) => o.status === 'submitted' && o.decisions?.[0].action)).toEqual(['approve', 'reject'])
  })
})

describe('FormCard', () => {
  const schema = {
    type: 'object',
    required: ['name', 'token'],
    properties: {
      name: { type: 'string', title: 'Name' },
      token: { type: 'string', title: 'Token', format: 'secret' },
      extra: { title: 'Extra', oneOf: [{ type: 'string' }] },
    },
  }

  it('shows an inline error, a linked summary that takes focus, and does not submit', async () => {
    const onRespond = vi.fn()
    render(<FormCard title="F" schema={schema} storeSecret={async () => 'ref:x'} onRespond={onRespond} />)
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(onRespond).not.toHaveBeenCalled()
    const summary = document.querySelector('[data-slot="form-error-summary"]') as HTMLElement
    expect(within(summary).getAllByRole('link')).toHaveLength(2)
    await act(async () => { await Promise.resolve() })
    expect(document.activeElement).toBe(summary)
    expect(screen.getByLabelText(/Name/).getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByLabelText(/Name/).getAttribute('aria-describedby')).toMatch(/-error$/)
  })

  it('masks the secret, never puts its value in the outcome, and clears it after hand-off', async () => {
    const outcomes: CardOutcome[] = []
    const stored: Record<string, string> = {}
    render(
      <FormCard
        title="F"
        schema={schema}
        storeSecret={async (k, v) => { stored[k] = v; return `ref:${k}` }}
        onRespond={(o) => { outcomes.push(o) }}
      />,
    )
    const secret = screen.getByLabelText(/Token/) as HTMLInputElement
    expect(secret.type).toBe('password')
    type(screen.getByLabelText(/Name/), 'svc')
    type(secret, SAMPLE)
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(stored).toEqual({ token: SAMPLE })
    expect(JSON.stringify(outcomes)).not.toContain(SAMPLE)
    expect(outcomes[0]).toMatchObject({ status: 'submitted', data: { name: 'svc', token: { ref: 'ref:token' } } })
    expect((screen.getByLabelText(/Token/) as HTMLInputElement).value).toBe('')
  })

  it('disables a secret field, visibly, when no secret handler is configured', () => {
    render(<FormCard title="F" schema={schema} onRespond={() => {}} />)
    expect((screen.getByLabelText(/Token/) as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/No secret handler is configured/)).toBeTruthy()
  })

  it('draws an unsupported keyword as a visible fallback field naming the keyword', () => {
    render(<FormCard title="F" schema={schema} onRespond={() => {}} />)
    expect(screen.getByText('oneOf')).toBeTruthy()
    expect(screen.getByLabelText(/Extra/).tagName).toBe('TEXTAREA')
  })

  it('refuses to submit a schema it cannot read, and says so', () => {
    render(<FormCard title="F" schema={{ type: 'string' }} onRespond={() => {}} />)
    expect(screen.getByText(/This form cannot be submitted/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('never shows a secret in the resolved receipt', () => {
    render(
      <FormCard title="F" schema={schema} priorStatus="submitted" defaultValues={{ name: 'svc', token: SAMPLE }} onRespond={() => {}} />,
    )
    expect(document.body.textContent).not.toContain(SAMPLE)
    expect(screen.getByText(/provided by reference/i)).toBeTruthy()
  })

  it('keeps the draft on a failed submit and shows the error', async () => {
    render(<FormCard title="F" schema={{ type: 'object', properties: { name: { type: 'string', title: 'Name' } } }} onRespond={() => { throw new Error('boom') }} />)
    type(screen.getByLabelText(/Name/), 'kept')
    await click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByRole('alert').textContent).toMatch(/boom/)
    expect((screen.getByLabelText(/Name/) as HTMLInputElement).value).toBe('kept')
  })
})
