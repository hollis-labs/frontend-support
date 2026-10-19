import type { SyntaxToken } from './tokens.js'

type Channels = [number, number, number]
export type ColorRepresentation = 'rgb' | 'css'

/** Numeric rules accept opaque #RGB/#RRGGBB, rgb(r g b), rgb(r,g,b), white or black. */
function channels(color: string): Channels {
  const named = { white: '#ffffff', black: '#000000' } as Record<string, string>
  const value = named[color] ?? color
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value)
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1]
    return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16)) as Channels
  }
  const rgb = /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value)
    ?? /^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/.exec(value)
  if (rgb) {
    const result = rgb.slice(1).map(Number)
    if (result.every(c => Number.isFinite(c) && c >= 0 && c <= 255)) return result as Channels
  }
  throw new TypeError(`Expected an opaque sRGB color, received ${color}`)
}
function fraction(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('Fraction must be between 0 and 1')
  return value
}
const percent = (value: number) => Number((fraction(value) * 100).toFixed(10))
const rgbString = (values: number[]) => `rgb(${values.map(c => Math.round(Math.min(255, Math.max(0, c)))).join(' ')})`
const linear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
const encoded = (value: number) => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055

/** R1: add alpha without changing hue. Defaults to the original 12% tint. */
export function deriveMuted(color: string, alpha = 0.12, representation: ColorRepresentation = 'rgb'): string {
  const opacity = percent(alpha)
  if (representation === 'css') return `color-mix(in srgb, ${color} ${opacity}%, transparent)`
  return `rgb(${channels(color).join(' ')} / ${opacity}%)`
}

/** R2: interpolate GAMMA-ENCODED sRGB channels, then round once to 8-bit channels. */
export function mixSrgb(color: string, toward: string, amount: number): string {
  fraction(amount)
  const a = channels(color), b = channels(toward)
  return rgbString(a.map((c, i) => c + (b[i] - c) * amount))
}
export function deriveHover(color: string): string { return mixSrgb(color, 'white', 0.12) }
export function deriveActive(color: string): string { return mixSrgb(color, 'black', 0.12) }
export function deriveSurfaceActive(surfaceHover: string, foreground: string): string {
  return mixSrgb(surfaceHover, foreground, 0.15)
}

/** WCAG relative luminance: sRGB linearized for the contrast calculation. */
export function relativeLuminance(color: string): number {
  const [r, g, b] = channels(color).map(c => linear(c / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(a: string, b: string): number {
  const x = relativeLuminance(a), y = relativeLuminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** R3: choose the higher-contrast candidate, preserving its spelling; ties prefer light.
 * Pass the theme bg as dark to reproduce the original white/bg rule.
 * Current built-ins use black/white after CW-20261001-0498. */
export function deriveForeground(fill: string, dark = '#000000', light = '#ffffff'): string {
  return contrastRatio(fill, light) >= contrastRatio(fill, dark) ? light : dark
}

// Oklab conversions from https://bottosson.github.io/posts/oklab/ .
// The CSS representation below leaves conversion/gamut handling to the browser.
function toOklab(color: string): Channels {
  const [r, g, b] = channels(color).map(c => linear(c / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
function fromOklab([l, a, b]: Channels): number[] {
  const x = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const y = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const z = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * x - 3.3077115913 * y + 0.2309699292 * z,
    -1.2684380046 * x + 2.6097574011 * y - 0.3413193965 * z,
    -0.0041960863 * x - 0.7034186147 * y + 1.707614701 * z].map(c => encoded(c) * 255)
}

/** R4: 100/75/50/25/0 stops from fg to fg-faint, interpolated in Oklab.
 * CSS output supports CSS color expressions. RGB output requires opaque sRGB
 * inputs and rounds/clamps the result to 8-bit sRGB; endpoints stay untouched. */
export function deriveSyntax(foreground: string, faint: string, representation: ColorRepresentation = 'css'): Record<SyntaxToken, string> {
  function stop(weight: number): string {
    if (representation === 'css') return `color-mix(in oklab, ${foreground} ${percent(weight)}%, ${faint})`
    const a = toOklab(foreground), b = toOklab(faint)
    return rgbString(fromOklab(a.map((c, i) => c * weight + b[i] * (1 - weight)) as Channels))
  }
  return { 'syntax-key': foreground, 'syntax-string': stop(0.75), 'syntax-number': stop(0.5), 'syntax-boolean': stop(0.25), 'syntax-null': faint }
}
