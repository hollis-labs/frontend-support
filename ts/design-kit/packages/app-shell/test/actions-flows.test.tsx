import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ManifestShell, useActionGateway, type AuditEntry, type BackendRequest, type PageComponent, type ShellActions } from '../src'
import { EDITED, ORIGINAL, admin, host, manifest, pages, pluginActions, subject, views } from './fixtures'

function mount(path: string, reply: (req: BackendRequest) => unknown, over: Partial<ShellActions> = {}) {
  const audit: AuditEntry[] = []
  const requests: unknown[] = []
  const navigate = vi.fn()
  const actions = pluginActions({
    backend: { execute: async req => { requests.push(req); return reply(req) } },
    audit: e => audit.push(e),
    ...over,
  })
  render(<ManifestShell manifest={manifest} admin={admin} apiBase="/api" path={path} onNavigate={navigate} views={views} pages={pages} isNarrow={false} actions={actions} />)
  return { audit, requests, navigate }
}

const edit = () => fireEvent.change(screen.getByLabelText('Description'), { target: { value: EDITED } })

describe('Save with review (detail)', () => {
  it('the review bar counts changes, Discard restores, review shows the diff and Effect before Save', async () => {
    host.revision = '7'
    const { requests, audit } = mount('/items/detail', () => ({ status: 'ok', receipt: 'r-1' }))
    expect(screen.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
    edit()
    expect(within(screen.getByRole('region', { name: 'Unsaved changes' })).getByText('1 change')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect((screen.getByLabelText('Description') as HTMLInputElement).value).toBe(ORIGINAL)
    edit()
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))
    const diff = screen.getByRole('group', { name: 'Changes' })
    expect(within(diff).getByLabelText('Before').textContent).toBe(`- ${ORIGINAL}`)
    expect(within(diff).getByLabelText('After').textContent).toBe(`+ ${EDITED}`)
    expect(screen.getByText(/Applies to new sessions/)).toBeTruthy()
    expect(requests).toHaveLength(0)
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    fireEvent.click(save)
    await screen.findByText('Done')
    expect(requests).toHaveLength(1)
    expect(audit.map(e => [e.id, e.outcome])).toEqual([['save-detail-1', 'ok']])
  })
  it('stale shows what changed, offers re-review, and a fresh id then saves', async () => {
    host.revision = '7'
    const { audit, requests } = mount('/items/detail', () => ({ status: 'ok', receipt: 'r-1' }))
    edit()
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))
    // the page was opened at revision 7; the backend has since moved to 8
    host.revision = '8'
    const save = screen.getByRole('button', { name: 'Save' })
    save.focus()
    fireEvent.click(save)
    const notice = await screen.findByText('Changed since you looked')
    expect(notice.closest('[data-notice]')?.getAttribute('data-notice')).toBe('stale')
    expect(screen.getByText(/revision 8/)).toBeTruthy()
    expect(requests).toHaveLength(0)
    expect(document.activeElement).toBe(save)
    fireEvent.click(screen.getByRole('button', { name: 'Review changes' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
    await screen.findByText('Done')
    expect(requests).toHaveLength(1)
    expect(audit.map(e => [e.id, e.outcome])).toEqual([['save-detail-1', 'stale'], ['save-detail-2', 'ok']])
    expect(subject.id).toBe('notes')
  })
})

describe('bulk Remove with confirm (list)', () => {
  const open = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select billing' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select mailer' }))
    const bar = screen.getByRole('toolbar', { name: 'Bulk actions' })
    expect(within(bar).getByText('2 selected')).toBeTruthy()
    const remove = within(bar).getByRole('button', { name: 'Remove' })
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
    expect([...(requests[0] as { input: { ids: string[] } }).input.ids].sort()).toEqual(['billing', 'mailer'])
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
