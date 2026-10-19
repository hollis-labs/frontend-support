/**
 * Where the token vocabulary comes from — and why it is not in this package.
 *
 * The contract (§10) makes TypeScript the single source and generates the CSS
 * from it, with CI running the generator in `--check` mode. A hardcoded copy of
 * the token names in this config would be a THIRD list, drifting from the two the
 * contract just unified, and the drift would be invisible: the rule would report
 * a real token as undefined, or miss an invented one.
 *
 * So the vocabulary is injected. `@hollis-labs/design-tokens` is the default
 * source; tests and consumers with their own vocabulary pass one explicitly.
 *
 * If the package cannot be resolved we THROW rather than fall back to a built-in
 * list. A lint config that silently substitutes a stale vocabulary is worse than
 * one that refuses to load: the first fails a build for the wrong reason, the
 * second tells you what to fix.
 */

/**
 * @typedef {Object} Vocabulary
 * @property {Set<string>} colors   every legal color token name
 * @property {Set<string>} families first segment of each color token — the set of
 *                                 names that make a remainder "a token reference"
 * @property {Set<string>} text     type-scale steps the contract adds
 * @property {Set<string>} radius   radius steps the contract adds
 * @property {Set<string>} tracking tracking steps the contract adds
 * @property {string[]}    idioms   registered idiom prefixes
 * @property {string}      source   where this came from, for error messages
 */

/** Derive the family set from the token names themselves — never a literal list. */
function familiesOf(colors) {
  const families = new Set()
  for (const name of colors) {
    const first = String(name).split('-')[0]
    if (first) families.add(first)
    // `chart-1`..`chart-5` and `bg-elevated` both contribute their first segment;
    // a token that IS a single segment (`bg`, `fg`, `ring`) contributes itself.
  }
  return families
}

/**
 * Build a Vocabulary from the shapes `@hollis-labs/design-tokens` exports.
 * Accepts the contract's named exports (COLOR_TOKENS / TEXT_TOKENS / …).
 */
export function vocabularyFrom(mod, source = 'explicit') {
  const colors = mod.COLOR_TOKENS ?? mod.colorTokens
  if (!Array.isArray(colors) || colors.length === 0) {
    throw new Error(
      `@hollis-labs/eslint-config-design: ${source} exported no COLOR_TOKENS. ` +
      `The token contract is the source of truth for these rules and this config ` +
      `will not substitute a hardcoded list. See docs/token-contract.md §10.`,
    )
  }
  const aliases = mod.SHADCN_ALIASES ?? mod.shadcnAliases ?? []
  const aliasNames = Array.isArray(aliases) ? aliases : Object.keys(aliases)
  const all = [...colors, ...aliasNames]
  const text = new Set(mod.TEXT_TOKENS ?? mod.textTokens ?? [])
  const radius = new Set(mod.RADIUS_TOKENS ?? mod.radiusTokens ?? [])
  const tracking = new Set(mod.TRACKING_TOKENS ?? mod.trackingTokens ?? [])
  return {
    colors: new Set(all),
    families: familiesOf(all),
    text, radius, tracking,
    // Step VALUES, not just names — the scale rule needs them to tell
    // "restates a named step" (autofix) from "off the scale" (suggest only).
    //
    // The COMPLETE table: Tailwind's inherited steps plus the contract's added
    // ones, both from the tokens package. That is what makes closing the scale a
    // change to one array in design-tokens rather than a rewrite here — drop the
    // inherited steps from that export and every arbitrary value that used to
    // restate one becomes an off-scale error, with no edit to these rules.
    textScale: { ...(mod.INHERITED_TEXT_STEPS ?? {}), ...(mod.TEXT_SCALE ?? {}) },
    radiusScale: { ...(mod.INHERITED_RADIUS_STEPS ?? {}), ...(mod.RADIUS_SCALE ?? {}) },
    trackingScale: { ...(mod.INHERITED_TRACKING_STEPS ?? {}), ...(mod.TRACKING_SCALE ?? {}) },
    idioms: [...(mod.IDIOM_PREFIXES ?? mod.idiomPrefixes ?? [])],
    // name -> replacement, for names that work today and the contract retires.
    deprecated: { ...(mod.DEPRECATED_TOKENS ?? mod.deprecatedTokens ?? {}) },
    source,
  }
}


/**
 * Resolve the vocabulary from the tokens package.
 * Throws with an actionable message when it is not available yet — which it is
 * not until CW-20260910-0124 lands `COLOR_TOKENS`.
 */
export async function resolveVocabulary(specifier = '@hollis-labs/design-tokens') {
  let mod
  try {
    mod = await import(specifier)
  } catch (cause) {
    throw new Error(
      `@hollis-labs/eslint-config-design could not load the token vocabulary from ` +
      `"${specifier}". These rules test token names for MEMBERSHIP in the contract, ` +
      `so they cannot run without it, and this package deliberately ships no ` +
      `fallback list. Either install/build that package, or pass a vocabulary ` +
      `explicitly: designConfig({ vocabulary }).`,
      { cause },
    )
  }
  return vocabularyFrom(mod, specifier)
}
