import { classStringVisitor } from '../visit.js'
import { COLOR_PREFIXES } from '../tailwind.js'
import { parseUtility, tokenizeClassString } from '../class-parser.js'

/**
 * Contract §9.3, item 2, which names this rule as CW-0117's to own:
 *
 *   "An idiom token may not shadow a contract name. If the segment after the
 *    prefix equals a contract name, it is an error — `--color-chat-primary` is
 *    banned, because a chat component wanting the primary color should name
 *    `primary`."
 *
 * One vocabulary, named layers. An idiom may only ADD. Without this, every kit
 * quietly grows its own `primary`, and "is this ours or everyone's?" stops being
 * answerable by looking at the name — which is the whole reason prefixes exist.
 *
 * Catches both the declaration (`--color-chat-primary` in a string) and the use
 * site (`bg-chat-primary`).
 */
const CUSTOM_PROPERTY = /--color-([a-z0-9-]+)/g

export default {
  meta: {
    type: 'problem',
    docs: { description: 'An idiom token may add to the contract, never shadow it.' },
    schema: [{
      type: 'object',
      properties: {
        idioms: { type: 'array', items: { type: 'string' } },
        contract: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    }],
    messages: {
      shadow: 'Idiom token "{{full}}" shadows the contract name "{{contract}}". An idiom may only add — name "{{contract}}" directly.',
    },
  },
  create(context) {
    const opts = context.options[0] ?? {}
    const idioms = opts.idioms ?? []
    const contract = new Set(opts.contract ?? [])
    const sourceCode = context.sourceCode
    if (idioms.length === 0 || contract.size === 0) return {}

    /** `chat-primary` -> shadowed contract name, or null. */
    const shadowed = (name) => {
      for (const idiom of idioms) {
        if (!name.startsWith(idiom + '-')) continue
        const rest = name.slice(idiom.length + 1)
        if (contract.has(rest)) return rest
      }
      return null
    }

    return classStringVisitor(sourceCode, (text, locate) => {
      // Declaration site: `--color-chat-primary: …`
      for (const m of text.matchAll(CUSTOM_PROPERTY)) {
        const hit = shadowed(m[1])
        if (!hit) continue
        context.report({
          loc: rangeToLoc(sourceCode, locate(m.index, m[0].length)),
          messageId: 'shadow',
          data: { full: m[1], contract: hit },
        })
      }
      // Use site: `bg-chat-primary`
      for (const tok of tokenizeClassString(text)) {
        const p = parseUtility(tok.raw, COLOR_PREFIXES)
        if (!p || p.arbitrary) continue
        const hit = shadowed(p.value)
        if (!hit) continue
        context.report({
          loc: rangeToLoc(sourceCode, locate(tok.index, tok.raw.length)),
          messageId: 'shadow',
          data: { full: p.value, contract: hit },
        })
      }
    })
  },
}

function rangeToLoc(sourceCode, [start, end]) {
  return { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) }
}
