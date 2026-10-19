import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useDashboardDocumentScale, type DashboardDocumentScale } from '../hooks/use-dashboard-document-scale'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-dashboard-scale')
})

describe('dashboard document scale ownership', () => {
  it('applies reference scale only while requested and restores the host setting', () => {
    const root = document.documentElement
    root.setAttribute('data-dashboard-scale', 'host')
    const { rerender, unmount } = renderHook(({ scale }: { scale?: DashboardDocumentScale }) => useDashboardDocumentScale(scale), {
      initialProps: { scale: undefined as DashboardDocumentScale | undefined },
    })
    expect(root.getAttribute('data-dashboard-scale')).toBe('host')
    rerender({ scale: 'reference' })
    expect(root.getAttribute('data-dashboard-scale')).toBe('reference')
    rerender({ scale: 'root-relative' })
    expect(root.getAttribute('data-dashboard-scale')).toBe('root-relative')
    rerender({ scale: undefined })
    expect(root.getAttribute('data-dashboard-scale')).toBe('host')
    unmount()
    expect(root.getAttribute('data-dashboard-scale')).toBe('host')
  })

  it('does not erase a later owner’s setting when released', () => {
    const { unmount } = renderHook(() => useDashboardDocumentScale('reference'))
    document.documentElement.setAttribute('data-dashboard-scale', 'later-owner')
    unmount()
    expect(document.documentElement.getAttribute('data-dashboard-scale')).toBe('later-owner')
  })
})
