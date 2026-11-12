/**
 * @hollis-labs/eslint-config-design — the gate.
 *
 * THE ONE RULE: a component may name a token, never a value. It covers scale as
 * much as color; `text-[13px]` names a value exactly as much as `#1a1b26` does.
 *
 * Why a gate and not a guideline: every number in the drift measurement is that
 * guideline being ignored by someone who meant well. And since Chrispian chose to
 * EXTEND Tailwind's type scale rather than close it, `text-[13px]` stays
 * representable — so lint is not a backstop to the type scale, it is the
 * enforcement mechanism for it.
 *
 * The vocabulary is never hardcoded here. See vocabulary.js.
 */

import noColorLiteral from './rules/no-color-literal.js'
import noRawPaletteUtility from './rules/no-raw-palette-utility.js'
import noArbitraryScale from './rules/no-arbitrary-scale.js'
import noUndefinedToken from './rules/no-undefined-token.js'
import noIdiomShadowingContract from './rules/no-idiom-shadowing-contract.js'
import requireDisableReason from './rules/require-disable-reason.js'
import { resolveVocabulary, vocabularyFrom } from './vocabulary.js'
import { loadIdiomManifest } from './idiom-manifest.js'

export { vocabularyFrom, resolveVocabulary, loadIdiomManifest }

export const plugin = {
  meta: { name: '@hollis-labs/eslint-config-design' },
  rules: {
    'no-color-literal': noColorLiteral,
    'no-raw-palette-utility': noRawPaletteUtility,
    'no-arbitrary-scale': noArbitraryScale,
    'no-undefined-token': noUndefinedToken,
    'no-idiom-shadowing-contract': noIdiomShadowingContract,
    'require-disable-reason': requireDisableReason,
  },
}

/** Files that are legitimately allowed to name a color — layer 3, and only layer 3. */
export const DEFAULT_THEME_FILES = [
  '**/design-tokens/src/**',
  '**/lib/theme/**',
  '**/src/styles/**',
  '**/*.theme.{ts,tsx,js,jsx}',
  '**/theme/defaults.{ts,js}',
  '**/theme/tailwind-swatches.{ts,js}',
]

const SOURCE_FILES = ['**/*.{ts,tsx,js,jsx,mts,cts}']

/**
 * Build the flat-config array.
 *
 * Async because the vocabulary is resolved from the tokens package. ESLint 9
 * accepts a promise from `eslint.config.js`, so:
 *
 *   export default await designConfig()
 *
 * @param {Object}  [options]
 * @param {import('./vocabulary.js').Vocabulary} [options.vocabulary]
 *        Pre-built vocabulary. Omit to resolve from @hollis-labs/design-tokens.
 * @param {string[]} [options.files]       globs the rules apply to
 * @param {string[]} [options.themeFiles]  globs exempt from the color rules
 * @param {string[]} [options.chartFiles]
 *        Globs where a color LITERAL is tolerated because a charting library needs
 *        real color strings. EMPTY BY DEFAULT, and deliberately a separate option
 *        from themeFiles: "chart config" is a much narrower carve-out than "theme
 *        file" and must not be smuggled in under it. Prefer the `chart-1..5` JS
 *        accessor the contract specifies (§3.6, §10) over widening this.
 * @param {'error'|'warn'} [options.severity]
 * @param {string[]} [options.ignoreTokens]
 * @param {string[]} [options.idiomManifests] absolute paths to kit-owned JSON
 *        manifests; only enrolled names are legal, within options.files.
 */
