import { describe, expect, it, vi } from 'vitest'
import {
  applyReference,
  detectSuggestion,
  filterSuggestions,
  removeSuggestion,
  type ChatTrigger,
  type CommandTrigger,
  type ReferenceTrigger,
  type SuggestionItem,
} from '../lib/suggestion'

const commands: CommandTrigger = {
  id: 'slash',
  kind: 'command',
  char: '/',
  atLineStart: true,
  onSelect: () => {},
  items: [
    { id: 'clear', label: 'clear', description: 'Clear the thread' },
    { id: 'model', label: 'model', keywords: ['switch', 'llm'] },
  ],
}

const files: ReferenceTrigger = {
  id: 'at',
  kind: 'reference',
  char: '@',
  items: [
    { id: 'readme', label: 'README.md' },
    { id: 'pkg', label: 'package.json', value: 'src/package.json' },
  ],
}

const triggers: readonly ChatTrigger[] = [commands, files]

/** `|` marks the caret, and is stripped before the call. */
function at(withCaret: string) {
  const caret = withCaret.indexOf('|')
  if (caret === -1) throw new Error('fixture must contain a | caret marker')
  return { text: withCaret.replace('|', ''), caret }
}

describe('detectSuggestion', () => {
  it('opens a command at the start of the text', () => {
    const { text, caret } = at('/cl|')
    expect(detectSuggestion(text, caret, triggers)).toMatchObject({ query: 'cl', from: 0, to: 3 })
  })

  it('opens a reference after whitespace', () => {
    const { text, caret } = at('see @REA|')
    expect(detectSuggestion(text, caret, triggers)).toMatchObject({ query: 'REA', from: 4 })
  })

  it('does NOT open mid-word — an email address is not a reference', () => {
    const { text, caret } = at('mail ada@example|')
    expect(detectSuggestion(text, caret, triggers)).toBeNull()
  })

  it('does NOT open a line-start-only trigger mid-line — a path is not a command', () => {
    const { text, caret } = at('see src/lib|')
    expect(detectSuggestion(text, caret, triggers)).toBeNull()
  })

  it('opens a line-start trigger on a later line', () => {
    const { text, caret } = at('hello\n/cle|')
    expect(detectSuggestion(text, caret, triggers)).toMatchObject({ query: 'cle', from: 6 })
  })

  it('closes once a space follows the query', () => {
    const { text, caret } = at('@README.md |')
    expect(detectSuggestion(text, caret, triggers)).toBeNull()
  })

  it('keeps the menu open across spaces when the trigger allows it', () => {
    const spaced: ReferenceTrigger = { ...files, allowSpaces: true }
    const { text, caret } = at('@my file na|')
    expect(detectSuggestion(text, caret, [spaced])).toMatchObject({ query: 'my file na' })
  })

  it('matches an empty query so the bare trigger shows the whole list', () => {
    const { text, caret } = at('see @|')
    expect(detectSuggestion(text, caret, triggers)).toMatchObject({ query: '' })
  })

  it('does not run past a newline', () => {
    const { text, caret } = at('@README\nhello|')
    expect(detectSuggestion(text, caret, triggers)).toBeNull()
  })

  it('returns null for an out-of-range caret rather than throwing', () => {
    expect(detectSuggestion('@ada', 99, triggers)).toBeNull()
    expect(detectSuggestion('@ada', -1, triggers)).toBeNull()
  })

  it('returns null when no triggers are configured', () => {
    const { text, caret } = at('@RE|')
    expect(detectSuggestion(text, caret, [])).toBeNull()
  })

  it('reports WHICH trigger matched, so the caller can branch on kind', () => {
    const c = at('/cl|')
    expect(detectSuggestion(c.text, c.caret, triggers)?.trigger.kind).toBe('command')
    const r = at('see @RE|')
    expect(detectSuggestion(r.text, r.caret, triggers)?.trigger.kind).toBe('reference')
  })
})

describe('applyReference — the @ flow, which becomes text', () => {
  it('replaces the trigger-and-query span and reports the caret', () => {
    const { text, caret } = at('@REA|')
    const active = detectSuggestion(text, caret, triggers)!
    const next = applyReference(text, active, files, { id: 'readme', label: 'README.md' })
    expect(next).toEqual({ text: '@README.md ', caret: 11 })
  })

  it('PRESERVES TEXT AFTER THE CARET — the bug this shape exists to prevent', () => {
    const { text, caret } = at('look at @REA| before merging')
    const active = detectSuggestion(text, caret, triggers)!
    const next = applyReference(text, active, files, { id: 'readme', label: 'README.md' })
    expect(next.text).toBe('look at @README.md  before merging')
    expect(next.text.slice(next.caret)).toBe(' before merging')
  })

  it('inserts `value` rather than `label` when they differ', () => {
    const { text, caret } = at('@pack|')
    const active = detectSuggestion(text, caret, triggers)!
    const next = applyReference(text, active, files, {
      id: 'pkg',
      label: 'package.json',
      value: 'src/package.json',
    })
    expect(next.text).toBe('@src/package.json ')
  })

  it('honours a custom suffix', () => {
    const colon: ReferenceTrigger = { ...files, suffix: ': ' }
    const { text, caret } = at('@REA|')
    const active = detectSuggestion(text, caret, [colon])!
    const next = applyReference(text, active, colon, { id: 'readme', label: 'README.md' })
    expect(next.text).toBe('@README.md: ')
  })
})

describe('removeSuggestion — the / flow, which inserts nothing', () => {
  it('removes the span entirely rather than inserting the command', () => {
    const { text, caret } = at('/cle|')
    const active = detectSuggestion(text, caret, triggers)!
    expect(removeSuggestion(text, active)).toEqual({ text: '', caret: 0 })
  })

  it('leaves the rest of the draft intact', () => {
    const { text, caret } = at('/mod| and keep this')
    const active = detectSuggestion(text, caret, triggers)!
    const next = removeSuggestion(text, active)
    expect(next.text).toBe(' and keep this')
    expect(next.caret).toBe(0)
  })

  it('a command trigger cannot be constructed without onSelect', () => {
    // @ts-expect-error — onSelect is required on CommandTrigger; a command that does
    // nothing is a bug, and here it does not compile.
    const bad: CommandTrigger = { id: 'x', kind: 'command', char: '!', items: [] }
    expect(bad).toBeTruthy()
  })

  it('a reference trigger has no onSelect to call', () => {
    // @ts-expect-error — `onSelect` belongs to CommandTrigger only.
    const bad: ReferenceTrigger = { id: 'y', kind: 'reference', char: '#', items: [], onSelect: vi.fn() }
    expect(bad).toBeTruthy()
  })
})

describe('filterSuggestions', () => {
  const items: readonly SuggestionItem[] = commands.items

  it('returns everything for an empty query', () => {
    expect(filterSuggestions(items, '')).toHaveLength(2)
  })

  it('matches on label, case-insensitively', () => {
    expect(filterSuggestions(items, 'CLE').map((i) => i.id)).toEqual(['clear'])
  })

  it('matches on keywords, which is the point of having them', () => {
    expect(filterSuggestions(items, 'llm').map((i) => i.id)).toEqual(['model'])
  })

  it('returns empty rather than everything when nothing matches', () => {
    expect(filterSuggestions(items, 'zzz')).toEqual([])
  })
})
