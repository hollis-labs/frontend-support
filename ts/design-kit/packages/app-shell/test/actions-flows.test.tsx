import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ManifestShell, useActionGateway, type AuditEntry, type BackendRequest, type PageComponent, type ShellActions } from '../src'
import { admin, manifest, views } from './fixtures'

const subject = { kind: 'item', id: 'alpha' }

/** The same page types as the list/detail stand-ins, now submitting actions. */
const ListPage: PageComponent = () => {
  const gateway = useActionGateway()
  return (
    <div>
      <button type="button" onClick={e => void gateway.handleCall({ surfaceId: 'items', functionCallId: 'rm', callFunction: { '@call': 'items.remove', hollis_action: { id: 'remove-bulk-1', subject: { kind: 'item', id: 'selection' }, risk: 'high' }, input: { ids: ['alpha', 'beta'] } } }, { trigger: e.currentTarget })}>Remove selected</button>
    </div>
  )
}
let revision = '7'
const DetailPage: PageComponent = () => {
  const gateway = useActionGateway()
  const [basis, setBasis] = useState('7')
  const [n, setN] = useState(1)
  return (
    <div>
      <p>Viewing revision {basis}</p>
      <button type="button" onClick={e => void gateway.handleCall({ surfaceId: 'item', functionCallId: `sv${n}`, callFunction: { '@call': 'items.save', hollis_action: { id: `save-detail-${n}`, subject, risk: 'medium', basis: { revision: basis } }, input: { name: 'alpha2' } } }, { trigger: e.currentTarget })}>Save</button>
      <button type="button" onClick={() => { setBasis(revision); setN(x => x + 1) }}>Reload</button>
      <button type="button" data-focus-target="name">Name</button>
    </div>
  )
}
const pages = { items: ListPage, item: DetailPage }

function mount(path: string, reply: (req: BackendRequest) => unknown, over: Partial<ShellActions> = {}) {
  const audit: AuditEntry[] = []
  const requests: unknown[] = []
  const navigate = vi.fn()
  const actions: ShellActions = {
    backend: { execute: async req => { requests.push(req); return reply(req) } },
    agentFunctions: ['items.save', 'items.remove'],
    audit: e => audit.push(e),
    issueGrant: async () => 'grant-xyz',
    currentBasis: () => ({ revision }),
    ...over,
  }
  render(<ManifestShell manifest={manifest} admin={admin} apiBase="/api" path={path} onNavigate={navigate} views={views} pages={pages} isNarrow={false} actions={actions} />)
  return { audit, requests, navigate }
}

describe('Save with review (detail)', () => {
  it('stale shows what changed, offers re-review, and a fresh id then saves', async () => {
    revision = '8'
    const onReview = vi.fn()
    const { audit, requests } = mount('/items/detail', () => ({ status: 'ok', receipt: 'r-1' }), { onReview })
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    fireEvent.click(save)
    const notice = await screen.findByText('Changed since you looked')
    expect(notice.closest('[data-notice]')?.getAttribute('data-notice')).toBe('stale')
    expect(screen.getByText(/revision 8/)).toBeTruthy()
    expect(requests).toHaveLength(0)
    expect(document.activeElement).toBe(save)
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))
    expect(onReview).toHaveBeenCalledWith({ id: 'save-detail-1', subject, current: { revision: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(screen.getByText('Viewing revision 8')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByText('Done')
    expect(requests).toHaveLength(1)
    expect(audit.map(e => [e.id, e.outcome])).toEqual([['save-detail-1', 'stale'], ['save-detail-2', 'ok']])
  })
})

describe('bulk Remove with confirm (list)', () => {
  const open = async () => {
    const remove = screen.getByRole('button', { name: 'Remove selected' })
    remove.focus()
    fireEvent.click(remove)
    return { remove, dialog: await screen.findByRole('alertdialog', { name: 'Confirm action' }) }
  }
  it('opens the confirmation on top, executes only after Confirm, and returns focus to the trigger', async () => {
    const { requests, audit } = mount('/items', () => ({ status: 'ok' }))
    const { remove, dialog } = await open()
    expect(requests).toHaveLength(0)
    expect(within(dialog).getByText('Run items.remove')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    await screen.findByText('Done')
    expect(requests).toHaveLength(1)
    expect((requests[0] as { action: { confirmation: string } }).action.confirmation).toBe('grant-xyz')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(document.activeElement).toBe(remove)
    expect(audit.map(e => e.outcome)).toEqual(['ok'])
  })
  it('Cancel ends in canceled with nothing executed', async () => {
    const { requests, audit } = mount('/items', () => ({ status: 'ok' }))
    const { dialog } = await open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await screen.findByText('Canceled')
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(requests).toHaveLength(0)
    expect(audit[0]!.outcome).toBe('canceled')
  })
  it('Esc dismisses the confirmation as canceled', async () => {
    const { requests, audit } = mount('/items', () => ({ status: 'ok' }))
    await open()
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(audit.map(e => e.outcome)).toEqual(['canceled']))
    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(requests).toHaveLength(0)
  })
  it('a refused backend reply shows its own message and returns focus', async () => {
    mount('/items', () => ({ status: 'refused', reason: 'absent-scope' }))
    const { remove, dialog } = await open()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('absent-scope')
    expect(document.activeElement).toBe(remove)
  })
})

describe('shell catalog handlers', () => {
  it('navigate resolves a route id to its path and refuses what is not registered', async () => {
    const holder = { g: null as ReturnType<typeof useActionGateway> | null }
    const Grab: PageComponent = () => { holder.g = useActionGateway(); return null }
    const navigate = vi.fn()
    render(<ManifestShell manifest={manifest} admin={admin} apiBase="/api" path="/items" onNavigate={navigate} views={views} pages={{ items: Grab }} isNarrow={false}
      actions={{ backend: { execute: async () => ({ status: 'ok' }) }, agentFunctions: [], audit: () => {}, issueGrant: async () => 'g' }} />)
    const call = (callFunction: Record<string, unknown>) => act(() => holder.g!.handleCall({ surfaceId: 's', functionCallId: 'f', callFunction }))
    expect((await call({ '@call': 'navigate', route: 'home' })).functionCallId).toBe('f')
    expect(navigate).toHaveBeenCalledWith('/')
    expect(await call({ '@call': 'navigate', route: '/api/x' })).toMatchObject({ value: { status: 'failed' } })
    expect(navigate).toHaveBeenCalledTimes(1)
    await call({ '@call': 'openRegion', region: 'shell.right', tab: 'inspector' })
    await screen.findByRole('dialog', { name: 'Inspector' })
    await call({ '@call': 'closeRegion', region: 'shell.right' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Inspector' })).toBeNull())
    await call({ '@call': 'toast', message: 'Saved', tone: 'success' })
    expect(await screen.findByText('Saved')).toBeTruthy()
    expect(await call({ '@call': 'openOverlay', kind: 'modal' })).toMatchObject({ value: { status: 'refused', reason: 'unsupported-action' } })
    expect(await call({ '@call': 'openModal' })).toMatchObject({ value: { status: 'refused', reason: 'unsupported-action' } })
  })
})
