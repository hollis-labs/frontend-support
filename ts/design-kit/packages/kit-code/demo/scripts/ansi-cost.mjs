/**
 * Cost of rendering untrusted ANSI output: the ansi-to-react peer on its own ("before") versus this package's
 * Terminal ("after": sanitised, last 65,536 characters only). Server render in plain Node, second (warm) run.
 *
 *   npm run build -w @hollis-labs/kit-code
 *   cd packages/kit-code && node demo/scripts/ansi-cost.mjs
 *
 * Absolute times depend on the machine and its load; the shape of the table is the point.
 */
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(path.resolve('.') + '/')
const React = require('react')
const { renderToString } = require('react-dom/server')
const Ansi = require('ansi-to-react').default
const { Terminal } = await import(path.resolve('dist/terminal.js'))
const h = React.createElement
const before = (t) => renderToString(h(Ansi, { useClasses: true, linkify: false }, t))   // the peer alone, as upstream would call it
const after = (t) => renderToString(h(Terminal, { output: t }))                           // this component: sanitised, last 65,536 characters
const shapes = {
  'colour change every 6 chars': (n) => '\x1b[31ma'.repeat(n / 6),
  'carriage returns "a\\r"': (n) => 'a\r'.repeat(n / 2),
  'backspaces "a\\b"': (n) => 'a\b'.repeat(n / 2),
  'a realistic coloured log': (n) => '\x1b[32m✓\x1b[0m test case passed in 12ms\n'.repeat(n / 38),
  'plain text': (n) => 'a'.repeat(n),
}
const sizes = [98_304, 1_572_864, 6_291_456]
const fmt = (ms) => (ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms.toFixed(0) + ' ms').padStart(9)
const time = (f, t) => { f(t); const s = process.hrtime.bigint(); f(t); return Number(process.hrtime.bigint() - s) / 1e6 } // second run: warmed
console.log('shape'.padEnd(30) + sizes.map((n) => ((n / 1024) + ' KiB').padStart(22)).join(''))
console.log(''.padEnd(30) + sizes.map(() => '      before     after').join(''))
for (const [name, make] of Object.entries(shapes)) {
  let row = name.padEnd(30)
  for (const n of sizes) { const t = make(n); row += fmt(time(before, t)) + fmt(time(after, t)) + '  ' }
  console.log(row)
}
