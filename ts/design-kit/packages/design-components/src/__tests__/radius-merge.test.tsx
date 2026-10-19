import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { RADIUS_TOKENS } from '@hollis-labs/design-tokens'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

describe.each(RADIUS_TOKENS)('radius token %s', token => {
  const alias = `rounded-${token}`
  it.each(['rounded-lg', 'rounded-md'])('shares a conflict group with %s in either argument order', step => {
    expect(cn(step, alias)).toBe(alias)
    expect(cn(alias, step)).toBe(step)
  })
  it('preserves modifier boundaries and last-argument order within a modifier', () => {
    expect(cn('hover:rounded-lg', `hover:${alias}`)).toBe(`hover:${alias}`)
    expect(cn(`hover:${alias}`, 'hover:rounded-md')).toBe('hover:rounded-md')
    expect(cn('rounded-lg', `hover:${alias}`)).toBe(`rounded-lg hover:${alias}`)
  })
  it('uses the existing directional conflicts without discarding other corners', () => {
    expect(cn('rounded-t-lg', alias)).toBe(alias)
    expect(cn(alias, 'rounded-t-lg')).toBe(`${alias} rounded-t-lg`)
    expect(cn(`rounded-t-${token}`, 'rounded-t-md')).toBe('rounded-t-md')
  })
  it('lets the caller override a primitive without a competing base radius', () => {
    const view = render(<><Button className={alias}>Radius</Button><Input aria-label="Radius" className={alias} /></>)
    for (const element of [view.getByRole('button'), view.getByRole('textbox')]) {
      expect(element.className.split(/\s+/)).toContain(alias)
      expect(element.className.split(/\s+/)).not.toContain('rounded-lg')
    }
  })
})

it('keeps known steps and the existing token-variable workaround working', () => {
  expect(cn('rounded-lg', 'rounded-md')).toBe('rounded-md')
  expect(cn('rounded-md', 'rounded-lg')).toBe('rounded-lg')
  expect(cn('rounded-lg', 'rounded-(--radius-control)')).toBe('rounded-(--radius-control)')
})

it.each(['xs', 'sm', 'icon-xs', 'icon-sm'] as const)('removes the accidental unmodified lg from Button %s while preserving group overrides', size => {
  const view = render(<Button size={size}>Small</Button>)
  const classes = view.getByRole('button').className.split(/\s+/)
  expect(classes).toContain('rounded-control')
  expect(classes).not.toContain('rounded-lg')
  expect(classes).toContain('in-data-[slot=button-group]:rounded-lg')
})
