/**
 * Where class names actually live.
 *
 * Scanning only `className=` would miss most of what matters: the kit's own
 * variant maps live in `cva()` calls, `lib/status.ts` holds a plain object of
 * class strings (12 arbitrary type sizes, measured), and Nanite's tone maps are
 * bare `Record<string, string>` constants. The task named this explicitly —
 * "miss cva and you miss where the kit's own variants live".
 *
 * So the visitor is broad on purpose: every string literal and every template
 * chunk in the file. The patterns the rules match are specific enough that a
 * non-class string tripping one is vanishingly unlikely, and the alternative —
 * enumerating the call sites that may contain classes — is a list that goes stale
 * the first time someone writes a new helper.
 */

/**
 * @param {(text: string, locate: (indexInText: number, length: number) => [number, number]) => void} cb
 */
export function classStringVisitor(sourceCode, cb) {
  /** Build a range mapper for a node whose source text contains `text`. */
  const mapper = (node, text) => {
    const nodeText = sourceCode.getText(node)
    // Works whether or not the parser includes quotes/backticks in the range.
    const base = node.range[0] + Math.max(0, nodeText.indexOf(text))
    return (indexInText, length) => [base + indexInText, base + indexInText + length]
  }

  return {
    Literal(node) {
      if (typeof node.value !== 'string' || node.value.length === 0) return
      cb(node.value, mapper(node, node.value), node)
    },
    TemplateElement(node) {
      const raw = node.value?.raw
      if (!raw) return
      cb(raw, mapper(node, raw), node)
    },
  }
}
