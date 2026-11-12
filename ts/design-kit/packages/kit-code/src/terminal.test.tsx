import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_MAX_CHARS,
  Terminal,
  TerminalActions,
  TerminalClearButton,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalStatus,
  TerminalTitle,
} from './terminal'

const ESC = '\x1b'
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Terminal', () => {
  it('shows a titled header, copy action and a labelled, focusable log region', () => {
    const { container } = render(<Terminal output="hello" />)
    expect(screen.getByText('Terminal')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy terminal output' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Clear terminal output' })).toBeNull()
    const log = screen.getByRole('log', { name: 'Terminal output' })
    expect(log.getAttribute('tabindex')).toBe('0') // a scrolling region a keyboard user can reach
    expect(container.querySelector('pre')!.textContent).toBe('hello')
  })

  it('renders colours and styles as fixed classes, with no inline style anywhere', () => {
    const { container } = render(
      <Terminal output={`${ESC}[31mfail${ESC}[0m ${ESC}[1;42mbold on green${ESC}[0m\n${ESC}[38;5;9mpalette${ESC}[0m`} />,
    )
    expect(container.querySelector('.ansi-red-fg')!.textContent).toBe('fail')
    expect(container.querySelector('.ansi-green-bg.ansi-bold')!.textContent).toBe('bold on green')
    expect(container.querySelector('.ansi-bright-red-fg')!.textContent).toBe('palette') // index 9 arrives as a named class
    expect(container.querySelector('[style]')).toBeNull()
  })

  it('maps the colour roles onto contract utilities that follow theme and mode', () => {
    const { container } = render(<Terminal output="x" />)
    const classes = container.querySelector('pre')!.className
    for (const utility of ['text-danger', 'text-success', 'text-warning', 'text-info', 'text-brand', 'text-fg-muted', 'bg-danger-muted', 'bg-success-muted', 'bg-brand-muted']) {
      expect(classes).toContain(`]:${utility}`)
    }
    expect(classes).not.toMatch(/zinc|#[0-9a-f]{3,6}|rgb\(/i)
  })

  it('shows 256-colour and true-colour output as plain text colour instead of arbitrary colours', () => {
    const { container } = render(<Terminal output={`${ESC}[38;5;196mhot${ESC}[0m ${ESC}[38;2;255;0;0mred${ESC}[0m`} />)
    expect(container.querySelector('[style]')).toBeNull()
    expect(container.querySelector('pre')!.textContent).toBe('hot red')
  })

  it('does not honour conceal: output cannot hide its own text', () => {
    const { container } = render(<Terminal output={`${ESC}[8mhidden${ESC}[0m`} />)
    const span = container.querySelector('.ansi-hidden') as HTMLElement | null
    expect(container.querySelector('pre')!.textContent).toBe('hidden')
    expect(span?.getAttribute('style') ?? '').not.toContain('hidden')
    expect(container.querySelector('pre')!.className).not.toContain('ansi-hidden')
  })

  it('shows the streaming status and a cursor that stops animating under reduced motion', () => {
    const { container } = render(<Terminal isStreaming output="" />)
    expect(screen.getByRole('status').textContent).toBe('Streaming')
    const cursor = container.querySelector('pre span[aria-hidden="true"]')!
    expect(cursor.className).toContain('motion-reduce:animate-none')
  })

  it('has no status while idle', () => {
    render(<Terminal output="" />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('composes its parts when given children', () => {
    render(
      <Terminal output="out" onClear={() => {}}>
        <TerminalHeader>
          <TerminalTitle>Build log</TerminalTitle>
          <TerminalStatus>Running</TerminalStatus>
          <TerminalActions>
            <TerminalClearButton />
          </TerminalActions>
        </TerminalHeader>
        <TerminalContent data-testid="content" />
      </Terminal>,
    )
    expect(screen.getByText('Build log')).toBeTruthy()
    expect(screen.getByTestId('content').textContent).toContain('out')
    expect(screen.getByRole('button', { name: 'Clear terminal output' })).toBeTruthy()
  })

  it('lets content children replace the output', () => {
    render(
      <Terminal output="hidden by children">
        <TerminalContent>custom body</TerminalContent>
      </Terminal>,
    )
    expect(screen.getByText('custom body')).toBeTruthy()
    expect(screen.queryByText('hidden by children')).toBeNull()
  })
})

describe('Terminal with hostile output', () => {
  const payload = [
    `${ESC}[31m<script>window.pwned=1</script><img src=x onerror=alert(1)>${ESC}[0m`,
    '&lt;b&gt; &quot; onmouseover="alert(1)" </pre><iframe src="javascript:alert(1)">',
    `${ESC}]8;;javascript:alert(1)\x07click me${ESC}]8;;\x07`,
    `${ESC}]0;window title\x07title text`,
    'https://example.com/path www.example.org javascript:alert(2) mailto:a@b.c',
    `${ESC}[38;5;1" onclick="alert(3)"mclass attempt`,
  ].join('\n')

  it('creates no script, image, frame, link or event handler from the text', () => {
    const { container } = render(<Terminal output={payload} />)
    expect(container.querySelector('script, img, iframe, a, object, embed, form')).toBeNull()
    for (const element of container.querySelectorAll('*')) {
      expect([...element.attributes].filter((a) => a.name.startsWith('on'))).toEqual([])
    }
  })

  it('shows the markup as inert text, entities undecoded', () => {
    const { container } = render(<Terminal output={payload} />)
    const text = container.querySelector('pre')!.textContent!
    expect(text).toContain('<script>window.pwned=1</script>')
    expect(text).toContain('<img src=x onerror=alert(1)>')
    expect(text).toContain('&lt;b&gt;')
    expect(text).toContain('</pre><iframe src="javascript:alert(1)">')
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined()
  })

  it('does not link URLs, whatever their scheme', () => {
    const { container } = render(<Terminal output={payload} />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.querySelector('pre')!.textContent).toContain('https://example.com/path')
  })

  it('drops OSC hyperlinks and titles instead of printing their payload', () => {
    const { container } = render(<Terminal output={payload} />)
    const text = container.querySelector('pre')!.textContent!
    expect(text).toContain('click me')
    expect(text).toContain('title text')
    expect(text).not.toContain('8;;')
    expect(text).not.toContain('window title')
    expect(text).not.toMatch(new RegExp(String.raw`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]`)) // no control byte reaches the DOM
  })

  it('takes class names only from the renderer, never from the input', () => {
    const { container } = render(<Terminal output={payload} />)
    const classes = [...container.querySelectorAll('pre span')].flatMap((span) => [...span.classList])
    expect(classes.length).toBeGreaterThan(0)
    for (const name of classes) {
      expect(name).toMatch(/^(?:ansi-[a-z]+(?:-[a-z]+)*-(?:fg|bg)|ansi-palette-\d{1,3}-(?:fg|bg)|ansi-(?:bold|dim|italic|underline|strikethrough|blink|reverse|hidden))$/)
    }
    expect(container.querySelector('[onclick]')).toBeNull()
  })

  it('keeps the page intact when the output tries to close its own container', () => {
    const { container } = render(<Terminal output={'</code></pre></div></div><h1 id="owned">x</h1>'} />)
    expect(container.querySelector('h1')).toBeNull()
    expect(container.querySelectorAll('pre')).toHaveLength(1)
  })
})

describe('Terminal bounds', () => {
  const lines = (count: number) => Array.from({ length: count }, (_, i) => `line ${i}`).join('\n')

  it('renders only the last maxChars of a long output and says so', () => {
    const output = lines(40_000) // ~ 430,000 characters
    const { container } = render(<Terminal output={output} />)
    const text = container.querySelector('pre')!.textContent!

    expect(DEFAULT_MAX_CHARS).toBe(65_536)
    expect(text.length).toBeLessThanOrEqual(DEFAULT_MAX_CHARS)
    expect(text.endsWith('line 39999')).toBe(true)
    expect(text).not.toContain('line 0\n')
    expect(text.startsWith('line ')).toBe(true) // began on a line boundary, not mid-line
    expect(screen.getByRole('log').getAttribute('data-truncated')).toBe('true')
    expect(container.querySelector('[data-slot="terminal-truncated"]')!.textContent).toBe(
      `Showing the last ${text.length.toLocaleString('en-US')} of ${output.length.toLocaleString('en-US')} characters.`,
    )
  })

  it('honours a host maxChars, and shows short output whole without a notice', () => {
    const { container, rerender } = render(<Terminal maxChars={50} output={lines(100)} />)
    expect(container.querySelector('pre')!.textContent!.length).toBeLessThanOrEqual(50)
    rerender(<Terminal maxChars={1000} output="short" />)
    expect(container.querySelector('[data-slot="terminal-truncated"]')).toBeNull()
    expect(screen.getByRole('log').hasAttribute('data-truncated')).toBe(false)
  })

  it('keeps the number of rendered elements bounded however much output arrives', () => {
    // One colour change per six characters is the most expensive shape for the renderer.
    const output = `${ESC}[31ma`.repeat(1_000_000)
    const start = performance.now()
    const { container } = render(<Terminal output={output} />)
    const spans = container.querySelectorAll('pre span').length

    expect(spans).toBeLessThanOrEqual(DEFAULT_MAX_CHARS / 6 + 2)
    expect(performance.now() - start).toBeLessThan(8000) // generous: a 6 MB render used to take seconds in node alone
  })

  it('stays fast on control-heavy output that would hurt a naive renderer', () => {
    const output = 'a'.repeat(200_000) + '\b'.repeat(200_000) + 'a\r'.repeat(100_000)
    const start = performance.now()
    render(<Terminal output={output} />)
    expect(performance.now() - start).toBeLessThan(4000)
  })
})

describe('Terminal actions', () => {
  it('copies the visible text of the whole output, not its escape sequences', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const output = `${ESC}[32mok${ESC}[0m\r\n${ESC}]8;;javascript:alert(1)\x07link${ESC}]8;;\x07\n${'x\n'.repeat(60_000)}`
    render(<Terminal output={output} />)

    fireEvent.click(screen.getByRole('button', { name: 'Copy terminal output' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    const copied = writeText.mock.calls[0][0] as string
    expect(copied.startsWith('ok\nlink\n')).toBe(true) // the start, though only the end is displayed
    expect(copied).not.toMatch(new RegExp(String.raw`\x1b|javascript:`))
    expect(copied.length).toBeGreaterThan(DEFAULT_MAX_CHARS)
    await screen.findByRole('button', { name: 'Copied' })
  })

  it('copies the current output after it changes', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { rerender } = render(<Terminal output="old" />)
    rerender(<Terminal output={`${ESC}[34mnew${ESC}[0m`} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy terminal output' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('new'))
  })

  it('reports a missing clipboard through onError', async () => {
    vi.stubGlobal('navigator', {})
    const onError = vi.fn()
    render(
      <Terminal output="x">
        <TerminalCopyButton onError={onError} />
      </Terminal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copy terminal output' }))
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
    expect(onError.mock.calls[0][0].message).toBe('Clipboard API not available')
  })

  it('lets a host onClick cancel copying with preventDefault', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(
      <Terminal output="x">
        <TerminalCopyButton onClick={(event) => event.preventDefault()} />
      </Terminal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copy terminal output' }))
    expect(writeText).not.toHaveBeenCalled()
  })

  it('delegates clear to the host without touching its output', () => {
    const onClear = vi.fn()
    const { container } = render(<Terminal onClear={onClear} output="keep me" />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear terminal output' }))
    expect(onClear).toHaveBeenCalledTimes(1)
    expect(container.querySelector('pre')!.textContent).toBe('keep me')
  })

  it('does not clear when the host onClick prevents it', () => {
    const onClear = vi.fn()
    render(
      <Terminal onClear={onClear} output="x">
        <TerminalClearButton onClick={(event) => event.preventDefault()} />
      </Terminal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Clear terminal output' }))
    expect(onClear).not.toHaveBeenCalled()
  })
})

describe('Terminal scrolling', () => {
  const view = (output: string, autoScroll: boolean) => (
    <Terminal autoScroll={autoScroll} output={output}>
      <TerminalContent data-testid="content" />
    </Terminal>
  )

  it('follows new output only while autoScroll is on', () => {
    const { rerender } = render(view('first', false))
    const content = screen.getByTestId('content')
    Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 300 })
    content.scrollTop = 20

    rerender(view('second', false))
    expect(content.scrollTop).toBe(20)

    act(() => {
      rerender(view('third', true))
    })
    expect(content.scrollTop).toBe(300)
  })
})

describe('Terminal on hostile shapes, 100 lines inside the cap', () => {
  // About 600 characters a line, 100 lines, well inside the 65,536-character window: the whole of it is rendered, so the text must
  // come out exactly as expected and in well under the ceiling. A regex that backtracks on any of these shapes does not.
  const LINES = 100
  const LEN = 600
  const line = (build: (len: number) => string) => Array.from({ length: LINES }, () => build(LEN)).join('\n')
  const exact: Array<[string, (len: number) => string, string]> = [
    ['one delimiter repeated "("', (len) => '('.repeat(len), '('.repeat(LEN)],
    ['one delimiter repeated ";"', (len) => ';'.repeat(len), ';'.repeat(LEN)],
    ['one delimiter repeated "/"', (len) => '/'.repeat(len), '/'.repeat(LEN)],
    ['one delimiter repeated "["', (len) => '['.repeat(len), '['.repeat(LEN)],
    ['long terminated SGR parameters', (len) => `${ESC}[${'1;'.repeat(len / 2)}m kept`, ' kept'],
    ['colour change every six characters', (len) => `${ESC}[31ma`.repeat(len / 6), 'a'.repeat(LEN / 6)],
    ['OSC 8 links', (len) => `${ESC}]8;;http://x\x07L${ESC}]8;;\x07`.repeat(len / 24), 'L'.repeat(LEN / 24)],
    // A space, not a letter, after the escapes: ESC followed by 0x30-0x7E is itself a two-byte escape and takes that character with it.
    ['bare escapes', (len) => `${ESC}`.repeat(len) + ' end', ' end'],
    ['bidi overrides', (len) => `${'‮'.repeat(len)}end`, 'end'],
    ['C1 controls', (len) => `${'\u009b'.repeat(len)}end`, 'end'],
    ['cursor and erase controls', (len) => `${ESC}[2K${ESC}[1A`.repeat(len / 8) + 'end', 'end'],
  ]

  it.each(exact)('keeps %s exactly, and quickly', (_label, build, expectedLine) => {
    const start = performance.now()
    const { container } = render(<Terminal output={line(build)} />)
    const elapsed = performance.now() - start
    expect(container.querySelector('pre')!.textContent).toBe(Array.from({ length: LINES }, () => expectedLine).join('\n'))
    expect(elapsed).toBeLessThan(3000)
  })

  const unterminated: Array<[string, (len: number) => string]> = [
    ['unterminated SGR parameters', (len) => `${ESC}[${'1;'.repeat(len / 2)}`],
    ['unfinished CSI starts', (len) => `${ESC}[`.repeat(len / 2)],
    ['OSC starts', (len) => `${ESC}]x`.repeat(len / 3)],
    ['an unterminated OSC 8 link', (len) => `${ESC}]8;;http://x/${'a'.repeat(len)}`],
    ['an unterminated DCS', (len) => `${ESC}P${'q'.repeat(len)}`],
    ['mixed escape, backspace, return and colour', (len) => `${ESC}[3\b1m\ra${ESC}]0;t\x07\b${ESC}[0m`.repeat(len / 18)],
  ]

  it.each(unterminated)('stays inert and quick on %s', (_label, build) => {
    const start = performance.now()
    const { container } = render(<Terminal output={line(build)} />)
    const elapsed = performance.now() - start
    expect(container.querySelector('script, img, a, iframe')).toBeNull()
    expect(container.querySelector('pre')!.textContent!.length).toBeLessThanOrEqual(DEFAULT_MAX_CHARS)
    expect(elapsed).toBeLessThan(3000)
  })

  const returnsAndBackspaces: Array<[string, (len: number) => string]> = [
    ['carriage returns only', (len) => '\r'.repeat(len)],
    ['text between runs of carriage returns', (len) => `x${'\r'.repeat(len / 2)}y${'\r'.repeat(len / 2)}z`],
    ['alternating "a\\r"', (len) => 'a\r'.repeat(len / 2)],
    ['alternating "ab\\rc"', (len) => 'ab\rc'.repeat(len / 4)],
    ['backspaces after text', (len) => 'a'.repeat(len / 2) + '\b'.repeat(len / 2)],
    ['alternating "a\\b"', (len) => 'a\b'.repeat(len / 2)],
    ['backspace after an escape', (len) => `${ESC}[\b`.repeat(len / 3)],
  ]

  it.each(returnsAndBackspaces)('renders %s quickly', (_label, build) => {
    const start = performance.now()
    render(<Terminal output={line(build)} />)
    expect(performance.now() - start).toBeLessThan(3000)
  })

  it('renders a single line of 65,536 carriage returns in well under a second (the peer alone took ~6 s)', () => {
    const start = performance.now()
    const { container } = render(<Terminal output={'\r'.repeat(65_536)} />)
    expect(performance.now() - start).toBeLessThan(1000)
    expect(container.querySelector('pre')!.textContent).toBe('')
  })

  it('applies carriage returns and backspaces to what is shown, as a terminal would', () => {
    const { container } = render(<Terminal output={'10%\r20%\r100%\nabc\b\bd\nplain'} />)
    expect(container.querySelector('pre')!.textContent).toBe('100%\nad\nplain')
  })
})

describe('Terminal and malformed sequences', () => {
  it.each([
    ['an unfinished CSI before a newline', `a${ESC}[31\nb`],
    ['a CSI with a stray BEL', `a${ESC}[31!\x07b`],
    ['an escape before a complete colour sequence', `${ESC}[${ESC}[31mred`],
    ['a backspace after a colour sequence', `${ESC}[31m\bred${ESC}[0m`],
  ])('puts no escape or control byte in the DOM for %s', (_label, output) => {
    const { container } = render(<Terminal output={output} />)
    expect(container.textContent).not.toMatch(new RegExp(String.raw`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]`))
  })

  it('puts no escape or control byte in the DOM for 2,000 seeded random inputs', () => {
    const alphabet = [ESC, ESC, '[', ']', 'P', '?', ';', '0', '3', '1', 'm', 'K', '\r', '\b', '\n', '\x07', '\\', '\u009b', ' ', 'a']
    let seed = 99
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const control = new RegExp(String.raw`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]`)
    for (let i = 0; i < 2000; i += 1) {
      let output = ''
      for (let n = 1 + Math.floor(next() * 16); n > 0; n -= 1) output += alphabet[Math.floor(next() * alphabet.length)]
      const { container, unmount } = render(<Terminal output={output} />)
      expect(control.test(container.querySelector('pre')!.textContent!), JSON.stringify(output)).toBe(false)
      unmount()
    }
  }, 60_000)

  it('copies no control byte for malformed input', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<Terminal output={`a${ESC}[31\nb ${ESC}[${ESC}[31mred ${ESC}]8;;x`} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy terminal output' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText.mock.calls[0][0]).not.toMatch(new RegExp(String.raw`[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]`))
  })
})
