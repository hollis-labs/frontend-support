import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const theme = readFileSync(join(__dirname, '../styles/theme.css'), 'utf8')

describe('search field height token (CW-20261112-0113)', () => {
  it('defaults to the control height so search sits level with adjacent controls', () => {
    expect(theme).toMatch(/--dash-search-min-height:\s*var\(--dash-control-height\);/)
  })

  it('is the only min-height source for the search field and adapter', () => {
    const rule = /\.dash-search-adapter > div, \.dash-search-field \{([^}]*)\}/.exec(theme)?.[1] ?? ''
    expect(rule).toMatch(/min-height:\s*var\(--dash-search-min-height\);/)
    expect(rule).not.toMatch(/min-height:\s*calc/)
  })
})
