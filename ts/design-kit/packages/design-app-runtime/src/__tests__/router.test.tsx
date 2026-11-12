import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement as h } from 'react'
import { createRouter } from '../lib/router'

/**
 * The router works in a browser and NOT on a server, deliberately and documented.
 *
 * `parseUrl()` reads `window.location.pathname` from the `useState` initialiser, so
 * it runs during render rather than in an effect. Unlike the API client — where the
 * `window` read was an accident, since the origin never reached the output — a
 * pushState router genuinely needs the URL to produce its first render. Making it
 * SSR-safe means injecting a location source, which is a real API addition and not
 * something to slip into an extraction.
 *
 * These tests pin both halves so the boundary is a decision on record rather than a
 * surprise: it works under a DOM, and it fails loudly without one.
 */
describe('createRouter', () => {
  it('returns the hook directly, not an object wrapping it', () => {
    const useRoute = createRouter({ routes: ['overview', 'detail'] as const, default: 'overview' })
    expect(typeof useRoute).toBe('function')
  })

  it('resolves the current route under a DOM', () => {
    window.history.pushState({}, '', '/ops/detail')
    const useRoute = createRouter({
      routes: ['overview', 'detail'] as const,
      default: 'overview',
      basePath: '/ops',
    })
    function Probe() {
      const { route } = useRoute()
      return h('span', null, route)
    }
    expect(renderToString(h(Probe))).toContain('detail')
  })

  it('falls back to the default route for an unknown segment', () => {
    window.history.pushState({}, '', '/ops/nonsense')
    const useRoute = createRouter({
      routes: ['overview', 'detail'] as const,
      default: 'overview',
      basePath: '/ops',
    })
    function Probe() {
      const { route } = useRoute()
      return h('span', null, route)
    }
    expect(renderToString(h(Probe))).toContain('overview')
  })

  it('requires a DOM — a documented limitation, not a silent one', () => {
    const useRoute = createRouter({ routes: ['a'] as const, default: 'a' })
    const saved = globalThis.window
    // @ts-expect-error -- deliberately removing the global to pin the boundary
    delete globalThis.window
    try {
      function Probe() {
        const { route } = useRoute()
        return h('span', null, route)
      }
      expect(() => renderToString(h(Probe))).toThrow(/window is not defined/)
    } finally {
      globalThis.window = saved
    }
  })
})
