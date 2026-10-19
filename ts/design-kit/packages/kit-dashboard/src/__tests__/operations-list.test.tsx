import { StrictMode, useMemo, useState } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OperationsListPage,
  type OperationsActionScope,
} from '../components/layout/operations-list-page'
import type { ColumnDef } from '@hollis-labs/design-components'
beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
const items = [
  { id: 'z/91', title: 'Zulu' },
  { id: 'a:3', title: 'Alpha' },
  { id: 'm-2', title: 'Middle' },
]
const columns: ColumnDef<(typeof items)[number]>[] = [
  {
    key: 'title',
    header: 'Title',
    width: 'fill',
    cell: (i) => i.title,
    sortValue: (i) => i.title,
  },
]
const getId = (i: (typeof items)[number]) => i.id
let saved: OperationsActionScope[] = []
const action = vi.fn()
const facetChange = vi.fn()
function Consumer({
  generation = 1,
  accessible = true,
  active = true,
  duplicate = false,
}: {
  generation?: number
  accessible?: boolean
  active?: boolean
  duplicate?: boolean
}) {
  const [query, setQuery] = useState(''),
    [checked, setChecked] = useState<string[]>([]),
    [open, setOpen] = useState<string | null>(null)
  const matched = useMemo(
    () =>
      (duplicate ? [...items, items[0]] : items).filter((i) =>
        i.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, duplicate],
  )
  return (
    <OperationsListPage
      title="Records"
      admittedItems={items}
      matchedItems={matched}
      getRowId={getId}
      columns={columns}
      sourceGeneration={generation}
      accessible={accessible}
      active={active}
      searchQuery={query}
      onSearchChange={setQuery}
      selectedIds={checked}
      onSelectionChange={setChecked}
      facets={[
        {
          id: 'status',
          kind: 'chips',
          label: 'Status',
          options: [{ value: 'all', label: 'All records' }],
          value: [],
          onChange: facetChange,
        },
      ]}
      onClear={() => setQuery('')}
      selectable
      pageSize={2}
      inspector={{
        mode: 'inline',
        selectedId: open,
        onSelect: setOpen,
        title: (i) => i.title,
        renderBody: (_i, scope) => {
          saved.push(scope)
          return <button onClick={() => scope.run(action)}>Inspect local intent</button>
        },
      }}
    />
  )
}
describe('operations list admission and lifetime', () => {
  it('reveals only a sorted prefix, bulk checks revealed records, and preserves sort on query reset', () => {
    const v = render(<Consumer />)
    expect(v.getByText('2 revealed')).toBeTruthy()
    fireEvent.click(v.getByRole('checkbox', { name: 'Select all revealed rows' }))
    expect(v.getByText('2 selected')).toBeTruthy()
    fireEvent.click(v.getByRole('button', { name: /Title/ }))
    expect(v.getByText('2 selected')).toBeTruthy()
    expect(v.getByRole('columnheader', { name: /Title/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    )
    fireEvent.change(v.getByRole('searchbox'), { target: { value: 'Alpha' } })
    expect(v.getByText('0 selected')).toBeTruthy()
    expect(v.getByRole('columnheader', { name: /Title/ }).getAttribute('aria-sort')).toBe(
      'ascending',
    )
    fireEvent.change(v.getByRole('searchbox'), { target: { value: '' } })
    fireEvent.click(v.getByRole('button', { name: 'Show more' }))
    expect(v.getByText('3 revealed')).toBeTruthy()
  })
  it('clears search once without losing focus and guards composing/modifier row activation', () => {
    const v = render(<Consumer />),
      input = v.getByRole('searchbox')
    input.focus()
    fireEvent.change(input, { target: { value: 'Alpha' } })
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect((input as HTMLInputElement).value).toBe('Alpha')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect((input as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(input)
    const row = v.getAllByTestId('data-table-row')[0]
    fireEvent.keyDown(row, { key: 'Enter', keyCode: 229 })
    fireEvent.keyDown(row, { key: ' ', ctrlKey: true })
    expect(v.queryByRole('region', { name: 'Record inspector' })).toBeNull()
    row.focus()
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(v.getByRole('region', { name: 'Record inspector' })).toBeTruthy()
  })
  it('retires captured actions after record close, reused-ID source replacement, layer/access retirement and unmount, under StrictMode', () => {
    saved = []
    action.mockClear()
    const v = render(
      <StrictMode>
        <Consumer />
      </StrictMode>,
    )
    const open = () => {
      const row = v.getAllByTestId('data-table-row')[0]
      row.focus()
      fireEvent.keyDown(row, { key: 'Enter' })
    }
    open()
    const retained = saved.at(-1)!
    act(() => {
      expect(retained.run(action)).toBe(true)
    })
    expect(action).toHaveBeenCalledTimes(1)
    v.rerender(
      <StrictMode>
        <Consumer generation={2} />
      </StrictMode>,
    )
    expect(retained.run(action)).toBe(false)
    expect(v.queryByRole('region', { name: 'Record inspector' })).toBeNull()
    open()
    const current = saved.at(-1)!
    expect(current.run(action)).toBe(true)
    v.rerender(
      <StrictMode>
        <Consumer generation={2} active={false} />
      </StrictMode>,
    )
    expect(current.run(action)).toBe(false)
    v.rerender(
      <StrictMode>
        <Consumer generation={2} accessible={false} />
      </StrictMode>,
    )
    expect(current.run(action)).toBe(false)
    expect(v.getByText('Counts unavailable')).toBeTruthy()
    v.unmount()
    expect(current.run(action)).toBe(false)
  })
  it('does not open rows during active composition and retires callbacks on close', () => {
    saved = []
    action.mockClear()
    const v = render(<Consumer />),
      row = v.getAllByTestId('data-table-row')[0]
    fireEvent.compositionStart(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(v.queryByRole('region', { name: 'Record inspector' })).toBeNull()
    fireEvent.compositionEnd(row)
    row.focus()
    fireEvent.keyDown(row, { key: 'Enter' })
    const retained = saved.at(-1)!
    expect(retained.run(action)).toBe(true)
    fireEvent.click(v.getByRole('button', { name: 'Back to list' }))
    expect(retained.run(action)).toBe(false)
  })
  it('admits inline sibling controls but vetoes current pane and inspector controls under a competing layer', () => {
    facetChange.mockClear()
    const v = render(<Consumer />)
    const search = v.getByRole('searchbox') as HTMLInputElement
    const chip = v.getByRole('button', { name: 'All records' })
    fireEvent.click(chip)
    expect(facetChange).toHaveBeenCalledTimes(1)
    const row = v.getAllByTestId('data-table-row')[0]
    row.focus()
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.click(chip)
    expect(facetChange).toHaveBeenCalledTimes(2)
    const heading = v.getByRole('heading', { name: 'Zulu' })
    const layer = document.createElement('div')
    layer.setAttribute('role', 'dialog')
    layer.getClientRects = () => [{ width: 100, height: 100 }] as unknown as DOMRectList
    document.body.append(layer)
    fireEvent.click(chip)
    fireEvent.change(search, { target: { value: 'blocked' } })
    fireEvent.click(v.getByRole('button', { name: /^Next$/ }))
    fireEvent.click(v.getByRole('button', { name: 'Back to list' }))
    expect(facetChange).toHaveBeenCalledTimes(2)
    expect(search.value).toBe('')
    expect(heading.isConnected).toBe(true)
    expect(v.getByRole('region', { name: 'Record inspector' })).toBeTruthy()
    layer.remove()
    fireEvent.click(v.getByRole('button', { name: /^Next$/ }))
    expect(v.getByRole('heading', { name: 'Alpha' })).toBeTruthy()
    fireEvent.click(v.getByRole('button', { name: 'Back to list' }))
    fireEvent.change(search, { target: { value: 'Alpha' } })
    expect(search.value).toBe('Alpha')
  })
  it('vetoes consumed pointer events and active text selection', () => {
    const v = render(<Consumer />)
    const row = v.getAllByTestId('data-table-row')[0]
    const consumed = (event: Event) => event.preventDefault()
    row.addEventListener('click', consumed)
    fireEvent.click(row)
    expect(v.queryByRole('region', { name: 'Record inspector' })).toBeNull()
    row.removeEventListener('click', consumed)
    const selection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ isCollapsed: false } as Selection)
    fireEvent.click(row)
    expect(v.queryByRole('region', { name: 'Record inspector' })).toBeNull()
    selection.mockRestore()
    fireEvent.click(row)
    expect(v.getByRole('region', { name: 'Record inspector' })).toBeTruthy()
  })
  it('preserves admitted editable search updates during composition while suppressing Escape', () => {
    const v = render(<Consumer />)
    const search = v.getByRole('searchbox') as HTMLInputElement
    fireEvent.compositionStart(search)
    fireEvent.change(search, {target: {value: '字'}})
    expect(search.value).toBe('字')
    fireEvent.keyDown(search, {key: 'Escape'})
    expect(search.value).toBe('字')
    fireEvent.compositionEnd(search)
    fireEvent.keyDown(search, {key: 'Escape'})
    expect(search.value).toBe('')
  })
  it('withholds counts and interactions for duplicate or nonadmitted matched IDs', () => {
    const v = render(<Consumer duplicate />)
    expect(v.getByRole('alert').textContent).toContain('identifiers')
    expect(v.queryAllByTestId('data-table-row')).toHaveLength(0)
    expect(v.getByText('Counts unavailable')).toBeTruthy()
  })
})
