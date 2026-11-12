/**
 * The escape hatch has to be legible, or it is just a hole.
 *
 * The task asked for "a documented escape hatch with a required reason comment,
 * so a genuine one-off is legible rather than invisible". ESLint already supports
 * a description after `--` in a disable directive; nothing enforces it. A bare
 * `// eslint-disable-next-line design/no-arbitrary-scale` is indistinguishable
 * from someone silencing a rule they disagreed with, and it survives review the
 * same way the four invented token names did.
 *
 * This rule only governs disables of THIS plugin's rules. It has no opinion about
 * anyone else's.
 *
 * A PRECEDING COMMENT COUNTS AS A REASON. Found by dogfooding this rule on
 * design-app-runtime: sysop-ui's `use-sse.ts` documents both of its disables on the
 * line above the directive —
 *
 *     // `events` is serialized into `eventsKey`; the raw array would re-run every render.
 *     // eslint-disable-next-line react-hooks/exhaustive-deps
 *
 * — which is legible, conventional, and was about to be reported as unexplained.
 * Demanding the `--` form instead would mean every adopting repo rewriting every
 * well-documented disable it already has, which is exactly the friction that gets a
 * rule switched off. The rule's purpose is that a reason be READABLE, not that it sit
 * in a particular slot. `requireInlineReason: true` restores the stricter form for a
 * repo that wants it.
 */
const DIRECTIVE = /^\s*eslint-disable(?:-next-line|-line)?\s+([^]*)$/

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disabling a design rule requires a reason.' },
    schema: [{
      type: 'object',
      properties: {
        pluginName: { type: 'string' },
        /** Only accept a `--` description in the directive itself. Default false. */
        requireInlineReason: { type: 'boolean' },
      },
      additionalProperties: false,
    }],
    messages: {
      needReason: 'Disabling {{rules}} requires a reason: add " -- why" to the directive, or a comment on the line above it. A silent disable is indistinguishable from someone silencing a rule they disagreed with.',
    },
  },
  create(context) {
    const { pluginName = 'design', requireInlineReason = false } = context.options[0] ?? {}
    const sourceCode = context.sourceCode

    /** A comment on the line directly above, which is not itself a directive. */
    const hasPrecedingExplanation = (comment) => {
      const all = sourceCode.getAllComments()
      const i = all.indexOf(comment)
      if (i <= 0) return false
      const prev = all[i - 1]
      if (prev.loc.end.line !== comment.loc.start.line - 1) return false
      if (DIRECTIVE.test(prev.value)) return false
      return prev.value.trim().length > 0
    }

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          const m = DIRECTIVE.exec(comment.value)
          if (!m) continue
          const body = m[1]
          // Everything before ` -- ` is the rule list; after it is the reason.
          const [rulePart, ...reasonParts] = body.split(/\s--\s/)
          const rules = rulePart
            .split(',')
            .map((r) => r.trim())
            .filter((r) => r.startsWith(pluginName + '/'))
          if (rules.length === 0) continue
          const reason = reasonParts.join(' -- ').trim()
          if (reason.length > 0) continue
          if (!requireInlineReason && hasPrecedingExplanation(comment)) continue
          context.report({ node: comment, messageId: 'needReason', data: { rules: rules.join(', ') } })
        }
      },
    }
  },
}
