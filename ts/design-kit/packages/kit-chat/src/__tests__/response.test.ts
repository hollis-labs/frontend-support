import { describe, expect, it } from 'vitest'
import { acceptsInput, classifyPriorResponse } from '../lib/response'

/**
 * These assert BEHAVIOUR — status string in, classification out. Nothing here counts
 * anything or reads a file, so nothing here breaks when the codebase improves.
 *
 * THE REASON THIS FILE IS THE MOST VALUABLE ONE IN THE PACKAGE: every value it feeds
 * in was OBSERVED reaching `response_status` in production, not read off a schema.
 * The declared enum is four canonical values; `handling` and `failed` also land there
 * and `cancelled` is the legacy spelling. A closed union would have thrown on three
 * of these, which is how "the enum contains it, therefore it works" became this
 * epic's most expensive wrong assumption.
 */
describe('classifyPriorResponse', () => {
  it('treats nothing recorded as open', () => {
    expect(classifyPriorResponse(null)).toEqual({ kind: 'open' })
    expect(classifyPriorResponse(undefined)).toEqual({ kind: 'open' })
    expect(classifyPriorResponse('')).toEqual({ kind: 'open' })
  })

  it('treats a partial as STILL OPEN, because a partial does not claim the envelope', () => {
    // This is the protocol rule from ResponseStatus.IsTerminal(), not a guess: a
    // partial is replaced by the next submission rather than recorded immutably.
    expect(classifyPriorResponse('partial')).toEqual({ kind: 'open' })
    expect(acceptsInput(classifyPriorResponse('partial'))).toBe(true)
  })

  it('classifies the three terminal statuses', () => {
    expect(classifyPriorResponse('submitted')).toEqual({ kind: 'submitted' })
    expect(classifyPriorResponse('canceled')).toEqual({ kind: 'canceled' })
    expect(classifyPriorResponse('error')).toEqual({ kind: 'failed', status: 'error' })
  })

  it('accepts the legacy British spelling as canceled', () => {
    // go-envelopes keeps `cancelled` as a compatibility wire value. A card matching
    // only the American spelling would show a cancelled envelope as still open and
    // invite a second submission.
    expect(classifyPriorResponse('cancelled')).toEqual({ kind: 'canceled' })
  })

  it('classifies the two statuses that reach the column but are not in the enum', () => {
    expect(classifyPriorResponse('handling')).toEqual({ kind: 'pending' })
    expect(classifyPriorResponse('failed')).toEqual({ kind: 'failed', status: 'failed' })
  })

  it('carries an unknown status through instead of guessing', () => {
    const state = classifyPriorResponse('quiesced')
    expect(state).toEqual({ kind: 'unrecognized', status: 'quiesced' })
  })

  it('is total: no input produces an exception', () => {
    const inputs = ['', ' ', 'SUBMITTED', 'null', '0', 'partial ', '💥']
    for (const input of inputs) {
      expect(() => classifyPriorResponse(input)).not.toThrow()
    }
    // Assert the loop examined something, so an empty list cannot pass as a result.
    expect(inputs.length).toBe(7)
  })

  it('is case-sensitive, and that is deliberate', () => {
    // Wire values are lowercase. Accepting `SUBMITTED` would mean quietly accepting
    // a value no producer emits, which hides a real integration bug.
    expect(classifyPriorResponse('SUBMITTED')).toEqual({
      kind: 'unrecognized',
      status: 'SUBMITTED',
    })
  })
})

describe('acceptsInput', () => {
  it('accepts input only when open', () => {
    expect(acceptsInput({ kind: 'open' })).toBe(true)
    expect(acceptsInput({ kind: 'pending' })).toBe(false)
    expect(acceptsInput({ kind: 'submitted' })).toBe(false)
    expect(acceptsInput({ kind: 'canceled' })).toBe(false)
    expect(acceptsInput({ kind: 'failed', status: 'error' })).toBe(false)
  })

  it('does NOT accept input for an unrecognized status', () => {
    // Re-enabling controls against an unknown terminal state invites a second
    // submission, and the second one 409s. Staying locked is the safe default.
    expect(acceptsInput({ kind: 'unrecognized', status: 'quiesced' })).toBe(false)
  })
})
