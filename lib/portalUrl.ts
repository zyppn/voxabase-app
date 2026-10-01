import { APP_HOST } from '@/lib/appHost'

// A portal's shareable address: the owner's live custom domain (Agency) if
// there is one, else this app's own.
export function portalUrl(p: { slug: string; owner_username: string | null }, liveDomain: string | null) {
  if (liveDomain) return `https://${liveDomain}/${p.slug}`
  const origin = typeof window !== 'undefined' ? window.location.origin : `https://${APP_HOST}`
  return `${origin}/${p.owner_username}/${p.slug}`
}
