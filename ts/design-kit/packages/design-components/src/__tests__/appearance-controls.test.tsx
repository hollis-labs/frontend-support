import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ModeToggle } from '../components/mode-toggle'
import { ThemePicker } from '../components/theme-picker'

afterEach(cleanup)

it('switches to the opposite resolved mode and offers the OS preference', () => {
  const change = vi.fn()
  render(<ModeToggle mode="dark" resolvedMode="dark" onModeChange={change} />)
  fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
  expect(change).toHaveBeenCalledWith('light')
  fireEvent.click(screen.getByRole('button', { name: 'Use system' }))
  expect(change).toHaveBeenCalledWith('system')
})

it('labels the system default and disables the redundant reset', () => {
  render(<ModeToggle mode="system" resolvedMode="light" onModeChange={() => {}} />)
  expect(screen.getByRole('button', { name: 'Switch to dark mode' }).textContent).toContain('(system)')
  expect(screen.getByRole('button', { name: 'Use system' }).hasAttribute('disabled')).toBe(true)
})

it('provides a labeled native theme selector', () => {
  const change = vi.fn()
  render(<ThemePicker themes={[{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }]} theme="a" onThemeChange={change} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), { target: { value: 'b' } })
  expect(change).toHaveBeenCalledWith('b')
})
