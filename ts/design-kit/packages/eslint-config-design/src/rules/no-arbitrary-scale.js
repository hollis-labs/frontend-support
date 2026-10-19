import { classStringVisitor } from '../visit.js'
import {
  SCALE_PREFIXES, TW_TEXT_STEPS, TW_RADIUS_STEPS, TW_TRACKING_STEPS,
} from '../tailwind.js'
import { parseUtility, tokenizeClassString, isComputed } from '../class-parser.js'

/**
 * Scale is the larger half of the one rule: 1,783 arbitrary-value utilities
 * against 24 component-level hex literals, roughly seventy to one.
 *
 * This rule is narrow by design, and the narrowness is what keeps it on. It
 * governs only the three dimensions the contract gives tokens for — type, radius
 * and tracking. It does NOT touch layout geometry or icon-sized boxes (§8:
 * "do not lint arbitrary w/h/min/max"), because `h-[18px]` on an icon wrapper is
 * sized to the glyph inside it, and it does not touch spacing, which is already
 * at 99.4% adherence and gets no tokens at all.
 *
 * Most of what it reports is the easy case: 149 of 212 arbitrary radii in the
 * portfolio restate a Tailwind step exactly. Those are autofixed. Nobody defends
 * `rounded-[4px]` when `rounded-sm` means the same thing.
 */

/**
 * CSS-WIDE KEYWORDS ARE NOT SCALE VALUES, AND REPORTING THEM IS A FALSE POSITIVE.
 *
 * `rounded-[inherit]` names no length. It defers to the parent's computed radius
 * — which is exactly what a nested surface clipping to its container should do,
 * and which no token can express: the scale has no step meaning "whatever my
 * parent said". So every message this rule could emit for it is wrong, and the
 * only escape is a disable directive, which records a rule defect as component
 * debt in the packages that must be clean.
 *
 * Found at `scroll-area.tsx:20` while extracting design-components
 * (CW-20260910-0125). `initial` / `unset` / `revert` / `revert-layer` are listed
 * with it because they are the same category — CSS-wide keywords, legal in any
 * property, never a point on any scale.
 *
 * This NARROWS the rule; it asserts nothing new. It is the same judgment already
 * made for layout geometry and spacing above.
 */
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])

const PX = /^(-?\d+(?:\.\d+)?)px$/
const REM = /^(-?\d+(?:\.\d+)?)rem$/
const EM = /^(-?\d*(?:\.\d+)?)em$/

function pxOf(value) {
  const px = PX.exec(value)
  if (px) return parseFloat(px[1])
  const rem = REM.exec(value)
  if (rem) return parseFloat(rem[1]) * 16
  return null
}

/** Nearest named step, for a suggestion when there is no exact match. */
function nearest(px, steps) {
  let best = null
  for (const [k, name] of Object.entries(steps)) {
    const d = Math.abs(Number(k) - px)
    if (best === null || d < best.d) best = { d, name, px: Number(k) }
  }
  return best
}

