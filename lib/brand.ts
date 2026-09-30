// Brand color helpers for client portals: whatever color a freelancer picks,
// text on it and text tinted with it stays readable on the dark portal.

export const DEFAULT_BRAND = '#865fd9'
const INK = '#0c0b10'
const PAPER = '#eeeae3'

export function normalizeBrand(color: string | null | undefined): string {
  const c = (color || '').trim()
  if (/^#[0-9a-f]{6}$/i.test(c)) return c
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map((ch) => ch + ch).join('')
  return DEFAULT_BRAND
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** White or near-black, whichever has more contrast on the brand color. */
export function textOnBrand(hex: string): string {
  const L = luminance(hex)
  const withWhite = 1.05 / (L + 0.05)
  const withInk = (L + 0.05) / (luminance(INK) + 0.05)
  return withWhite >= withInk ? '#ffffff' : INK
}

/** The brand color lifted toward paper, for text, icons and dots on the dark portal. */
export function brandInk(hex: string): string {
  return `color-mix(in oklab, ${hex} 55%, ${PAPER})`
}

export function brandSurface(hex: string): string {
  return `color-mix(in oklab, ${hex} 16%, ${INK})`
}

export function brandLine(hex: string): string {
  return `color-mix(in oklab, ${hex} 34%, transparent)`
}
