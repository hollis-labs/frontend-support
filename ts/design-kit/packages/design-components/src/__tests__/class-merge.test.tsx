import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { TEXT_TOKENS } from '@hollis-labs/design-tokens'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import { Popover, PopoverTrigger } from '../components/ui/popover'
import { Pill } from '../components/pill'
import { Callout } from '../components/callout'
import { TONES, TONE_CLASSES } from '../lib/tone'

const sizes = ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'] as const
const variants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const
const foregrounds = {
  default: 'text-primary-foreground',
  outline: 'hover:text-foreground',
  secondary: 'text-secondary-foreground',
  ghost: 'hover:text-foreground',
  destructive: 'text-destructive',
  link: 'text-primary',
} as const
const buttonTextSize = (size: typeof sizes[number]) => size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-control' : 'text-sm'
const classes = (element: Element) => element.className.split(/\s+/)

it('keeps each contract font size independent of text colors in either order', () => {
  for (const step of TEXT_TOKENS) {
    expect(cn(`text-${step}`, 'text-info')).toBe(`text-${step} text-info`)
    expect(cn('text-primary-foreground', `text-${step}`)).toBe(`text-primary-foreground text-${step}`)
    expect(cn(`text-${step} text-info`, 'text-sm text-danger')).toBe('text-sm text-danger')
    expect(cn('hover:text-caption hover:text-info', 'hover:text-label')).toBe('hover:text-info hover:text-label')
  }
})

describe.each(variants)('Button %s', (variant) => {
  it.each(sizes)('preserves foreground and font size at size=%s', (size) => {
    const { getByRole } = render(<Button variant={variant} size={size}>action</Button>)
    const button = getByRole('button', { name: 'action' })
    expect(classes(button)).toContain(foregrounds[variant])
    expect(classes(button)).toContain(buttonTextSize(size))
  })
  it.each(sizes)('accepts independent color/size overrides at size=%s', (size) => {
    const { getByRole } = render(<Button variant={variant} size={size} className="text-info text-label">action</Button>)
    expect(classes(getByRole('button', { name: 'action' }))).toEqual(expect.arrayContaining(['text-info', 'text-label']))
  })
})

describe.each(TONES)('Pill %s', (tone) => {
  const color = TONE_CLASSES[tone].split(' ').find((token) => token.startsWith('text-'))!
  it('keeps its default caption size and tone', () => {
    const { getByText } = render(<Pill tone={tone}>status</Pill>)
    expect(classes(getByText('status'))).toEqual(expect.arrayContaining(['text-caption', color]))
  })
  it.each(TEXT_TOKENS)('preserves the tone alongside a %s size override', (step) => {
    const { getByText } = render(<Pill tone={tone} className={`text-${step}`}>status</Pill>)
    expect(classes(getByText('status'))).toEqual(expect.arrayContaining([`text-${step}`, color]))
  })
})

it('preserves sizes and colors in other cn consumers', () => {
  const { getByRole, getByLabelText } = render(<>
    <Input aria-label="query" className="text-control text-info" />
    <Checkbox aria-label="flag" defaultChecked className="text-caption text-info" />
    <Popover><PopoverTrigger className="text-caption text-info">choose</PopoverTrigger></Popover>
    <Callout tone="info">notice</Callout>
  </>)
  expect(classes(getByLabelText('query'))).toEqual(expect.arrayContaining(['text-control', 'text-info', 'md:text-sm']))
  expect(classes(getByRole('checkbox'))).toEqual(expect.arrayContaining(['text-caption', 'text-info', 'data-checked:text-primary-foreground']))
  expect(classes(getByRole('button', { name: 'choose' }))).toEqual(expect.arrayContaining(['text-caption', 'text-info']))
  expect(classes(getByRole('alert'))).toEqual(expect.arrayContaining(['text-control', 'text-info']))
})
