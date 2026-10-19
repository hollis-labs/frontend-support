import { COLOR_TOKENS, type ColorToken, type SyntaxToken } from './tokens.js'
import type { ThemeMode, TokenValues } from './theme.js'
import { deriveMuted, deriveHover, deriveActive, deriveSurfaceActive, deriveForeground, deriveSyntax } from './derive.js'

export const SYNTAX_DERIVED = ['syntax-key', 'syntax-string', 'syntax-number', 'syntax-boolean', 'syntax-null'] as const
const SYSOP_DERIVED = [
  'surface-active', 'primary-hover', 'primary-active', 'primary-muted',
  'brand-hover', 'brand-active', 'brand-muted', 'danger-hover', 'danger-muted', 'danger-fg',
  'warning-muted', 'warning-fg', 'success-muted', 'success-fg', 'info-muted', 'info-fg',
] as const

/** Authored contrast corrections in 0498, not outputs of R2 on the current fill. */
export const AUTHORED_DANGER_HOVER = ['sysop-p4-white', 'sysop-amber-phosphor', 'sysop-hi-contrast'] as const

export function derivedTokensFor(theme: string, mode: ThemeMode): readonly ColorToken[] {
  if (!theme.startsWith('sysop-')) return ['info-fg', 'warning-fg', ...SYNTAX_DERIVED]
  if (mode === 'light') return SYNTAX_DERIVED
  return [...SYSOP_DERIVED.filter(token => token !== 'danger-hover' || !AUTHORED_DANGER_HOVER.some(id => id === theme)), ...SYNTAX_DERIVED]
}

/** The built-ins' existing rule parameters/serialization choices, not new palette values. */
export function deriveBuiltinToken(theme: string, mode: ThemeMode, values: Partial<TokenValues>, token: ColorToken): string {
  const required = (key: ColorToken): string => {
    const value = values[key]
    if (value === undefined) throw new Error(`Missing ${key} for ${theme}/${mode}/${token}`)
    return value
  }
  if (token.startsWith('syntax-')) {
    const syntax = deriveSyntax(required('fg'), required('fg-faint'), theme === 'sysop-hi-contrast' && mode === 'dark' ? 'rgb' : 'css')
    return syntax[token as keyof typeof syntax]
  }
  if (token === 'surface-active') return deriveSurfaceActive(required('surface-hover'), required('fg'))
  const base = token.slice(0, token.lastIndexOf('-')) as ColorToken
  if (token.endsWith('-hover')) return deriveHover(required(base))
  if (token.endsWith('-active')) return deriveActive(required(base))
  if (token.endsWith('-muted')) {
    const authoredTint = base === 'danger' && AUTHORED_DANGER_HOVER.some(id => id === theme)
    return deriveMuted(required(base), authoredTint ? 0.1 : 0.12, authoredTint ? 'css' : 'rgb')
  }
  if (token.endsWith('-fg')) {
    return theme === 'sysop-hi-contrast' && mode === 'dark'
      ? deriveForeground(required(base), 'rgb(0 0 0)', 'rgb(255 255 255)')
      : deriveForeground(required(base))
  }
  throw new Error(`No derivation rule for ${token}`)
}

type BuiltinDerived<Id extends string, Mode extends ThemeMode> = SyntaxToken | (
  Id extends `sysop-${string}`
    ? Mode extends 'light' ? never : Exclude<typeof SYSOP_DERIVED[number],
      Id extends typeof AUTHORED_DANGER_HOVER[number] ? 'danger-hover' : never>
    : 'info-fg' | 'warning-fg'
)

/** Fill declared derivations; TypeScript still requires every authored token. */
export function deriveBuiltinValues<Id extends string, Mode extends ThemeMode>(
  theme: Id, mode: Mode, palette: Omit<TokenValues, BuiltinDerived<Id, Mode>>,
): TokenValues {
  const values = { ...palette } as Partial<TokenValues>
  for (const token of derivedTokensFor(theme, mode)) values[token] = deriveBuiltinToken(theme, mode, values, token)
  for (const token of COLOR_TOKENS) if (values[token] === undefined) throw new Error(`Missing ${theme}/${mode}/${token}`)
  return values as TokenValues
}
