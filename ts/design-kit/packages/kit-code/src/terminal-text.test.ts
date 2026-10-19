import Ansi from 'ansi-to-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { normalizeLineControls, prepareForDisplay, sanitizeForDisplay, tailOf, toCopyText } from './terminal-text'

const ESC = '\x1b'

describe('sanitizeForDisplay', () => {
  it('keeps colour and style sequences and the layout characters', () => {
    const text = `${ESC}[1;31mred${ESC}[0m ok\ttab\nline\rcr\bbs`
    expect(sanitizeForDisplay(text)).toBe(text)
  })

  it.each([
    ['an OSC 8 hyperlink with a javascript: target', `${ESC}]8;;javascript:alert(1)\x07click${ESC}]8;;\x07`, 'click'],
    ['an OSC title ended by ST', `${ESC}]0;evil title${ESC}\\shown`, 'shown'],
    ['a device control string', `a${ESC}Pq#0;2;0;0;0${ESC}\\b`, 'ab'],
    ['screen and cursor control', `a${ESC}[2Kb${ESC}[1Ac${ESC}[?25ld${ESC}[3;4Hz`, 'abcdz'],
    ['two-byte escapes such as save cursor', `a${ESC}7b${ESC}Mc${ESC}=d`, 'abcd'],
    ['a lone escape (followed by no valid escape)', `a${ESC}\nb`, 'a\nb'],
    ['an escape at the very end', `ok${ESC}`, 'ok'],
    ['a CSI that has not finished arriving', `ok${ESC}[3`, 'ok'],
    ['an OSC that has not finished arriving', `ok${ESC}]0;ti`, 'ok'],
    ['C0 controls other than \\b \\t \\n \\r, and DEL', 'a\x00\x07\x0b\x0c\x1f\x7fb', 'ab'],
    ['C1 controls, including the one-character CSI (U+009B)', 'a\u009b31m\u0090b\u009cc', 'a31mbc'],
    ['bidirectional override and isolate controls', 'safe\u202etxt.exe\u202c \u2066x\u2069', 'safetxt.exe x'],
  ])('removes %s', (_label, input, expected) => {
    expect(sanitizeForDisplay(input)).toBe(expected)
  })

  it('does not let an unterminated OSC or DCS swallow what follows it', () => {
    const rest = 'x'.repeat(10_000)
    // Only the first 4096 payload characters belong to the string, as in a real terminal.
    expect(sanitizeForDisplay(`${ESC}]${rest}`)).toBe('x'.repeat(10_000 - 4096))
    expect(sanitizeForDisplay(`${ESC}P${rest}`)).toBe('x'.repeat(10_000 - 4096))
  })

  it('leaves no escape byte behind', () => {
    const noisy = `${ESC}[31m${ESC}]8;;u\x07t${ESC}]8;;\x07${ESC}[2K${ESC}${ESC}${ESC}[`
    expect(sanitizeForDisplay(noisy)).not.toMatch(new RegExp(String.raw`\x1b(?!\[\d+m)`))
  })
})

describe('toCopyText', () => {
  it('is the visible text: no sequences, newlines for returns, no backspaces', () => {
    const raw = `${ESC}[31mred${ESC}[0m\r\n10%\r20%\bX${ESC}]8;;u\x07link${ESC}]8;;\x07${ESC}[2K`
    expect(toCopyText(raw)).toBe('red\n10%\n20%Xlink')
  })

  it('drops bidirectional override characters too', () => {
    expect(toCopyText('a\u202eb\u2067c')).toBe('abc')
  })

  it('is empty for output that is nothing but control sequences', () => {
    expect(toCopyText(`${ESC}[2J${ESC}[H${ESC}[31m${ESC}[0m`)).toBe('')
  })
})

describe('tailOf', () => {
  it('returns short text untouched', () => {
    expect(tailOf('abc', 10)).toEqual({ text: 'abc', truncated: false })
  })

  it('starts on the next line when the cut fell near a line end', () => {
    expect(tailOf('first line\nsecond line\nthird', 18)).toEqual({ text: 'second line\nthird', truncated: true })
  })

  it('cuts a very long single line where it falls', () => {
    expect(tailOf(`${'x'.repeat(100)}\n${'y'.repeat(10)}`, 8)).toEqual({ text: 'yyyyyyyy', truncated: true })
  })

  it('does not start inside a surrogate pair', () => {
    const text = `abc\u{1F600}def`
    const tail = tailOf(text, 4) // would start on the low surrogate of the emoji
    expect(tail.text).toBe('def')
    expect(tail.text).not.toMatch(/[\udc00-\udfff]/)
  })
})

