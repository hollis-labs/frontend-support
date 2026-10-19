import { classStringVisitor } from '../visit.js'
import { COLOR_PREFIXES, PALETTE_FAMILIES } from '../tailwind.js'
import { parseUtility, tokenizeClassString } from '../class-parser.js'

/**
 * Tangent is the case that shows why this matters: `text-zinc-500` appears 111
 * times beside `text-zinc-400` 93 times, and nothing records whether those two
 * meant the same thing. A palette utility is a value with a friendlier spelling.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'A component may name a semantic token, not a Tailwind palette value.' },
    schema: [{
      type: 'object',
      properties: {
        // `bg-white` / `bg-black` are raw values too, but the contract (§8)
        // deliberately declines to tokenise overlay/scrim — Nanite writes
        // `bg-black/50` and there is no token to point at. Flagging them would
        // demand a name that does not exist, which is how a rule gets disabled.
        includeBlackWhite: { type: 'boolean' },
      },
      additionalProperties: false,
    }],
    messages: {
      palette: 'Raw palette value "{{cls}}" — name a semantic token instead. Two shades of the same family read as a decision nobody recorded.',
    },
  },
  create(context) {
    const { includeBlackWhite = false } = context.options[0] ?? {}
    const sourceCode = context.sourceCode
    const families = new Set(PALETTE_FAMILIES)

    return classStringVisitor(sourceCode, (text, locate) => {
      for (const tok of tokenizeClassString(text)) {
        const p = parseUtility(tok.raw, COLOR_PREFIXES)
        if (!p || p.arbitrary) continue
        const segments = p.value.split('-')
        const isPalette =
          (segments.length === 2 && families.has(segments[0]) && /^\d{2,3}$/.test(segments[1])) ||
          (includeBlackWhite && segments.length === 1 && (p.value === 'white' || p.value === 'black'))
        if (!isPalette) continue
        context.report({
          loc: rangeToLoc(sourceCode, locate(tok.index, tok.raw.length)),
          messageId: 'palette',
          data: { cls: tok.raw },
        })
      }
    })
  },
}

function rangeToLoc(sourceCode, [start, end]) {
  return { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) }
}
