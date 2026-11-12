import { useLayoutEffect } from 'react'

export type DashboardDocumentScale = 'reference' | 'root-relative'

/** Optional application-level scale override; the dashboard theme already uses
 * reference geometry with no hook. Use root-relative only as a deliberate app
 * choice, never based on the current route. Undefined leaves the host alone.
 * The document boundary also covers controls rendered into portals. */
export function useDashboardDocumentScale(scale?: DashboardDocumentScale) {
  useLayoutEffect(() => {
    if (!scale) return
    const root = document.documentElement
    const attribute = 'data-dashboard-scale'
    const previous = root.getAttribute(attribute)
    root.setAttribute(attribute, scale)
    return () => {
      if (root.getAttribute(attribute) !== scale) return
      if (previous === null) root.removeAttribute(attribute)
      else root.setAttribute(attribute, previous)
    }
  }, [scale])
}
