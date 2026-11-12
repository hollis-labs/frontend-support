import { useRef, useState, useSyncExternalStore } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SessionExpired, SignInRequired } from '../components/sign-in-required'
import { StepUpDialog } from '../components/step-up-dialog'
import type { StepUpDialogProps } from '../components/step-up-dialog'
// Source import: app-shell is not a dependency of this kit; the test only proves the controlled shape fits its gateway.
import { createActionGateway } from '../../../app-shell/src/actions'
import type { ActionGateway, Outcome } from '../../../app-shell/src/actions'

describe('SignInRequired', () => {
  it.each([
    ['signed-out', 'Sign in required'],
    ['expired', 'Session expired'],
    ['denied', 'Access denied'],
  ] as const)('renders %s', (reason, title) => {
    render(<SignInRequired reason={reason} />)
    expect(screen.getByRole('heading', { name: title })).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(document.querySelector('form, input')).toBeNull()
  })

  it('renders the host instruction and retries only when onRetry is given', () => {
    const onRetry = vi.fn()
    render(<SignInRequired reason="signed-out" instruction={<span>Open the link we sent you.</span>} onRetry={onRetry} />)
    expect(screen.getByText('Open the link we sent you.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('disables retry while retrying', () => {
    render(<SignInRequired reason="signed-out" onRetry={vi.fn()} retrying />)
    expect((screen.getByRole('button', { name: 'Trying again…' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('an unknown reason is neutral and never echoed', () => {
    render(<SignInRequired reason={'token=secret' as never} />)
    expect(screen.getByRole('heading', { name: 'Sign in unavailable' })).toBeTruthy()
    expect(document.body.textContent).not.toContain('secret')
  })

  it('SessionExpired announces the expiry', () => {
    render(<SessionExpired instruction="Request a new link." />)
    expect(screen.getByRole('alert').textContent).toContain('Your session has ended')
    expect(screen.getByText('Request a new link.')).toBeTruthy()
  })
})

const CONFIRM = { what: 'Revoke key "Automation"', scope: ['key:automation', 'privileged'], ttlMs: 60_000, who: 'Ada' }

function dialog(over: Partial<StepUpDialogProps> = {}) {
  return <StepUpDialog open {...CONFIRM} onConfirm={vi.fn()} onCancel={vi.fn()} {...over} />
}

describe('StepUpDialog', () => {
  it('renders the Confirm fields in a labelled dialog and focuses Cancel', async () => {
    render(dialog())
    const d = screen.getByRole('dialog')
    expect(d.getAttribute('aria-labelledby') || d.getAttribute('aria-label')).toBeTruthy()
    expect(screen.getByText('Ada')).toBeTruthy()
    expect(screen.getByText('Revoke key "Automation"')).toBeTruthy()
    expect(screen.getByText('key:automation')).toBeTruthy()
    expect(screen.getByText('The grant is valid for 60 seconds after you confirm.')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))
  })

  it('omits Who when absent and states minutes for long grants', () => {
    render(dialog({ who: undefined, ttlMs: 300_000 }))
    expect(screen.queryByText('Who')).toBeNull()
    expect(screen.getByText('The grant is valid for 5 minutes after you confirm.')).toBeTruthy()
  })

  it('Confirm, Cancel and Esc call the matching callbacks', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(dialog({ onConfirm, onCancel }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(2))
  })

  it('granting disables Confirm; failed shows the sanitized error', () => {
    const { rerender } = render(dialog({ status: 'granting' }))
    expect((screen.getByRole('button', { name: 'Confirming…' }) as HTMLButtonElement).disabled).toBe(true)
    rerender(dialog({ status: 'failed', error: 'Try the link again.' }))
    expect(screen.getByRole('alert').textContent).toBe('Try the link again.')
    expect((screen.getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('renders nothing when closed', () => {
    render(dialog({ open: false }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('returns focus to the trigger on close', async () => {
    function Host() {
      const [open, setOpen] = useState(false)
      return <><button onClick={() => setOpen(true)}>Open</button>{dialog({ open, onCancel: () => setOpen(false) })}</>
    }
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })
})

describe('StepUpDialog with the app-shell action gateway (needs_confirmation)', () => {
  function setup(reply: (n: number) => unknown = (n) => (n === 1 ? { status: 'needs_confirmation', confirm: CONFIRM } : { status: 'ok', receipt: 'r1' })) {
    const requests: { action: { confirmation?: string } }[] = []
    const gateway = createActionGateway({
      backend: { execute: async (req) => { requests.push(req); return reply(requests.length) } },
      agentFunctions: ['tokens.revoke'],
      audit: () => {},
      issueGrant: async () => 'grant-1',
    })
    function Host({ g }: { g: ActionGateway }) {
      const snap = useSyncExternalStore(g.subscribe, g.getSnapshot, g.getSnapshot)
      const c = snap.confirmation
      const last = useRef(c)
      if (c) last.current = c
      const shown = last.current
      return shown ? <StepUpDialog open={c !== null} {...shown.confirm} scope={shown.confirm.scope} status={c?.granting ? 'granting' : 'idle'}
        onConfirm={() => g.resolveConfirmation(shown.id, 'confirm')} onCancel={() => g.resolveConfirmation(shown.id, 'cancel')} /> : null
    }
    const start = () => gateway.handleCall({ surfaceId: 's1', functionCallId: 'fc-1', callFunction: { '@call': 'tokens.revoke', hollis_action: { id: 'revoke-0001', subject: { kind: 'key', id: 'automation' }, risk: 'medium' } } })
    return { gateway, requests, start, Host }
  }

  it('confirm: the dialog shows the server confirm and the retry carries the grant', async () => {
    const { gateway, requests, start, Host } = setup()
    render(<Host g={gateway} />)
    let result!: ReturnType<typeof start>
    act(() => { result = start() })
    expect(await screen.findByText('Revoke key "Automation"')).toBeTruthy()
    expect(requests).toHaveLength(1)
    let response!: Awaited<typeof result>
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Confirm' })); response = await result })
    expect('value' in response && (response.value as Outcome).status).toBe('ok')
    expect(requests).toHaveLength(2)
    expect(requests[1]!.action.confirmation).toBe('grant-1')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it.each(['button', 'escape'])('cancel via %s: canceled, and the action never re-executes', async (how) => {
    const { gateway, requests, start, Host } = setup()
    render(<Host g={gateway} />)
    let result!: ReturnType<typeof start>
    act(() => { result = start() })
    await screen.findByRole('dialog')
    let response!: Awaited<typeof result>
    await act(async () => {
      if (how === 'button') fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      else fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      response = await result
    })
    expect('value' in response && (response.value as Outcome).status).toBe('canceled')
    expect(requests).toHaveLength(1)
  })
})