export async function designConfig(options = {}) {
  const {
    vocabulary = await resolveVocabulary(),
    files = SOURCE_FILES,
    themeFiles = DEFAULT_THEME_FILES,
    chartFiles = [],
    severity = 'error',
    ignoreTokens = [],
    strictFamilies = false,
    idiomManifests = [],
  } = options

  const contract = [...vocabulary.colors]
  const manifests = await Promise.all(idiomManifests.map((path) => loadIdiomManifest(path, vocabulary)))
  const tokens = [...new Set([...contract, ...manifests.flatMap((m) => m.tokens)])]
  const idioms = [...new Set([...vocabulary.idioms, ...manifests.map((m) => m.prefix)])]
  const deprecated = Object.assign({}, vocabulary.deprecated, ...manifests.map((m) => m.deprecated))
  // Invert name -> value into value -> name, which is what the scale rule needs
  // to recognise "this arbitrary value already has a name".
  const invert = (scale) => Object.fromEntries(
    Object.entries(scale ?? {}).filter(([, v]) => Number.isFinite(v)).map(([name, v]) => [String(v), name]),
  )
  const scaleOptions = {
    text: invert(vocabulary.textScale),
    radius: invert(vocabulary.radiusScale),
    tracking: invert(vocabulary.trackingScale),
  }

  const configs = [
    {
      // Build output is generated, so linting it reports the generator's choices
      // as the author's. It caught a PLACEHOLDER_CHART_COLOR literal in a
      // design-tokens .d.ts — a true statement about a generated file and a
      // useless finding. Excluded here rather than in this repo's gate so every
      // consumer inherits it; a repo that builds to dist should not have to
      // rediscover this.
      name: 'design/ignore-build-output',
      ignores: ['**/dist/**', '**/build/**', '**/*.d.ts', '**/coverage/**'],
    },
    {
      name: 'design/rules',
      files,
      plugins: { design: plugin },
      rules: {
        'design/no-color-literal': severity,
        'design/no-raw-palette-utility': severity,
        'design/no-arbitrary-scale': [severity, scaleOptions],
        'design/no-undefined-token': [severity, {
          tokens,
          families: [...vocabulary.families],
          extraFamilies: [...idioms, ...manifests.flatMap((m) => Object.keys(m.deprecated).map((name) => name.split('-')[0]))],
          ignore: ignoreTokens,
          deprecated,
          // OFF BY DEFAULT, AND MEASURED BEFORE YOU TURN IT ON.
          //
          // The argument for enabling it is good: with it off, a token whose
          // FAMILY the vocabulary does not declare is ignored rather than flagged,
          // which is the gap that let `bg-status-running` reach production. A
          // package authored against the contract has no legacy namespace to
          // protect, so it looked like a free win, and review round 3 approved it
          // for exactly that reason.
          //
          // IT IS NOT FREE. Run against the five contract-authored packages it
          // produces 295 findings, and they are almost entirely TAILWIND'S OWN
          // UTILITIES: `outline-none`, `text-sm`, `border-0`, `bg-transparent`,
          // `ring-0`, `shadow-none`. Top families by count are `sm`, `transparent`,
          // `none`, `xs`, `0`.
          //
          // The reason is structural rather than a tuning problem. The family gate
          // is the ONLY mechanism this rule has for telling a token reference from
          // a Tailwind utility that happens to share a colour prefix — the doc
          // comment above says so. `strictFamilies` removes it, so every
          // `text-<anything>` becomes a candidate. Making it usable needs the rule
          // to know Tailwind's own vocabulary, which it deliberately does not.
          //
          // Left reachable so the option is not lost, and documented so the next
          // person to consider it meets the number rather than the argument.
          strictFamilies,
        }],
        'design/no-idiom-shadowing-contract': [severity, {
          idioms,
          contract,
        }],
        'design/require-disable-reason': severity,
      },
    },
    {
      // Layer 3 is the only layer permitted to name a color. This exemption is
      // load-bearing: without it Nanite reports 627 errors in lib/theme/ and gets
      // recorded as the portfolio's worst offender, when those 627 are correct.
      name: 'design/theme-layer-may-name-colors',
      files: themeFiles,
      rules: {
        'design/no-color-literal': 'off',
        'design/no-raw-palette-utility': 'off',
      },
    },
  ]

  if (chartFiles.length > 0) {
    configs.push({
      name: 'design/chart-configs-may-hold-literal-colors',
      files: chartFiles,
      // Only the literal is tolerated. A chart file still may not invent a token
      // name or write an arbitrary type size.
      rules: { 'design/no-color-literal': 'off' },
    })
  }

  return configs
}

export default { plugin, designConfig, vocabularyFrom, resolveVocabulary, DEFAULT_THEME_FILES }