export default {
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: { description: 'A component may name a scale step, never a scale value.' },
    schema: [{
      type: 'object',
      properties: {
        text: { type: 'object', additionalProperties: { type: 'string' } },
        radius: { type: 'object', additionalProperties: { type: 'string' } },
        tracking: { type: 'object', additionalProperties: { type: 'string' } },
        dimensions: { type: 'array', items: { enum: ['type', 'radius', 'tracking'] } },
      },
      additionalProperties: false,
    }],
    messages: {
      named: 'Arbitrary value "{{cls}}" restates the named step "{{prefix}}-{{step}}". Write the name.',
      offScale: 'Arbitrary value "{{cls}}" is off the {{dimension}} scale. Nearest named step is "{{prefix}}-{{step}}" ({{stepPx}}); if this really is a one-off, disable the rule on this line with a reason.',
      computed: 'Arbitrary {{dimension}} value "{{cls}}" is computed, so no named step is equivalent. Name a token, or disable the rule on this line with a reason.',
      unparsed: 'Arbitrary {{dimension}} value "{{cls}}" — the {{dimension}} scale is a contract; name a step.',
    },
  },
  create(context) {
    const opts = context.options[0] ?? {}
    const enabled = new Set(opts.dimensions ?? ['type', 'radius', 'tracking'])
    const sourceCode = context.sourceCode

    // A PASSED TABLE REPLACES THE DEFAULT; IT DOES NOT MERGE WITH IT. This is the
    // difference between a rule that can close the scale and one that cannot.
    //
    // Chrispian chose extend-Tailwind-now and deliberately kept closing it alive as
    // a future option. Closing it means `text-sm` stops being a legal name — so if
    // this rule merged Tailwind's steps in unconditionally, `text-[14px]` would
    // forever report as "restates the named step text-sm" and the close would be
    // unrepresentable without editing this file. Replacing means the whole
    // operation is: drop INHERITED_TEXT_STEPS from what design-tokens exports.
    //
    // The TW_* tables below are the fallback for a consumer running these rules
    // with no tokens package at all. They are not the source of truth.
    const steps = {
      type: opts.text ?? TW_TEXT_STEPS,
      radius: opts.radius ?? TW_RADIUS_STEPS,
      tracking: opts.tracking ?? TW_TRACKING_STEPS,
    }

    return classStringVisitor(sourceCode, (text, locate) => {
      for (const tok of tokenizeClassString(text)) {
        const p = parseUtility(tok.raw, Object.keys(SCALE_PREFIXES))
        if (!p?.arbitrary) continue
        const dimension = SCALE_PREFIXES[p.prefix]
        if (!enabled.has(dimension)) continue

        const value = p.arbitrary
        // A CSS-wide keyword is not a value on a scale. See CSS_WIDE_KEYWORDS.
        if (CSS_WIDE_KEYWORDS.has(value.trim().toLowerCase())) continue

        const range = locate(tok.index, tok.raw.length)
        const loc = rangeToLoc(sourceCode, range)

        if (isComputed(value)) {
          context.report({ loc, messageId: 'computed', data: { cls: tok.raw, dimension } })
          continue
        }

        const table = steps[dimension]
        let magnitude = null
        if (dimension === 'tracking') {
          const em = EM.exec(value)
          // `.18em` and `0.18em` are the same value written two ways — six values
          // in the portfolio are written both ways. parseFloat collapses them,
          // which is the whole point of naming the step.
          if (em) magnitude = parseFloat(em[1] === '' ? '0' : em[1])
        } else {
          magnitude = pxOf(value)
        }

        if (magnitude === null) {
          context.report({ loc, messageId: 'unparsed', data: { cls: tok.raw, dimension } })
          continue
        }

        const exact = table[String(magnitude)]
        if (exact !== undefined) {
          // Unambiguous: the value already has a name. Autofix.
          const replacement = tok.raw.slice(0, p.offset) +
            (p.negative ? '-' : '') + p.prefix + '-' + exact +
            (p.opacity ? '/' + p.opacity : '')
          context.report({
            loc, messageId: 'named',
            data: { cls: tok.raw, prefix: p.prefix, step: exact },
            fix: (fixer) => fixer.replaceTextRange(range, replacement),
          })
          continue
        }

        // Off-scale — including the half-pixel values (8.5, 9.5, 10.5, 12.5px).
        // Reported with the nearest step as a SUGGESTION, never an autofix:
        // rounding someone's 10.5px to 10px is a design decision, not a rename.
        const near = nearest(magnitude, table)
        context.report({
          loc, messageId: 'offScale',
          data: { cls: tok.raw, dimension, prefix: p.prefix, step: near.name, stepPx: near.px },
          suggest: [{
            desc: `Use ${p.prefix}-${near.name} (${near.px})`,
            fix: (fixer) => fixer.replaceTextRange(
              range,
              tok.raw.slice(0, p.offset) + (p.negative ? '-' : '') + p.prefix + '-' + near.name + (p.opacity ? '/' + p.opacity : ''),
            ),
          }],
        })
      }
    })
  },
}

function rangeToLoc(sourceCode, [start, end]) {
  return { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) }
}
