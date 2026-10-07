// Brand color helpers for client portals: whatever color a freelancer picks,
// text on it and text tinted with it stays readable, on a dark portal or a
// light one (Portal style, a branding setting).

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

/** How the owner's portals look to clients. Dark unless a Pro owner picked Light. */
export type PortalStyle = 'dark' | 'light'
export function resolvePortalStyle(ownerIsPro: boolean, saved: unknown): PortalStyle {
  return ownerIsPro && saved === 'light' ? 'light' : 'dark'
}

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const rgbToHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** For text, icons and dots in the brand color. On dark it's lifted toward
 *  paper; on light it's deepened just enough to read on white (4.5:1). */
export function brandInk(hex: string, style: PortalStyle = 'dark'): string {
  if (style === 'dark') return `color-mix(in oklab, ${hex} 55%, ${PAPER})`
  const [r, g, b] = hexToRgb(hex), ink = hexToRgb(INK)
  for (let k = 0; k <= 1; k += 0.05) {
    const c = rgbToHex([r + (ink[0] - r) * k, g + (ink[1] - g) * k, b + (ink[2] - b) * k])
    if (contrast(c, '#ffffff') >= 4.5) return c
  }
  return INK
}

/** A faint brand-tinted background (file badges, notices) */
export function brandSurface(hex: string, style: PortalStyle = 'dark'): string {
  return style === 'dark' ? `color-mix(in oklab, ${hex} 16%, ${INK})` : `color-mix(in oklab, ${hex} 9%, #ffffff)`
}

export function brandLine(hex: string): string {
  return `color-mix(in oklab, ${hex} 34%, transparent)`
}

/**
 * A logo address is only used if it's an upload in our own branding storage
 * (the only place Settings puts logos). The column can be written directly,
 * and the link-preview image fetches the logo on the server, so any other
 * address is ignored rather than fetched or shown to clients.
 */
export function safeLogoUrl(url: string | null | undefined): string | null {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/branding/`
  if (!url || !process.env.NEXT_PUBLIC_SUPABASE_URL || !url.startsWith(base)) return null
  const path = url.slice(base.length)
  return /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/.test(path) && !path.includes('..') ? url : null
}
