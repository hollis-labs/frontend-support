import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AdminActionButton, AdminField, AdminInput, AdminSelect, AdminTabs } from '../editor'

afterEach(cleanup)

it('keeps selection host-owned and prevents activation of keyboard-focused disabled tabs', async () => {
  const onChange = vi.fn()
  render(<AdminTabs label="Configuration" value="details" onChange={onChange} items={[
    { key: 'details', label: 'Details' }, { key: 'audit', label: 'Audit', disabled: true }, { key: 'edit', label: 'Edit' },
  ]} />)
  const details = screen.getByRole('tab', { name: 'Details' })
  act(() => details.focus())
  fireEvent.keyDown(details, { key: 'ArrowRight' })
  const audit = screen.getByRole('tab', { name: 'Audit' })
  await waitFor(() => expect(document.activeElement).toBe(audit))
  fireEvent.click(audit)
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.keyDown(audit, { key: 'ArrowRight' })
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Edit' })))
  fireEvent.click(screen.getByRole('tab', { name: 'Edit' }))
  expect(onChange).toHaveBeenCalledWith('edit')
  expect(details.getAttribute('aria-selected')).toBe('true')
  fireEvent.click(screen.getByRole('tab', { name: 'Audit' }))
  expect(onChange.mock.calls.every(([value]) => value === 'edit')).toBe(true)
})

it('preserves native fields and explicit form submission without incidental action submits', () => {
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  const select = vi.fn()
  render(<form onSubmit={submit}>
    <AdminField label="Name" htmlFor="name"><AdminInput id="name" name="name" defaultValue="Worker" /></AdminField>
    <AdminField label="Provider" htmlFor="provider"><AdminSelect id="provider" name="provider" defaultValue="one" onChange={e => select(e.target.value)}>
      <option value="one">One</option><option value="two">Two</option>
    </AdminSelect></AdminField>
    <AdminActionButton>Cancel</AdminActionButton><AdminActionButton type="submit">Save</AdminActionButton>
  </form>)
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Worker')
  fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'two' } })
  expect(select).toHaveBeenCalledWith('two')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(submit).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(submit).toHaveBeenCalledOnce()
})
