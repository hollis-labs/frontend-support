/**
 * Hostile input shapes for ANSI rendering, 100 lines and one line each. For every shape: the ansi-to-react peer alone on the whole
 * input ("peer"), this package's sanitiser alone ("sanitize"), and the built Terminal ("terminal": sanitised, last 65,536
 * characters). Server render in plain Node, warm second run, milliseconds.
 *
 *   npm run build -w @hollis-labs/kit-code
 *   cd packages/kit-code && node demo/scripts/ansi-hostile-shapes.mjs [totalChars=65536] [skip-peer]
 *
 * `skip-peer` leaves the peer-alone column out: on a run of carriage returns it is quadratic, so at 1 MiB it would run for over an hour.
 *
 * The point is shape, not absolute time: a length cap alone does not protect against an ambiguous regex, so each pattern must
 * be linear and the cap must hold in total. Run at the cap (65,536) and at 1 MiB to see which column grows.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(path.resolve('.') + '/')
const React = require('react')
const { renderToString } = require('react-dom/server')
const Ansi = require('ansi-to-react').default
const { Terminal } = await import(path.resolve('dist/terminal.js'))
const { sanitizeForDisplay, toCopyText } = await import(path.resolve('dist/terminal-text.js'))
const h = React.createElement
const peer = (text) => renderToString(h(Ansi, { useClasses: true, linkify: false }, text))
const terminal = (text) => renderToString(h(Terminal, { output: text }))
const ESC = '\x1b'
const total = Number(process.argv[2] ?? 65_536)
const skipPeer = process.argv[3] === 'skip-peer'

// Each shape builds one line of roughly `len` characters.
const shapes = {
  'one delimiter repeated "("': (len) => '('.repeat(len),
  'one delimiter repeated ";"': (len) => ';'.repeat(len),
  'one delimiter repeated "/"': (len) => '/'.repeat(len),
  'long SGR parameters, terminated': (len) => `${ESC}[${'1;'.repeat(len / 2)}m x`,
  'long SGR parameters, unterminated': (len) => `${ESC}[${'1;'.repeat(len / 2)}`,
  'SGR 38;5 repeated': (len) => `${ESC}[38;5;`.repeat(len / 7) + 'x',
  'SGR colour change every 6 chars': (len) => `${ESC}[31ma`.repeat(len / 6),
  'ESC [ repeated (unfinished CSI starts)': (len) => `${ESC}[`.repeat(len / 2),
  'ESC ] repeated (OSC starts)': (len) => `${ESC}]x`.repeat(len / 3),
  'OSC 8 link, unterminated': (len) => `${ESC}]8;;http://x/${'a'.repeat(len)}`,
  'OSC 8 links, terminated': (len) => `${ESC}]8;;http://x\x07L${ESC}]8;;\x07`.repeat(len / 24),
  'DCS, unterminated': (len) => `${ESC}P${'q'.repeat(len)}`,
  'bare ESC repeated': (len) => ESC.repeat(len),
  'backspace run after text': (len) => 'a'.repeat(len / 2) + '\b'.repeat(len / 2),
  'backspaces interleaved "a\\b"': (len) => 'a\b'.repeat(len / 2),
  'backspace after ESC "ESC[\\b"': (len) => `${ESC}[\b`.repeat(len / 3),
  'carriage returns "a\\r"': (len) => 'a\r'.repeat(len / 2),
  'carriage returns only': (len) => '\r'.repeat(len),
  'carriage returns "ab\\rc"': (len) => 'ab\rc'.repeat(len / 4),
  'bidi overrides': (len) => '‮'.repeat(len),
  'C1 controls': (len) => '\u009b'.repeat(len),
  'mixed ESC, BS, CR, SGR': (len) => `${ESC}[3\b1m\ra${ESC}]0;t\x07\b${ESC}[0m`.repeat(len / 18),
}

const ms = (fn, text) => { fn(text); const s = process.hrtime.bigint(); fn(text); return Number(process.hrtime.bigint() - s) / 1e6 }
const cell = (v) => Number.isNaN(v) ? 'skipped'.padStart(9) : (v >= 1000 ? (v / 1000).toFixed(2) + ' s' : v.toFixed(v < 10 ? 1 : 0) + ' ms').padStart(9)
console.log(`total input per case: ${total.toLocaleString('en-US')} characters\n`)
console.log('shape'.padEnd(42) + 'lines'.padStart(6) + 'peer'.padStart(10) + 'sanitize'.padStart(10) + 'terminal'.padStart(10))
let worstPeer = { v: 0 }
let worstOurs = { v: 0 }
for (const [name, build] of Object.entries(shapes)) {
  for (const lines of [100, 1]) {
    const len = Math.max(2, Math.floor(total / lines) - 1)
    const text = Array.from({ length: lines }, () => build(len)).join('\n').slice(0, total)
    const a = skipPeer ? Number.NaN : ms(peer, text)
    const b = ms((t) => { sanitizeForDisplay(t); toCopyText(t) }, text)
    const c = ms(terminal, text)
    if (!skipPeer && a > worstPeer.v) worstPeer = { v: a, name, lines }
    if (Math.max(b, c) > worstOurs.v) worstOurs = { v: Math.max(b, c), name, lines }
    console.log(name.padEnd(42) + String(lines).padStart(6) + cell(a) + cell(b) + cell(c))
  }
}
if (!skipPeer) console.log(`\nslowest peer-alone case: ${worstPeer.name} (${worstPeer.lines} lines) ${worstPeer.v.toFixed(0)} ms`)
console.log(`slowest sanitize/terminal case: ${worstOurs.name} (${worstOurs.lines} lines) ${worstOurs.v.toFixed(0)} ms`)