describe('cost on hostile input', () => {
  // Generous ceilings: these catch backtracking (which would take seconds to forever), not tuning.
  const MB = 1 << 20
  const hostile: Array<[string, string]> = [
    ['an unterminated CSI with a megabyte of parameters', `${ESC}[${'1;'.repeat(MB / 2)}`],
    ['a megabyte of unfinished CSI starts', `${ESC}[1`.repeat(MB / 3)],
    ['a megabyte of OSC starts', `${ESC}]x`.repeat(MB / 3)],
    ['an unterminated OSC megabyte', `${ESC}]${'x'.repeat(MB)}`],
    ['an unterminated DCS megabyte', `${ESC}P${'x'.repeat(MB)}`],
    ['a megabyte of bare escapes', ESC.repeat(MB)],
    ['megabytes of real colour changes', `${ESC}[31ma${ESC}[0m`.repeat((4 * MB) / 10)],
  ]

  it.each(hostile)('sanitizes %s in linear time', (_label, input) => {
    const start = performance.now()
    sanitizeForDisplay(input)
    toCopyText(input)
    expect(performance.now() - start).toBeLessThan(2000)
  })
})

describe('normalizeLineControls', () => {
  it('leaves text without \\r or \\b untouched', () => {
    expect(normalizeLineControls(`${ESC}[31mplain${ESC}[0m\ttext\nmore`)).toBe(`${ESC}[31mplain${ESC}[0m\ttext\nmore`)
  })

  it('collapses a run of carriage returns to one, which the peer reads the same', () => {
    expect(normalizeLineControls('a\r\r\rb\r\n\r\r\nc')).toBe('a\rb\r\n\r\nc')
  })

  it('drops carriage returns at the very end of the text, where they have nothing to overwrite', () => {
    expect(normalizeLineControls('abc\r')).toBe('abc')
    expect(normalizeLineControls('abc\r\r\r')).toBe('abc')
    expect(normalizeLineControls('abc\r\ndef\r')).toBe('abc\r\ndef')
  })

  it('applies a backspace to the character before it, not across a newline', () => {
    expect(normalizeLineControls('abc\b\bd')).toBe('ad')
    expect(normalizeLineControls('ab\n\bc')).toBe('ab\n\bc')
  })

  it('applies backspaces before collapsing carriage returns, as the peer does', () => {
    // A carriage return is a character a backspace can erase: "\r\r\b" leaves one \r, not none.
    expect(normalizeLineControls('x\r\r\by')).toBe('x\ry')
  })

  it('keeps a backspace that has nothing to erase, as the peer does (it is invisible)', () => {
    expect(normalizeLineControls('\bx')).toBe('\bx')
    expect(normalizeLineControls('\b\bx')).toBe('x') // two of them erase each other, as in the peer
  })

  it('finishes in linear time on long runs and on nested backspaces', () => {
    const start = performance.now()
    normalizeLineControls('\r'.repeat(1 << 20))
    normalizeLineControls(`x${'\r'.repeat(1 << 20)}y\n`.repeat(4))
    normalizeLineControls('a'.repeat(1 << 19) + '\b'.repeat(1 << 19))
    normalizeLineControls('a\b'.repeat(1 << 19))
    normalizeLineControls(`${'a'.repeat(1 << 18)}${'\b'.repeat(1 << 18)}`.repeat(2))
    expect(performance.now() - start).toBeLessThan(2000)
  })

  it('does not run away on the nesting that needs the most passes', () => {
    // "aaa\b\ba\b\b" doubled and redoubled: each level needs one more pass, so passes grow like log2(length).
    let nested = 'a'
    for (let level = 0; level < 15; level += 1) nested = `${nested}${nested}\b\b`
    const start = performance.now()
    normalizeLineControls(nested)
    expect(performance.now() - start).toBeLessThan(2000)
  })
})

