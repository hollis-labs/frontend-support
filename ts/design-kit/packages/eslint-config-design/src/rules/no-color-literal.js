import { classStringVisitor } from '../visit.js'
import { COLOR_PREFIXES } from '../tailwind.js'
import { parseUtility, tokenizeClassString, isComputed } from '../class-parser.js'

/**
 * A hex literal is bounded by exactly 3, 4, 6 or 8 digits with nothing hex-ish
 * after it. The lookahead is what keeps a 40-character git sha out of the
 * results — `#abc12345678…` has more hex digits following, so it never matches.
 */
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g
const COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\s*\(/g
// Non-global twins: `.test()` on a /g regex advances lastIndex and would make
// subsequent calls miss. Only `matchAll` is safe on the global ones.
const HEX_TEST = new RegExp(HEX.source)
const COLOR_FN_TEST = new RegExp(COLOR_FN.source)

export default {
  meta: {
    type: 'problem',
    docs: { description: 'A component may name a token, never a color value.' },
    schema: [{
      type: 'object',
      properties: {
        // Off by default: the contract (§8) deliberately leaves overlay/scrim out,
        // so flagging `bg-black/50` would demand a token that does not exist.
        functions: { type: 'boolean' },
      },
      additionalProperties: false,
    }],
    messages: {
      hex: 'Hex literal "{{value}}" — a component may name a token, never a value. Use a --color-* token; only the theme layer may name a color.',
      fn: 'Color function "{{value}}" — a component may name a token, never a value. Only the theme layer may name a color.',
      arbitrary: 'Arbitrary color "{{cls}}" — the same violation wearing Tailwind\'s clothes. Name a token instead.',
    },
  },
  create(context) {
    const { functions = true } = context.options[0] ?? {}
    const sourceCode = context.sourceCode

    return classStringVisitor(sourceCode, (text, locate) => {
      for (const m of text.matchAll(HEX)) {
        context.report({ loc: rangeToLoc(sourceCode, locate(m.index, m[0].length)), messageId: 'hex', data: { value: m[0] } })
      }
      if (functions) {
        for (const m of text.matchAll(COLOR_FN)) {
          context.report({ loc: rangeToLoc(sourceCode, locate(m.index, m[0].length)), messageId: 'fn', data: { value: m[0].trim() } })
        }
      }
      // `text-[#abc123]`, `bg-[rgb(1,2,3)]` — already covered by the two scans
      // above, so only flag arbitrary color syntax that slipped past them
      // (e.g. a named CSS color: `bg-[rebeccapurple]`).
      for (const tok of tokenizeClassString(text)) {
        const p = parseUtility(tok.raw, COLOR_PREFIXES)
        if (!p?.arbitrary) continue
        if (HEX_TEST.test(p.arbitrary) || COLOR_FN_TEST.test(p.arbitrary)) continue
        if (isComputed(p.arbitrary)) continue
        if (!/^[a-zA-Z]+$/.test(p.arbitrary)) continue
        context.report({
          loc: rangeToLoc(sourceCode, locate(tok.index, tok.raw.length)),
          messageId: 'arbitrary',
          data: { cls: tok.raw },
        })
      }
    })
  },
}

function rangeToLoc(sourceCode, [start, end]) {
  return { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) }
}
