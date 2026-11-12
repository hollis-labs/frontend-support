/**
 * "What would closing the type scale cost?"
 *
 * Chrispian chose extend-Tailwind-now and deliberately kept closing the scale
 * alive as a future option. That revisit needs evidence: which of Tailwind's
 * inherited steps are actually used, and where. Banning `text-sm` is cheap if
 * nothing names it and expensive if the vendored shadcn set does.
 *
 * So this counts NAMED step usage — the inverse of what the lint rules report.
 * The rules tell you how much is off-scale; this tells you what closing the scale
 * would break.
 *
 *   node scripts/scale-usage-report.mjs <path> [<path>...]
 */
import { readFileSync } from 'node:fs'
import { globSync } from 'node:fs'
import { TW_TEXT_STEPS, TW_RADIUS_STEPS, TW_TRACKING_STEPS } from '../src/tailwind.js'

const targets = process.argv.slice(2)
if (targets.length === 0) {
  console.error('usage: node scripts/scale-usage-report.mjs <path> [<path>...]')
  process.exit(2)
}

const TW = {
  text: new Set(Object.values(TW_TEXT_STEPS)),
  rounded: new Set(Object.values(TW_RADIUS_STEPS)),
  tracking: new Set(Object.values(TW_TRACKING_STEPS)),
}
const CONTRACT = {
  text: new Set(['micro', 'caption', 'label', 'control']),
  rounded: new Set(['panel', 'control']),
  tracking: new Set(['label']),
}

const named = new Map()   // "text-sm" -> count
const arbitrary = new Map()
const files = targets.flatMap((t) => globSync(`${t}/**/*.{ts,tsx,js,jsx}`, { exclude: (p) => /node_modules|\/dist\//.test(p) }))

for (const f of files) {
  let src
  try { src = readFileSync(f, 'utf8') } catch { continue }
  for (const m of src.matchAll(/\b(text|rounded|tracking)-(\[[^\]]+\]|[a-z0-9]+)/g)) {
    const [full, prefix, value] = m
    if (value.startsWith('[')) {
      arbitrary.set(full, (arbitrary.get(full) ?? 0) + 1)
    } else if (TW[prefix].has(value) || CONTRACT[prefix].has(value)) {
      named.set(full, (named.get(full) ?? 0) + 1)
    }
  }
}

const origin = (key) => {
  const [prefix, value] = [key.slice(0, key.indexOf('-')), key.slice(key.indexOf('-') + 1)]
  if (CONTRACT[prefix]?.has(value)) return 'contract'
  if (TW[prefix]?.has(value)) return "Tailwind's"
  return '?'
}

console.log(`scale usage across ${files.length} files in ${targets.join(', ')}\n`)
console.log('NAMED STEPS IN USE — closing the scale means banning the Tailwind ones:')
let twTotal = 0, contractTotal = 0
for (const [k, v] of [...named.entries()].sort((a, b) => b[1] - a[1])) {
  const o = origin(k)
  if (o === "Tailwind's") twTotal += v
  else contractTotal += v
  console.log(`${String(v).padStart(6)}  ${k.padEnd(20)} ${o}`)
}
console.log(`\n  Tailwind-inherited step uses: ${twTotal}   <- the cost of closing the scale`)
console.log(`  contract step uses:           ${contractTotal}`)
console.log(`\nSTILL ARBITRARY — what the rules report (${[...arbitrary.values()].reduce((a, b) => a + b, 0)} uses, ${arbitrary.size} distinct):`)
for (const [k, v] of [...arbitrary.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`${String(v).padStart(6)}  ${k}`)
}