describe('normalizeLineControls against the peer', () => {
  // The peer's own result must not change: render with and without the normaliser and compare. The one allowed difference is a
  // carriage return left at the very end of the text, which the peer prints as a literal character and the normaliser drops.
  // A seeded generator keeps the cases reproducible.
  const withoutCarriageReturns = (html: string) => html.replaceAll('\r', '').replace(/<span[^>]*><\/span>/g, '') // a run emptied of its \r is an empty span
  const markup = (text: string) => renderToStaticMarkup(createElement(Ansi, { linkify: false, useClasses: true }, text))
  const alphabet = ['a', 'b', ' ', '\r', '\r', '\n', '\b', '\b', ESC, '[', '3', '1', 'm', ';']

  it('renders the same text and styles as the peer alone, for 3,000 random short inputs', () => {
    let seed = 20261002
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    for (let i = 0; i < 3000; i += 1) {
      let text = ''
      for (let n = Math.floor(next() * 40); n > 0; n -= 1) text += alphabet[Math.floor(next() * alphabet.length)]
      expect(withoutCarriageReturns(markup(normalizeLineControls(text))), JSON.stringify(text)).toBe(withoutCarriageReturns(markup(text)))
    }
  }, 60_000)

  it('renders a run of carriage returns in well under a second where the peer alone takes seconds', () => {
    const start = performance.now()
    markup(normalizeLineControls(`a${'\r'.repeat(65_536)}b`))
    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('invariants on malformed and random input', () => {
  // What copy and display promise, stated as properties and checked on seeded random inputs rather than on the cases someone
  // thought of. The literals are the ones a review found leaking a raw ESC.
  const CONTROL = new RegExp(String.raw`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]`)
  const ESC_NOT_SGR = new RegExp(String.raw`\x1b(?!\[[0-9;:]*m)`)
  const generator = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const strings = (alphabet: string[], count: number, maxLength: number, seed: number) => {
    const next = generator(seed)
    return Array.from({ length: count }, () => {
      let text = ''
      for (let n = 1 + Math.floor(next() * maxLength); n > 0; n -= 1) text += alphabet[Math.floor(next() * alphabet.length)]
      return text
    })
  }
  // Short strings over the characters that build and break sequences, then a wider alphabet with the rest of the sequence
  // introducers, private-mode characters, returns, backspaces and bidi controls.
  const narrow = [ESC, '[', ']', '0', '1', ';', 'm', '\n', '\x07', '\\', '\u009b', '!', ' ', 'a']
  const wide = [ESC, ESC, '[', ']', 'P', 'X', '^', '_', '?', ':', ';', '0', '3', '1', 'm', 'K', 'H', '\r', '\b', '\n', '\x07', '\\', '\u202e', '\u009b', ' ', 'a']

  it.each([
    ['an unfinished CSI before a newline', `a${ESC}[31\nb`],
    ['a CSI with a stray BEL', `a${ESC}[31!\x07b`],
    ['an escape before a complete colour sequence', `${ESC}[${ESC}[31mred`],
  ])('leaves no escape in copy text for %s, and none but a complete colour sequence for display', (_label, input) => {
    expect(toCopyText(input)).not.toMatch(CONTROL)
    expect(sanitizeForDisplay(input)).not.toMatch(ESC_NOT_SGR)
    expect(prepareForDisplay(input)).not.toMatch(ESC_NOT_SGR)
  })

  it('shows what a malformed sequence leaves as plain text', () => {
    expect(toCopyText(`a${ESC}[31\nb`)).toBe('a[31\nb')
    expect(toCopyText(`${ESC}[${ESC}[31mred`)).toBe('[red')
    expect(sanitizeForDisplay(`${ESC}[${ESC}[31mred`)).toBe(`[${ESC}[31mred`)
  })

  it.each([
    ['narrow', narrow, 1, 9],
    ['wide', wide, 2, 14],
  ] as const)('toCopyText never returns a control byte (%s alphabet, 60,000 seeded inputs)', (_label, alphabet, seed, maxLength) => {
    for (const text of strings([...alphabet], 60_000, maxLength, seed * 1013)) {
      expect(CONTROL.test(toCopyText(text)), JSON.stringify(text)).toBe(false)
    }
  }, 60_000)

  it.each([
    ['narrow', narrow, 3, 9],
    ['wide', wide, 4, 14],
  ] as const)('every escape that survives display begins a complete colour sequence (%s alphabet, 60,000 seeded inputs)', (_label, alphabet, seed, maxLength) => {
    for (const text of strings([...alphabet], 60_000, maxLength, seed * 1013)) {
      expect(ESC_NOT_SGR.test(sanitizeForDisplay(text)), JSON.stringify(text)).toBe(false)
      expect(ESC_NOT_SGR.test(prepareForDisplay(text)), JSON.stringify(text)).toBe(false)
    }
  }, 60_000)

  it('holds no backspace at the end either: a leftover one would be an invisible control byte in the DOM', () => {
    expect(prepareForDisplay('\bx')).toBe('x')
    expect(prepareForDisplay(`${ESC}]\b\r\r;${ESC}3\b`)).toBe('')
  })

  it('keeps that true after a backspace erases the end of a colour sequence', () => {
    // sanitize keeps ESC[31m; the backspace then removes the m and would leave ESC[31, so prepareForDisplay sanitises again.
    const input = `${ESC}[31m\bred`
    expect(normalizeLineControls(sanitizeForDisplay(input))).toMatch(ESC_NOT_SGR)
    expect(prepareForDisplay(input)).not.toMatch(ESC_NOT_SGR)
  })
})
