import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import {
  BulkActionBar, ListRow, MobileTabBar, OutlineNav, ReviewBar, SecretRevealDialog, SelectModeToggle, SettingsFieldRow, SettingsGroupCard, SplitPane,
  outlineAnchorId, useSelection,
} from '../src'

describe('SplitPane', () => {
  it('two panes with a keyboard-resizable separator, clamped', () => {
    render(<SplitPane list={<p>the list</p>} detail={<p>the detail</p>} initialListPercent={50} />)
    const sep = screen.getByRole('separator', { name: 'Resize list' })
    expect(screen.getByText('the list')).toBeTruthy()
    expect(screen.getByText('the detail')).toBeTruthy()
    fireEvent.keyDown(sep, { key: 'ArrowRight' })
    expect(sep.getAttribute('aria-valuenow')).toBe('55')
    for (let i = 0; i < 20; i++) fireEvent.keyDown(sep, { key: 'ArrowLeft' })
    expect(sep.getAttribute('aria-valuenow')).toBe('25')
  })
  it('narrow: the list, then the detail as a page with a back link', () => {
    const onBack = vi.fn()
    const { rerender } = render(<SplitPane narrow detailOpen={false} list={<p>the list</p>} detail={<p>the detail</p>} onBack={onBack} />)
    expect(screen.queryByText('the detail')).toBeNull()
    expect(screen.queryByRole('separator')).toBeNull()
    rerender(<SplitPane narrow detailOpen list={<p>the list</p>} detail={<p>the detail</p>} onBack={onBack} />)
    expect(screen.queryByText('the list')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })
})

describe('select mode and bulk bar', () => {
  const Harness = ({ onRemove }: { onRemove: () => void }) => {
    const selection = useSelection()
    const onOpen = vi.fn()
    return (
      <div>
        <SelectModeToggle selection={selection} />
        {['a', 'b'].map(id => <ListRow key={id} id={id} title={id} selection={selection} onOpen={onOpen} trailing={<span>status {id}</span>} />)}
        <BulkActionBar count={selection.count} actions={[{ id: 'stop', label: 'Stop', onAction: () => {} }]} danger={{ id: 'rm', label: 'Remove', onAction: onRemove }} />
      </div>
    )
  }
  it('checkboxes and the bar exist only in select mode with a selection; leaving clears it', () => {
    const onRemove = vi.fn()
    render(<Harness onRemove={onRemove} />)
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('toolbar')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    expect(screen.queryByText('status a')).toBeNull()
    expect(screen.queryByRole('toolbar')).toBeNull()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select a' }))
    const bar = screen.getByRole('toolbar', { name: 'Bulk actions' })
    expect(within(bar).getByText('1 selected')).toBeTruthy()
    // the danger action is last
    expect(within(bar).getAllByRole('button').map(b => b.textContent)).toEqual(['Stop', 'Remove'])
    fireEvent.click(within(bar).getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.getByText('status a')).toBeTruthy()
  })
})

describe('ReviewBar', () => {
  it('is absent without changes, counts them, and a field error blocks review', () => {
    const onReview = vi.fn()
    const { rerender } = render(<ReviewBar changes={0} onDiscard={() => {}} onReview={onReview} />)
    expect(screen.queryByRole('region')).toBeNull()
    rerender(<ReviewBar changes={2} onDiscard={() => {}} onReview={onReview} />)
    expect(screen.getByText('2 changes')).toBeTruthy()
    rerender(<ReviewBar changes={2} onDiscard={() => {}} onReview={onReview} blocked blockedReason="Fix the error first" />)
    expect((screen.getByRole('button', { name: 'Review changes' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('note').textContent).toBe('Fix the error first')
  })
})

describe('OutlineNav', () => {
  it('scrolls to the section and marks it current', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    render(<>
      <OutlineNav scope="d" items={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]} />
      <section id={outlineAnchorId('d', 'two')}>two body</section>
    </>)
    expect(screen.getByRole('button', { name: 'One' }).getAttribute('aria-current')).toBe('location')
    fireEvent.click(screen.getByRole('button', { name: 'Two' }))
    expect(scroll).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Two' }).getAttribute('aria-current')).toBe('location')
    expect(screen.getByRole('button', { name: 'One' }).getAttribute('aria-current')).toBeNull()
  })
  it('the strip orientation is a horizontal scroll strip', () => {
    render(<OutlineNav scope="d" orientation="strip" items={[{ id: 'one', label: 'One' }]} />)
    expect(screen.getByRole('navigation', { name: 'Sections' }).getAttribute('data-orientation')).toBe('strip')
  })
})

describe('settings field row and group card', () => {
  it('labels the control, marks dirty and shows its error; the danger group is flagged', () => {
    render(<>
      <SettingsGroupCard title="General" description="Shown across the app.">
        <SettingsFieldRow controlId="ws" label="Workspace name" hint="Visible to everyone." dirty error="Required"><input id="ws" /></SettingsFieldRow>
      </SettingsGroupCard>
      <SettingsGroupCard title="Danger zone" danger><SettingsFieldRow controlId="del" label="Delete workspace"><button id="del" type="button">Delete workspace…</button></SettingsFieldRow></SettingsGroupCard>
    </>)
    expect(screen.getByLabelText('Workspace name')).toBeTruthy()
    expect(screen.getByText('Visible to everyone.')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Required')
    expect(document.querySelector('[data-field="ws"]')?.hasAttribute('data-dirty')).toBe(true)
    expect(screen.getByRole('group', { name: 'Danger zone' }).hasAttribute('data-danger')).toBe(true)
    expect(screen.getByRole('group', { name: 'General' }).hasAttribute('data-danger')).toBe(false)
  })
})

describe('SecretRevealDialog', () => {
  const Host = () => {
    const [secret, setSecret] = useState<string | null>('hk_EXAMPLE_not_a_real_key_0000000000')
    return <SecretRevealDialog secret={secret} onDone={() => setSecret(null)} />
  }
  it('shows the secret with Copy and Done, ignores Esc, and removes it from the page on Done', () => {
    render(<Host />)
    const dialog = screen.getByRole('dialog', { name: 'Copy your key now' })
    expect(within(dialog).getByLabelText('Secret').textContent).toBe('hk_EXAMPLE_not_a_real_key_0000000000')
    expect(within(dialog).getByRole('button', { name: /Copy/ })).toBeTruthy()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: 'Copy your key now' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.textContent).not.toContain('hk_EXAMPLE')
  })
  it('renders nothing without a secret', () => {
    render(<SecretRevealDialog secret={null} onDone={() => {}} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('MobileTabBar', () => {
  const more = [{ label: 'Billing', items: [{ id: 'invoices', label: 'Invoices' }] }, { label: 'You', items: [{ id: 'keys', label: 'Access keys' }] }]
  const tabs = [{ id: 'home', label: 'Home' }, { id: 'plugins', label: 'Plugins' }]
  it('More is the last tab, opens a sheet of groups, selects and closes', () => {
    const onSelect = vi.fn()
    render(<MobileTabBar tabs={tabs} more={more} currentId="home" onSelect={onSelect} />)
    const bar = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(bar).getAllByRole('button').map(b => b.textContent)).toEqual(['Home', 'Plugins', 'More'])
    expect(within(bar).getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(within(bar).getByRole('button', { name: 'More' }))
    const sheet = screen.getByRole('dialog', { name: 'More' })
    expect(within(sheet).getByRole('region', { name: 'Billing' })).toBeTruthy()
    fireEvent.click(within(sheet).getByRole('button', { name: 'Access keys' }))
    expect(onSelect).toHaveBeenCalledWith('keys')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('More is current when the current item lives inside it', () => {
    render(<MobileTabBar tabs={tabs} more={more} currentId="keys" onSelect={() => {}} />)
    expect(screen.getByRole('button', { name: 'More' }).getAttribute('aria-current')).toBe('page')
  })
})
