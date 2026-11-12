// CW-20261001-0498: text floors and feedback tints corrected for contrast.
// Syntax follows the new fg-faint floor; filled accents use a legible foreground.
// Declared derivations now call the exported rules (CW-20260913-0027).
// GENERATED CONTENT, HAND-REVIEWED. Source: libs/sysop-ui@aef2dff styles/theme.css,
// as carried into packages/kit-dashboard. Four dark palettes, mapped onto the
// contract vocabulary. See README.md § "Where the values came from" — every value
// listed in DERIVED_TOKEN_VALUES had no source in the palette; authored overrides
// are excluded from that list.
import type { Theme } from '../theme.js'
import { deriveBuiltinValues } from '../derivation-plan.js'
import { SYSOP_LIGHT } from './sysop-light.js'

/** The sysop-ui default. Neutral zinc on near-black; the dense-ops look. */
export const SYSOP_P4_WHITE: Theme = {
  id: 'sysop-p4-white',
  name: 'Sysop — P4 White',
  description: 'The sysop-ui default. Neutral zinc on near-black; the dense-ops look.',
  builtin: true,
  origin: 'sysop-ui',
  chartPalette: 'placeholder',
  /** Light variants added by CW-20261001-0498; see sysop-light.ts. */
  tokens: {
    light: SYSOP_LIGHT.white,
    dark: deriveBuiltinValues('sysop-p4-white', 'dark', {
      'bg': 'rgb(9 9 11)',
      'bg-elevated': 'rgb(24 24 27)',
      'surface': 'rgb(24 24 27)',
      'surface-hover': 'rgb(24 24 27)',
      'fg': 'rgb(244 244 245)',
      'fg-secondary': 'rgb(212 212 216)',
      'fg-muted': 'rgb(161 161 170)',
      'fg-faint': '#83838b',
      'border': 'rgb(39 39 42)',
      'border-subtle': 'rgb(39 39 42 / 80%)',
      'divider': 'rgb(39 39 42 / 70%)',
      'primary': 'rgb(228 228 231)',
      'primary-fg': '#000000',
      'brand': 'rgb(228 228 231)',
      'brand-fg': '#000000',
      'selection': 'rgb(24 24 27)',
      'selection-fg': 'rgb(244 244 245)',
      'ring': '#83838b',
      'danger': '#fb7588',
      'danger-hover': '#fa8495',  // authored contrast correction, not R2
      'warning': 'rgb(245 158 11)',
      'success': 'rgb(52 211 153)',
      'info': 'rgb(96 165 250)',
      'chart-1': '#ff00ff',
      'chart-2': '#ff00ff',
      'chart-3': '#ff00ff',
      'chart-4': '#ff00ff',
      'chart-5': '#ff00ff',
    }),
  },
}

/** P1 phosphor CRT. Green on black, amber for alarm. */
export const SYSOP_GREEN_PHOSPHOR: Theme = {
  id: 'sysop-green-phosphor',
  name: 'Sysop — Green Phosphor',
  description: 'P1 phosphor CRT. Green on black, amber for alarm.',
  builtin: true,
  origin: 'sysop-ui',
  chartPalette: 'placeholder',
  /** Light variants added by CW-20261001-0498; see sysop-light.ts. */
  tokens: {
    light: SYSOP_LIGHT.green,
    dark: deriveBuiltinValues('sysop-green-phosphor', 'dark', {
      'bg': 'rgb(10 10 10)',
      'bg-elevated': 'rgb(18 26 20)',
      'surface': 'rgb(18 26 20)',
      'surface-hover': 'rgb(22 34 25)',
      'fg': 'rgb(0 255 102)',
      'fg-secondary': 'rgb(102 255 170)',
      'fg-muted': 'rgb(93 214 138)',
      'fg-faint': '#35955d',
      'border': 'rgb(38 74 47)',
      'border-subtle': 'rgb(82 153 101 / 70%)',
      'divider': 'rgb(64 108 75 / 60%)',
      'primary': 'rgb(102 255 170)',
      'primary-fg': '#000000',
      'brand': 'rgb(102 255 170)',
      'brand-fg': '#000000',
      'selection': 'rgb(18 26 20)',
      'selection-fg': 'rgb(0 255 102)',
      'ring': 'rgb(102 255 170 / 58%)',
      'danger': 'rgb(255 184 77)',
      'warning': 'rgb(255 212 102)',
      'success': 'rgb(102 255 170)',
      'info': 'rgb(0 204 85)',
      'chart-1': '#ff00ff',
      'chart-2': '#ff00ff',
      'chart-3': '#ff00ff',
      'chart-4': '#ff00ff',
      'chart-5': '#ff00ff',
    }),
  },
}

