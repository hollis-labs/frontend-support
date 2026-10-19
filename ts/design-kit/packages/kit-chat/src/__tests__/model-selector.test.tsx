import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Command } from '@hollis-labs/design-components'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ModelSelectorEmpty, ModelSelectorGroup, ModelSelectorInput, ModelSelectorItem, ModelSelectorList, ModelSelectorLogo, ModelSelectorLogoGroup, ModelSelectorName, ModelSelectorSeparator, ModelSelectorShortcut } from '../components/model-selector'

// Exercise real Command content without opening Base UI's portal in jsdom.
// The real Dialog lifecycle is covered by the Chromium evidence script.
const originalScrollIntoView = Element.prototype.scrollIntoView
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView = vi.fn()
})
afterAll(() => { vi.unstubAllGlobals(); Element.prototype.scrollIntoView = originalScrollIntoView })
afterEach(cleanup)
function List({ onSelect = () => {} }: { onSelect?: (value: string) => void }) {
  return <Command label="Search models"><ModelSelectorInput aria-label="Search models" />
    <ModelSelectorList><ModelSelectorEmpty>No matching models</ModelSelectorEmpty>
      <ModelSelectorGroup heading="Local"><ModelSelectorItem value="local-small" keywords={['fast']} onSelect={onSelect}>
        <ModelSelectorLogo provider="local"><span>L</span></ModelSelectorLogo><ModelSelectorName>Small local</ModelSelectorName>
        <ModelSelectorShortcut>Fast</ModelSelectorShortcut></ModelSelectorItem></ModelSelectorGroup>
      <ModelSelectorSeparator /><ModelSelectorGroup heading="Hosted">
        <ModelSelectorItem value="hosted-large" keywords={['reasoning']} onSelect={onSelect}><ModelSelectorName>Large hosted</ModelSelectorName></ModelSelectorItem>
        <ModelSelectorItem value="unavailable" disabled onSelect={onSelect}>Unavailable</ModelSelectorItem>
      </ModelSelectorGroup></ModelSelectorList></Command>
}
describe('model selector content', () => {
  it('filters host supplied values/keywords, shows an empty state and restores groups', async () => {
    render(<List />)
    const input = screen.getByRole('combobox', { name: 'Search models' })
    fireEvent.change(input, { target: { value: 'reasoning' } })
    await waitFor(() => expect(screen.queryByRole('option', { name: /Small local/ })).toBeNull())
    expect(screen.getByRole('option', { name: 'Large hosted' })).toBeTruthy()
    fireEvent.change(input, { target: { value: 'missing' } })
    await waitFor(() => expect(screen.getByText('No matching models')).toBeTruthy())
    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
  })
  it('reports selection to the host and leaves disabled items inert', () => {
    const select = vi.fn(); render(<List onSelect={select} />)
    fireEvent.click(screen.getByRole('option', { name: /Small local/ }))
    expect(select).toHaveBeenLastCalledWith('local-small')
    fireEvent.click(screen.getByRole('option', { name: 'Unavailable' }))
    expect(select).toHaveBeenCalledTimes(1)
  })
  it('uses Command keyboard selection and skips disabled options', async () => {
    const select = vi.fn(); render(<List onSelect={select} />)
    const input = screen.getByRole('combobox', { name: 'Search models' })
    input.focus();fireEvent.keyDown(input, { key: 'ArrowDown' });fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(select).toHaveBeenCalledWith('hosted-large'))
    fireEvent.keyDown(input, { key: 'ArrowDown' });fireEvent.keyDown(input, { key: 'Enter' })
    expect(select).toHaveBeenCalledTimes(2)
    expect(select).not.toHaveBeenCalledWith('unavailable')
  })
  it('renders only consumer logo nodes and supports decorative or labelled slots', () => {
    const view = render(<ModelSelectorLogoGroup><ModelSelectorLogo provider="custom" label="Custom mark"><svg aria-hidden="true"><path d="M0 0" /></svg></ModelSelectorLogo><ModelSelectorLogo data-testid="empty" provider="unknown" /></ModelSelectorLogoGroup>)
    expect(screen.getByRole('img', { name: 'Custom mark' }).querySelector('svg')).toBeTruthy()
    expect(screen.getByTestId('empty').children).toHaveLength(0)
    expect(screen.getByTestId('empty').getAttribute('aria-hidden')).toBe('true')
    view.rerender(<ModelSelectorLogo><span>Host initials</span></ModelSelectorLogo>)
    expect(screen.getByText('Host initials')).toBeTruthy()
  })
})
