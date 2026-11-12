import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { DashboardSearchToolbar } from '../components/layout/search-toolbar'
import { BarMeter } from '../components/widgets/bar-meter'
import { DashboardViewTabs } from '../components/layout/view-tabs'

afterEach(cleanup)

describe('dashboard planner controls', () => {
  it('returns the source row when a distribution filter is activated', () => {
    const selected = vi.fn()
    const row = { key: '/work/project', label: 'Project', value: 1234 }
    render(<BarMeter rows={[row]} onSelect={selected} formatValue={n => n.toLocaleString('en-US')} showTotal={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Project 1,234' }))
    expect(selected).toHaveBeenCalledWith(row)
  })

  it('preserves slash focus and immediate Escape clearing through the search toolbar', () => {
    const changed = vi.fn()
    function Search() {
      const [value, setValue] = useState('needle')
      return <DashboardSearchToolbar label="Search planner" value={value} onChange={next => { changed(next); setValue(next) }} slashToFocus layeredEscape retainFocusOnClear />
    }
    render(<Search />)
    const input = screen.getByRole('searchbox', { name: 'Search planner' })
    fireEvent.keyDown(window, { key: '/' })
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(changed).toHaveBeenCalledWith('')
    expect((input as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(input)
  })

  it.each(['pills', 'segments'] as const)('keeps %s view selection controlled by the host while exposing counts', (variant) => {
    function Views() {
      const [view, setView] = useState('board')
      return <DashboardViewTabs variant={variant} label="Views" value={view} onChange={setView} items={[
        { value: 'board', label: 'Board', tone: 'doing' },
        { value: 'inbox', label: 'Inbox', tone: 'queued', count: 3 },
      ]} />
    }
    render(<Views />)
    fireEvent.click(screen.getByRole('tab', { name: 'Inbox 3' }))
    expect(screen.getByRole('tab', { name: 'Inbox 3' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: 'Board' }).getAttribute('aria-selected')).toBe('false')
  })
})
