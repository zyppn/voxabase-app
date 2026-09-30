import { createClient } from '@/utils/supabase/server'
import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import PortalTracker from './PortalTracker'
import PortalPasswordGate from './PortalPasswordGate'
import PortalView from './PortalView'
import { DEFAULT_BRAND, normalizeBrand } from '@/lib/brand'
import { DOMAIN_HEADER } from '@/lib/domainHeader'

export const revalidate = 0

export default async function PortalPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: portal } = await supabase
    .from('portals')
    .select('*')
    .eq('slug', slug)
    .eq('owner_username', username)
    .eq('is_active', true)
    .single()

  if (!portal) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, full_name, brand_color, logo_url, brand_display, plan')
    .eq('username', username)
    .single()

  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('portal_id', portal.id)
    .order('sort_order', { ascending: true })

  const displayName = profile?.business_name || profile?.full_name || username
  const ownerPlan = profile?.plan || 'free'
  const ownerIsPro = ownerPlan === 'pro' || ownerPlan === 'agency'
  // Branding is a Pro feature. Free owners' saved color/logo stay in the DB
  // but are NOT applied — portals fall back to the default purple + no logo.
  const brandColor = ownerIsPro ? normalizeBrand(profile?.brand_color) : DEFAULT_BRAND
  const logoUrl = ownerIsPro ? (profile?.logo_url || null) : null
  const brandDisplay = profile?.brand_display || 'both'
  const brandInitial = (displayName || 'V').charAt(0).toUpperCase()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isReady = portal.files_ready
  const isPasswordProtected = !!portal.portal_password
  // On an Agency customer's own domain the portal carries no Voxabase branding
  const whiteLabel = !!(await headers()).get(DOMAIN_HEADER) && ownerPlan === 'agency'
  // Client approvals are an Agency feature; turning the plan off hides them.
  const approval = {
    approvalRequired: !!portal.approval_required && ownerPlan === 'agency',
    approvalStatus: (portal.approval_status ?? null) as 'approved' | 'changes_requested' | null,
    approvalNote: portal.approval_note ?? null,
    approvalName: portal.approval_name ?? null,
    approvalAt: portal.approval_at ?? null,
  }

  return (
    <main className="min-h-screen bg-ink text-paper">
      <PortalTracker portalId={portal.id} ownerUsername={username} />

      {isPasswordProtected ? (
        <PortalPasswordGate
          portalId={portal.id}
          portalPassword={portal.portal_password}
          displayName={displayName}
          portalName={portal.name}
          portalDescription={portal.description}
          files={files || []}
          supabaseUrl={supabaseUrl}
          isReady={isReady}
          invoiceAmount={portal.invoice_amount}
          invoicePaid={portal.invoice_paid}
          username={username}
          slug={slug}
          brandColor={brandColor}
          logoUrl={logoUrl}
          brandDisplay={brandDisplay}
          brandInitial={brandInitial}
          ownerIsPro={ownerIsPro}
          {...approval}
          whiteLabel={whiteLabel}
        />
      ) : (
        <PortalView
          portalId={portal.id}
          portalName={portal.name}
          portalDescription={portal.description}
          displayName={displayName}
          brandColor={brandColor}
          logoUrl={logoUrl}
          brandDisplay={brandDisplay}
          brandInitial={brandInitial}
          ownerIsPro={ownerIsPro}
          isReady={isReady}
          files={files || []}
          supabaseUrl={supabaseUrl}
          invoiceAmount={portal.invoice_amount}
          invoicePaid={portal.invoice_paid}
          username={username}
          slug={slug}
          {...approval}
          whiteLabel={whiteLabel}
        />
      )}
    </main>
  )
}