/** P3 phosphor CRT. Amber on black, orange-red for alarm. */
export const SYSOP_AMBER_PHOSPHOR: Theme = {
  id: 'sysop-amber-phosphor',
  name: 'Sysop — Amber Phosphor',
  description: 'P3 phosphor CRT. Amber on black, orange-red for alarm.',
  builtin: true,
  origin: 'sysop-ui',
  chartPalette: 'placeholder',
  /** Light variants added by CW-20261001-0498; see sysop-light.ts. */
  tokens: {
    light: SYSOP_LIGHT.amber,
    dark: deriveBuiltinValues('sysop-amber-phosphor', 'dark', {
      'bg': 'rgb(10 10 10)',
      'bg-elevated': 'rgb(28 22 14)',
      'surface': 'rgb(28 22 14)',
      'surface-hover': 'rgb(36 28 17)',
      'fg': 'rgb(255 176 0)',
      'fg-secondary': 'rgb(255 208 96)',
      'fg-muted': 'rgb(232 172 72)',
      'fg-faint': '#aa7b1e',
      'border': 'rgb(86 65 26)',
      'border-subtle': 'rgb(160 122 52 / 74%)',
      'divider': 'rgb(110 84 36 / 62%)',
      'primary': 'rgb(255 208 96)',
      'primary-fg': '#000000',
      'brand': 'rgb(255 208 96)',
      'brand-fg': '#000000',
      'selection': 'rgb(28 22 14)',
      'selection-fg': 'rgb(255 176 0)',
      'ring': 'rgb(255 208 96 / 56%)',
      'danger': '#ff7645',
      'danger-hover': '#ff7d3d',  // authored contrast correction, not R2
      'warning': 'rgb(255 208 96)',
      'success': 'rgb(255 208 96)',
      'info': 'rgb(255 176 0)',
      'chart-1': '#ff00ff',
      'chart-2': '#ff00ff',
      'chart-3': '#ff00ff',
      'chart-4': '#ff00ff',
      'chart-5': '#ff00ff',
    }),
  },
}

/** Maximum contrast. Pure black, pure white edges, saturated status hues. */
export const SYSOP_HI_CONTRAST: Theme = {
  id: 'sysop-hi-contrast',
  name: 'Sysop — High Contrast',
  description: 'Maximum contrast. Pure black, pure white edges, saturated status hues.',
  builtin: true,
  origin: 'sysop-ui',
  chartPalette: 'placeholder',
  /** Light variants added by CW-20261001-0498; see sysop-light.ts. */
  tokens: {
    light: SYSOP_LIGHT.contrast,
    dark: deriveBuiltinValues('sysop-hi-contrast', 'dark', {
      'bg': 'rgb(0 0 0)',
      'bg-elevated': 'rgb(18 18 18)',
      'surface': 'rgb(18 18 18)',
      'surface-hover': 'rgb(24 24 24)',
      'fg': 'rgb(255 255 255)',
      'fg-secondary': 'rgb(255 255 255)',
      'fg-muted': 'rgb(235 235 235)',
      'fg-faint': 'rgb(208 208 208)',
      'border': 'rgb(255 255 255)',
      'border-subtle': 'rgb(255 255 255 / 88%)',
      'divider': 'rgb(255 255 255 / 72%)',
      'primary': 'rgb(255 255 0)',
      'primary-fg': 'rgb(0 0 0)',
      'brand': 'rgb(255 255 0)',
      'brand-fg': 'rgb(0 0 0)',
      'selection': 'rgb(18 18 18)',
      'selection-fg': 'rgb(255 255 255)',
      'ring': 'rgb(255 255 0 / 84%)',
      'danger': '#ff645b',
      'danger-hover': '#ff776f',  // authored contrast correction, not R2
      'warning': 'rgb(255 255 0)',
      'success': 'rgb(0 255 0)',
      'info': 'rgb(0 255 255)',
      'chart-1': '#ff00ff',
      'chart-2': '#ff00ff',
      'chart-3': '#ff00ff',
      'chart-4': '#ff00ff',
      'chart-5': '#ff00ff',
    }),
  },
}

export const SYSOP_PALETTES: readonly Theme[] = [
  SYSOP_P4_WHITE,
  SYSOP_GREEN_PHOSPHOR,
  SYSOP_AMBER_PHOSPHOR,
  SYSOP_HI_CONTRAST,
]
