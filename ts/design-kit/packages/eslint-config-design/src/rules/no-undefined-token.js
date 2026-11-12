import { classStringVisitor } from '../visit.js'
import { COLOR_PREFIXES, PALETTE_FAMILIES } from '../tailwind.js'
import { parseUtility, tokenizeClassString } from '../class-parser.js'

/**
 * The strongest rule in the set, and the one with the best evidence.
 *
 * Four invented token names are live in production across both codebases, at 16
 * use sites, every one of them rendering NO COLOR AT ALL, every one plausible,
 * every one past review:
 *
 *   status-running   kit/settings-panel.tsx:97,117            (12 statuses exist; `running` is not one)
 *   status-info      nanite/SystemPromptsViewer.tsx:116,120   (nanite declares ok/warn/danger only)
 *   bg-bg-surface    nanite/composer/{Drawer,CardRadio,BooleanChoice}.tsx  (the token is `surface`)
 *   warning-fg       nanite/SkillDetailView.tsx:421           (the missing corner of a complete family)
 *
 * A hex literal at least renders something. An invented token renders nothing, so
 * this catches a worse class of defect than no-color-literal does.
 *
 * HOW IT AVOIDS THE OBVIOUS BUG. The naive implementation strips the utility
 * prefix and assumes one segment remains, which misreads every multi-segment
 * token name — `bg-bg-elevated` and `bg-mode-default` are both REAL tokens that a
 * structural parser reports as invented. `bg-bg-surface` (invented) and
 * `bg-bg-elevated` (legitimate) differ by one segment, so no amount of structural
 * reasoning separates them. This rule therefore does no structural reasoning at
 * all: it tests the whole remainder for MEMBERSHIP in the declared vocabulary.
 *
 * It is also deliberately conservative about WHAT it judges. A remainder is only
 * treated as a token reference when its first segment is a family the vocabulary
 * actually declares — so `text-center`, `text-sm` and `border-2` are never
 * candidates. An unrecognised family is ignored rather than flagged, which trades
 * a false negative for never crying wolf. `strictFamilies` flips that.
 *
 * ── IT ALSO READS `var(--…)`, AND THAT HALF HAS ITS OWN EVIDENCE ─────────────
 *
 * Everything above reads CLASS NAMES. That is where the rule was pointed, and it
 * is why nine dead token references survived a package this gate reported clean:
 *
 *   time-series-chart  var(--muted-foreground) var(--popover) var(--border)
 *                      var(--popover-foreground)   axis ticks + tooltip + cursor
 *   donut-chart        var(--muted)                the track
 *   sonner             var(--popover) var(--popover-foreground) var(--border)
 *
 * All nine sat in inline style objects and SVG props, so no rule could read them.
 * The chart's tooltip had never been themed; its axis labels rendered SVG-default
 * black. `no-color-literal` caught an `rgba()` four lines from one of them,
 * because a literal is a string a rule looks at and a `var()` was not.
 *
 * TWO CHECKS, and the second is the one that found the nine:
 *
 *   var(--color-X)  X must be a declared token. Same membership test, same family
 *                   gate, as a class naming X.
 *   var(--X)        where X IS a declared token — the bug. Tokens are emitted as
 *                   `--color-X`, so `var(--X)` names a property that does not
 *                   exist. Every one of the nine is this shape: an author reaching
 *                   for a real token through a name shadcn's template uses and
 *                   this codebase never declared.
 *
 * WHAT IT DELIBERATELY DOES NOT JUDGE. A `var(--x)` whose name is not a token is
 * ignored — `--radius`, `--anchor-width`, `--normal-bg` and any property a
 * third-party library declares are all legitimate, and a rule that guessed at them
 * would cry wolf on every one. `ignore` takes a property name for the rest.
 *
 * BLIND SPOT, STATED BECAUSE AN INSTRUMENT THAT HIDES ONE IS HOW THIS CLASS
 * SURVIVED: a property name built by concatenation — `var(--color-${name})` — is
 * invisible. The reference is split across template chunks, so there is no
 * complete name to test. It is skipped rather than guessed at.
 *
 * AND IT IS NOT THE RESOLVABILITY CHECK. A declared token whose value layer is
 * undefined still passes: the name is in the contract, and this rule tests names.
 */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'A component may only name a token that exists.' },
    schema: [{
      type: 'object',
      properties: {
        tokens: { type: 'array', items: { type: 'string' } },
        families: { type: 'array', items: { type: 'string' } },
        extraFamilies: { type: 'array', items: { type: 'string' } },
        ignore: { type: 'array', items: { type: 'string' } },
        deprecated: { type: 'object', additionalProperties: { type: 'string' } },
        strictFamilies: { type: 'boolean' },
      },
      additionalProperties: false,
    }],
    messages: {
      undefinedToken: 'Token "{{token}}" is not in the contract, so "{{cls}}" renders nothing at all. Did you mean {{suggestion}}?',
      undefinedNoSuggestion: 'Token "{{token}}" is not in the contract, so "{{cls}}" renders nothing at all.',
      unknownFamily: 'Token family "{{family}}" is not declared in the contract, so "{{cls}}" renders nothing at all.',
      retired: 'Token "{{token}}" is retired by the contract — use "{{replacement}}". It still renders today, so this is a migration, not a break.',
      bareTokenProperty: '"var({{prop}})" names the token "{{token}}", but tokens are emitted as `--color-{{token}}`. This property is declared nowhere, so it resolves to nothing — write "var(--color-{{token}})".',
      undefinedCustomProperty: 'Token "{{token}}" is not in the contract, so "var({{prop}})" resolves to nothing.',
    },
  },
  create(context) {
    const opts = context.options[0] ?? {}
    const tokens = new Set(opts.tokens ?? [])
    const deprecated = opts.deprecated ?? {}
    const ignore = new Set(opts.ignore ?? [])
    const strictFamilies = opts.strictFamilies ?? false
    const sourceCode = context.sourceCode
    const palette = new Set(PALETTE_FAMILIES)

    if (tokens.size === 0) return {}

    // Families derived from the vocabulary itself — never a literal list.
    //
    // The gate only judges names whose FAMILY it recognises, which is what keeps
    // it from firing on `text-center` or `border-2`. The consequence is worth
    // stating plainly: a family the vocabulary does not declare at all is
    // invisible to this rule. `bg-status-running` is caught when the repo's
    // vocabulary includes its own `status-*` idiom tokens — which it should,
    // since a repo lints against what it declares — and missed when it does not.
    // `extraFamilies` is the escape valve for declaring a family whose members
    // are not all enumerable.
    const families = new Set([
      ...(opts.families ?? [...tokens].map((t) => t.split('-')[0])),
      ...(opts.extraFamilies ?? []),
    ])

    /** Closest declared token by edit distance, for an actionable message. */
    const suggest = (name) => {
      let best = null
      for (const t of tokens) {
        const d = distance(name, t)
        if (best === null || d < best.d) best = { d, t }
      }
      // Only suggest when it is actually close; a wrong suggestion is worse than none.
      return best && best.d <= Math.max(2, Math.floor(name.length / 3)) ? best.t : null
    }

    return classStringVisitor(sourceCode, (text, locate) => {
      for (const tok of tokenizeClassString(text)) {
        const p = parseUtility(tok.raw, COLOR_PREFIXES)
        if (!p || p.arbitrary) continue
        const value = p.value
        if (tokens.has(value) || ignore.has(value)) continue

        const family = value.split('-')[0]
        // A raw palette utility is no-raw-palette-utility's finding, not ours.
        if (palette.has(family)) continue

        const loc = rangeToLoc(sourceCode, locate(tok.index, tok.raw.length))

        if (!families.has(family)) {
          if (strictFamilies) {
            context.report({ loc, messageId: 'unknownFamily', data: { family, cls: tok.raw } })
          }
          continue
        }

        // A retired name is a different finding from an invented one: it renders
        // correctly today. Saying "renders nothing" about `border-strong` would be
        // false, and a rule that overstates its finding gets argued with.
        if (deprecated[value] !== undefined) {
          context.report({ loc, messageId: 'retired', data: { token: value, replacement: deprecated[value] } })
          continue
        }

        const hint = suggest(value)
        if (hint) {
          context.report({ loc, messageId: 'undefinedToken', data: { token: value, cls: tok.raw, suggestion: `"${hint}"` } })
        } else {
          context.report({ loc, messageId: 'undefinedNoSuggestion', data: { token: value, cls: tok.raw } })
        }
      }

      // ── var(--…) references ────────────────────────────────────────────────
      //
      // The closing `)` or `,` is REQUIRED, and that is what skips a name built by
      // concatenation: `var(--color-${x})` ends its template chunk at `--color-`,
      // with no terminator, so it never matches. Guessing at a partial name is how
      // a rule starts reporting things that are not there.
      for (const m of text.matchAll(/var\(\s*--([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\s*[),]/g)) {
        const bare = m[1]
        const prop = `--${bare}`
        if (ignore.has(prop) || ignore.has(bare)) continue

        const start = m.index + m[0].indexOf(prop)
        const at = () => rangeToLoc(sourceCode, locate(start, prop.length))

        if (bare.startsWith('color-')) {
          const token = bare.slice('color-'.length)
          if (!token || tokens.has(token)) continue
          const family = token.split('-')[0]
          if (palette.has(family)) continue
          // Same conservatism as the class path: only judge a family the
          // vocabulary declares, so an app's own `--color-brandish-thing` is not
          // this rule's business.
          if (!families.has(family)) continue
          if (deprecated[token] !== undefined) {
            context.report({ loc: at(), messageId: 'retired', data: { token, replacement: deprecated[token] } })
            continue
          }
          context.report({ loc: at(), messageId: 'undefinedCustomProperty', data: { token, prop } })
          continue
        }

        // A bare token name. Tokens are emitted as `--color-X`, so this names a
        // property that does not exist — the shape all nine dead references had.
        if (tokens.has(bare)) {
          context.report({ loc: at(), messageId: 'bareTokenProperty', data: { prop, token: bare } })
        }
      }
    })
  },
}

/** Levenshtein, small and local — this runs on short token names only. */
function distance(a, b) {
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

function rangeToLoc(sourceCode, [start, end]) {
  return { start: sourceCode.getLocFromIndex(start), end: sourceCode.getLocFromIndex(end) }
}
