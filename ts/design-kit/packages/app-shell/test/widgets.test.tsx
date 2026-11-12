import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { LayoutStorage } from '@hollis-labs/plugin-host-ui'
import { WidgetCard, WidgetGrid, buildWidgetOrder, filterVisibleWidgets, moveWidget, reorderWidget, type GridWidget } from '../src'

const memory = (): LayoutStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, read: k => data.get(k) ?? null, write: (k, v) => { data.set(k, v) }, remove: k => { data.delete(k) } }
}
const widgets: GridWidget[] = ['a', 'b', 'c'].map(id => ({ id, label: `Widget ${id}`, node: <p>body {id}</p> }))
const ids = () => [...document.querySelectorAll('[data-widget-id]')].map(e => e.getAttribute('data-widget-id'))

describe('widget order helpers', () => {
  it('keeps saved order, appends new, keeps stale ids', () => {
    expect(buildWidgetOrder(['c', 'x', 'a'], ['a', 'b', 'c'])).toEqual(['c', 'x', 'a', 'b'])
    expect(buildWidgetOrder(undefined, ['a', 'b'])).toEqual(['a', 'b'])
  })
  it('filters hidden, moves and reorders', () => {
    expect(filterVisibleWidgets(['a', 'b'], { a: false })).toEqual(['b'])
    expect(moveWidget(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(moveWidget(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(reorderWidget(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a'])
  })
})

describe('WidgetCard', () => {
  it('collapses and remembers through storage', () => {
    const storage = memory()
    const { unmount } = render(<WidgetCard id="w" app="x" title="W" storage={storage}>inside</WidgetCard>)
    expect(screen.getByText('inside')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /W/ }))
    expect(screen.queryByText('inside')).toBeNull()
    unmount()
    render(<WidgetCard id="w" app="x" title="W" storage={storage}>inside</WidgetCard>)
    expect(screen.queryByText('inside')).toBeNull()
    expect(screen.getByRole('button', { name: /W/ }).getAttribute('aria-expanded')).toBe('false')
  })
})

describe('WidgetGrid edit mode', () => {
  it('reorders with buttons and persists through storage', () => {
    const storage = memory()
    const { unmount } = render(<WidgetGrid app="x" widgets={widgets} storage={storage} />)
    expect(ids()).toEqual(['a', 'b', 'c'])
    expect(screen.queryByRole('button', { name: 'Move Widget a down' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit widgets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Widget a down' }))
    expect(ids()).toEqual(['b', 'a', 'c'])
    unmount()
    render(<WidgetGrid app="x" widgets={widgets} storage={storage} />)
    expect(ids()).toEqual(['b', 'a', 'c'])
  })
  it('reorders by drag and drop', () => {
    const storage = memory()
    render(<WidgetGrid app="x" widgets={widgets} storage={storage} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit widgets' }))
    const items = () => [...document.querySelectorAll('[data-widget-id]')]
    fireEvent.dragStart(items()[0]!)
    fireEvent.drop(items()[2]!)
    expect(ids()).toEqual(['b', 'c', 'a'])
  })
  it('hides a widget, keeps it in edit mode, and persists', () => {
    const storage = memory()
    const { unmount } = render(<WidgetGrid app="x" widgets={widgets} storage={storage} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit widgets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide Widget b' }))
    expect(ids()).toEqual(['a', 'b', 'c'])
    expect(within(document.querySelector('[data-widget-id="b"]') as HTMLElement).getByRole('button', { name: 'Show Widget b' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(ids()).toEqual(['a', 'c'])
    unmount()
    render(<WidgetGrid app="x" widgets={widgets} storage={storage} />)
    expect(ids()).toEqual(['a', 'c'])
  })
  it('renders a diagnostic card for an unknown saved id instead of crashing', () => {
    const storage = memory()
    const first = render(<WidgetGrid app="x" widgets={widgets} storage={storage} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit widgets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Widget c up' }))
    first.unmount()
    render(<WidgetGrid app="x" widgets={widgets.filter(w => w.id !== 'b')} storage={storage} />)
    expect(ids()).toEqual(['a', 'c', 'b'])
    expect(screen.getByRole('alert').textContent).toContain('“b”')
  })
  it('works without storage for the session', () => {
    render(<WidgetGrid app="x" widgets={widgets} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit widgets' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Widget c up' }))
    expect(ids()).toEqual(['a', 'c', 'b'])
  })
})
