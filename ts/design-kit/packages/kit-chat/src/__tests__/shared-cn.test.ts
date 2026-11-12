// These six cases are preserved from the retired local cn tests. Their eventual
// home is design-components' tests after the radius decision in PR #47.
import { describe, expect, it } from 'vitest'
import { TEXT_TOKENS } from '@hollis-labs/design-tokens'
import { cn } from '@hollis-labs/design-components'

describe('shared cn behaviour kit-chat relies on', () => {
  it.each(TEXT_TOKENS)('keeps text-%s alongside a foreground color', (token) => {
    expect(cn(`text-${token}`, 'text-fg')).toBe(`text-${token} text-fg`)
    expect(cn('text-fg', `text-${token}`)).toBe(`text-fg text-${token}`)
  })

  it('allows callers to replace size and color independently', () => {
    expect(cn('text-control text-fg', 'text-sm')).toBe('text-fg text-sm')
    expect(cn('text-sm text-fg', 'text-control')).toBe('text-fg text-control')
    expect(cn('text-control text-fg', 'text-danger')).toBe('text-control text-danger')
  })

  it('merges responsive typography without erasing responsive color', () => {
    expect(cn('md:text-sm md:text-fg', 'md:text-control')).toBe('md:text-fg md:text-control')
  })
})
