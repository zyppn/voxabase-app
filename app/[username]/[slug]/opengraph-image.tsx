// The picture shown when a portal link is pasted into Slack, Discord,
// iMessage, LinkedIn, Teams or email: the business's name (and logo on Pro),
// the delivery's name, and where it stands ("3 files · $1,500.00 due").
// A password-protected portal shows only who it's from; an unpublished one
// says the files are being prepared. Never a file name, never a file.
import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadPortal } from './loadPortal'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DEFAULT_BRAND, normalizeBrand, textOnBrand } from '@/lib/brand'
import { formatMoney } from '@/lib/invoice'

export const alt = 'Client delivery'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const INK = '#0c0b10'
const PAPER = '#eeeae3'
const MUTED = '#a39eaf'
const FAINT = '#8a8595'

// Mona Sans, the app's typeface (SIL Open Font License, see assets/fonts)
// (fixed paths, so the deployment bundles the files)
const FONT_FILES = {
  400: () => readFile(join(process.cwd(), 'assets/fonts/mona-sans-latin-400-normal.woff')),
  600: () => readFile(join(process.cwd(), 'assets/fonts/mona-sans-latin-600-normal.woff')),
  700: () => readFile(join(process.cwd(), 'assets/fonts/mona-sans-latin-700-normal.woff')),
} as const
const font = (weight: keyof typeof FONT_FILES) => FONT_FILES[weight]()

// A logo's pixel size, read from the file (PNG, GIF or JPEG), so it can be
// drawn at the right width next to the name
function imageSize(b: Buffer): { w: number; h: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
  if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue }
      const marker = b[i + 1]
      const len = b.readUInt16BE(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }
      i += 2 + len
    }
  }
  return null
}

// The owner's logo, if it's a format the image renderer reads
async function loadLogo(url: string | null): Promise<{ src: string; w: number; h: number } | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const type = (res.headers.get('content-type') || '').split(';')[0]
    if (!res.ok || !/^image\/(png|jpe?g|gif)$/.test(type)) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    const dim = bytes.length <= 1_500_000 ? imageSize(bytes) : null
    if (!dim || !dim.w || !dim.h) return null
    // At most 76px tall and 320px wide, keeping its shape
    const scale = Math.min(76 / dim.h, 320 / dim.w)
    return { src: `data:${type};base64,${bytes.toString('base64')}`, w: Math.round(dim.w * scale), h: Math.round(dim.h * scale) }
  } catch {
    return null
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export default async function Image({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params
  // Reading the request keeps the picture current (paid, unlocked) instead
  // of fixed at build time
  await headers()
  const hit = await loadPortal(username, slug)

  const plan = hit?.profile?.plan || 'free'
  const pro = plan === 'pro' || plan === 'agency'
  const brand = pro ? normalizeBrand(hit?.profile?.brand_color) : DEFAULT_BRAND
  const name = hit?.displayName || 'Client delivery'
  const showLogo = pro && (hit?.profile?.brand_display || 'both') !== 'name'
  const logo = showLogo ? await loadLogo(hit?.profile?.logo_url || null) : null
  // Agency portals can run on the customer's own domain without Voxabase
  // branding, so their picture never mentions Voxabase either
  const showVia = plan !== 'agency'

  let title = 'Client delivery'
  let status = ''
  if (hit) {
    const p = hit.portal
    if (p.password_protected) {
      title = 'Private delivery'
      status = 'Password protected · Open the link to view'
    } else if (!p.files_ready) {
      title = clip(p.name, 70)
      status = 'Files are being prepared'
    } else {
      title = clip(p.name, 70)
      const { count } = await supabaseAdmin().from('files').select('id', { count: 'exact', head: true }).eq('portal_id', p.id)
      const files = `${count ?? 0} file${count === 1 ? '' : 's'}`
      const amount = p.invoice_amount ? formatMoney(Number(p.invoice_amount)) : null
      status = p.invoice_paid
        ? `${files} · Paid · Ready to download`
        : amount && p.lock_until_paid
        ? `${files} · ${amount} due · Unlocks after payment`
        : amount
        ? `${files} · Invoice ${amount}`
        : `${files} · Ready to download`
    }
  }

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: INK, padding: '72px 80px', position: 'relative', fontFamily: 'Mona Sans' }}>
        {/* A soft wash of the brand color in the corner */}
        <div style={{ position: 'absolute', top: -260, left: -200, width: 760, height: 760, borderRadius: 760, background: brand, opacity: 0.16, filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: brand }} />

        {/* Who it's from */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {logo ? (
            <img src={logo.src} alt="" width={logo.w} height={logo.h} style={{ width: logo.w, height: logo.h }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 18, background: brand, color: textOnBrand(brand), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700 }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          {!(logo && hit?.profile?.brand_display === 'logo') && (
            <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: PAPER, letterSpacing: -0.5 }}>{clip(name, 34)}</div>
          )}
        </div>

        {/* What it is and where it stands */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 600, color: FAINT, letterSpacing: 3, textTransform: 'uppercase' }}>
            {hit?.portal.password_protected ? 'From' : 'Delivered by'} {clip(name, 40)}
          </div>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, color: PAPER, lineHeight: 1.08, letterSpacing: -1.5 }}>{title}</div>
          {status && <div style={{ display: 'flex', fontSize: 32, color: MUTED }}>{status}</div>}
        </div>

        <div style={{ display: 'flex', fontSize: 22, color: FAINT }}>{showVia ? 'Delivered via Voxabase' : ' '}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Mona Sans', data: await font(400), weight: 400, style: 'normal' },
        { name: 'Mona Sans', data: await font(600), weight: 600, style: 'normal' },
        { name: 'Mona Sans', data: await font(700), weight: 700, style: 'normal' },
      ],
    },
  )
}
