// app.voxabase.com/<username> (or the root of a customer's own domain).
// Portals are private links, so this never lists them: it just shows whose
// portals live here and how to get one.
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { DOMAIN_HEADER } from '@/lib/domainHeader'
import { DEFAULT_BRAND, normalizeBrand } from '@/lib/brand'
import { PortalBrand, DeliveredVia } from './[slug]/PortalView'

export const revalidate = 0

export default async function OwnerPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const { data: profile } = await supabaseAdmin()
    .from('profiles')
    .select('business_name, full_name, brand_color, logo_url, brand_display, plan')
    .eq('username', username)
    .maybeSingle()
  if (!profile) notFound()

  const displayName = profile.business_name || profile.full_name || username
  const ownerIsPro = profile.plan === 'pro' || profile.plan === 'agency'
  const whiteLabel = !!(await headers()).get(DOMAIN_HEADER) && profile.plan === 'agency'

  return (
    <main className="min-h-screen bg-ink text-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mb-7">
          <PortalBrand ownerIsPro={ownerIsPro} brandDisplay={profile.brand_display || 'both'}
            logoUrl={ownerIsPro ? profile.logo_url || null : null} displayName={displayName}
            brandInitial={displayName.charAt(0).toUpperCase()}
            brandColor={ownerIsPro ? normalizeBrand(profile.brand_color) : DEFAULT_BRAND} centered />
        </div>
        <div className="rounded-[14px] border border-rule bg-ink-2 p-6">
          <h1 className="text-lg font-bold text-paper mb-1.5">Client portals by {displayName}</h1>
          <p className="text-sm text-muted">Each portal has its own private link. If you’re a client, use the link {displayName} sent you.</p>
        </div>
        {!whiteLabel && <DeliveredVia />}
      </div>
    </main>
  )
}
