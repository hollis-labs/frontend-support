import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createThemeStore } from '../lib/theme-store'
import { useTheme } from '../hooks/use-theme'

let dark = false
let media: EventTarget
const key = 'test.appearance'
const makeStore = () => createThemeStore({ defaultTheme: 'one', themes: ['one', 'two'], storageKey: key })
function changeSystem(matches: boolean) {
  dark = matches
  media.dispatchEvent(new Event('change'))
}

beforeEach(() => {
  localStorage.clear()
  dark = false
  media = new EventTarget()
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return dark },
    addEventListener: media.addEventListener.bind(media),
    removeEventListener: media.removeEventListener.bind(media),
  })))
  document.documentElement.className = 'app-other'
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it('applies the OS default before rendering and keeps unrelated classes', () => {
  dark = true
  const store = makeStore()
  store.initialize()
  expect(store.getSnapshot()).toEqual({ theme: 'one', mode: 'system', resolvedMode: 'dark' })
  expect(document.documentElement.dataset).toMatchObject({ theme: 'one', mode: 'dark' })
  expect(document.documentElement.classList.contains('app-other')).toBe(true)
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(document.documentElement.style.colorScheme).toBe('dark')
  expect(localStorage.getItem(key)).toBeNull()
})

it('persists explicit choice, reloads it, and restores the OS preference', () => {
  const store = makeStore()
  const unsubscribe = store.subscribe(() => {})
  store.setTheme('two')
  store.setMode('light')
  changeSystem(true)
  expect(store.getSnapshot().resolvedMode).toBe('light')
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ theme: 'two', mode: 'light' })
  const reloaded = makeStore()
  reloaded.initialize()
  expect(reloaded.getSnapshot()).toEqual({ theme: 'two', mode: 'light', resolvedMode: 'light' })
  store.setMode('system')
  expect(store.getSnapshot().resolvedMode).toBe('dark')
  changeSystem(false)
  expect(store.getSnapshot().resolvedMode).toBe('light')
  unsubscribe()
})

it('refreshes subscribers across tabs and resets when storage is cleared', () => {
  const store = makeStore()
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  localStorage.setItem(key, JSON.stringify({ theme: 'two', mode: 'dark' }))
  window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }))
  expect(store.getSnapshot()).toEqual({ theme: 'two', mode: 'dark', resolvedMode: 'dark' })
  localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))
  expect(store.getSnapshot()).toEqual({ theme: 'one', mode: 'system', resolvedMode: 'light' })
  expect(listener).toHaveBeenCalled()
  unsubscribe()
  listener.mockClear()
  changeSystem(true)
  expect(listener).not.toHaveBeenCalled()
  const again = store.subscribe(listener)
  expect(store.getSnapshot().resolvedMode).toBe('dark')
  again()
})

describe('untrusted or unavailable preferences', () => {
  it.each(['{bad', 'null', '[]', '{"theme":"missing","mode":"bad"}'])('rejects %s', (raw) => {
    localStorage.setItem(key, raw)
    const store = makeStore()
    store.initialize()
    expect(store.getSnapshot()).toEqual({ theme: 'one', mode: 'system', resolvedMode: 'light' })
    store.setTheme('unknown')
    expect(store.getSnapshot().theme).toBe('one')
  })
  it('can switch even when getting localStorage throws', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked') })
    const store = makeStore()
    expect(() => { store.initialize(); store.setTheme('two'); store.setMode('dark') }).not.toThrow()
    expect(document.documentElement.dataset).toMatchObject({ theme: 'two', mode: 'dark' })
  })
})

it('shares updates between React consumers and has a stable server snapshot', () => {
  const store = makeStore()
  function Probe() { const { resolvedMode } = useTheme(store); return <span>{resolvedMode}</span> }
  expect(renderToString(<Probe />)).toBe('<span>light</span>')
  render(<><Probe /><Probe /></>)
  act(() => store.setMode('dark'))
  expect(screen.getAllByText('dark')).toHaveLength(2)
  expect(store.getServerSnapshot()).toBe(store.getServerSnapshot())
})

it('is inert without browser globals', () => {
  vi.stubGlobal('window', undefined)
  vi.stubGlobal('document', undefined)
  const store = makeStore()
  expect(() => { store.initialize(); store.setTheme('two'); store.setMode('dark') }).not.toThrow()
  expect(store.getServerSnapshot()).toEqual({ theme: 'one', mode: 'system', resolvedMode: 'light' })
})
