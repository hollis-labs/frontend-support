import { describe, expect, it } from 'vitest'
import { formatCount, formatDuration, formatRelativeTime, formatShortDate } from '../lib/format'

/**
 * The four formatters came here rather than to design-components because zero kit
 * components use them — they are consumer-facing display helpers. They had no tests
 * in sysop-ui; they do now, since they are part of this package's public surface.
 */
describe('formatCount', () => {
  it('passes small numbers through', () => {
    expect(formatCount(0)).toBe('0')
    expect(formatCount(999)).toBe('999')
  })
  it('abbreviates thousands and millions', () => {
    expect(formatCount(1000)).toBe('1.0k')
    expect(formatCount(45_300)).toBe('45.3k')
    expect(formatCount(1_200_000)).toBe('1.2M')
  })
})

describe('formatDuration', () => {
  it('formats seconds, minutes and hours', () => {
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(125)).toBe('2m 05s')
    expect(formatDuration(3780)).toBe('1h 03m')
  })
  it('clamps negative input to zero', () => {
    expect(formatDuration(-10)).toBe('0s')
  })
})

describe('formatRelativeTime', () => {
  it('returns empty string for an unparseable date', () => {
    expect(formatRelativeTime('not a date')).toBe('')
  })
  it('formats recent times relatively', () => {
    expect(formatRelativeTime(new Date(Date.now() - 30_000).toISOString())).toMatch(/^\d+s ago$/)
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago')
    expect(formatRelativeTime(new Date(Date.now() - 3 * 3_600_000).toISOString())).toBe('3h ago')
  })
  it('clamps a future date to 0s rather than going negative', () => {
    expect(formatRelativeTime(new Date(Date.now() + 60_000).toISOString())).toBe('0s ago')
  })
})

describe('formatShortDate', () => {
  it('formats a valid date', () => {
    expect(formatShortDate('2026-05-15T12:00:00Z')).toMatch(/May 1[45]/)
  })
  it('returns an em dash for an invalid one', () => {
    expect(formatShortDate('nope')).toBe('—')
  })
})
