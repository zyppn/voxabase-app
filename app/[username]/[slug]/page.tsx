import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import PortalTracker from './PortalTracker'
import PortalPasswordGate from './PortalPasswordGate'
import PortalView from './PortalView'
import { DEFAULT_BRAND, normalizeBrand } from '@/lib/brand'
import { DOMAIN_HEADER } from '@/lib/domainHeader'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal } from '@/lib/portalAccess'

export const revalidate = 0

const PORTAL_FIELDS = 'id, user_id, name, slug, description, owner_username, is_active, files_ready, invoice_amount, invoice_paid, password_protected, approval_required, approval_status, approval_note, approval_name, approval_at'

export default async function PortalPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params
  // Portals aren't publicly readable in the database; this server page reads
  // them and only sends the browser what the visitor is allowed to see.
  const admin = supabaseAdmin()

  const { data: portal } = await admin
    .from('portals')
    .select(PORTAL_FIELDS)
    .eq('slug', slug)
    .eq('owner_username', username)
    .eq('is_active', true)
    .maybeSingle()

  if (!portal) notFound()

  const { data: profile } = await admin
    .from('profiles')
    .select('business_name, full_name, brand_color, logo_url, brand_display, plan')
    .eq('username', username)
    .single()

  const displayName = profile?.business_name || profile?.full_name || username
  const ownerPlan = profile?.plan || 'free'
  const ownerIsPro = ownerPlan === 'pro' || ownerPlan === 'agency'
  // Branding is a Pro feature. Free owners' saved color/logo stay in the DB
  // but are NOT applied — portals fall back to the default purple + no logo.
  const brandColor = ownerIsPro ? normalizeBrand(profile?.brand_color) : DEFAULT_BRAND
  const logoUrl = ownerIsPro ? (profile?.logo_url || null) : null
  const brandDisplay = profile?.brand_display || 'both'
  const brandInitial = (displayName || 'V').charAt(0).toUpperCase()
  // On an Agency customer's own domain the portal carries no Voxabase branding
  const whiteLabel = !!(await headers()).get(DOMAIN_HEADER) && ownerPlan === 'agency'
  const brand = { displayName, brandColor, logoUrl, brandDisplay, brandInitial, ownerIsPro, whiteLabel }

  // Password-protected and not unlocked yet: send only the name and branding
  if (!(await canOpenPortal(admin, portal))) {
    return (
      <main className="min-h-screen bg-ink text-paper">
        <PortalPasswordGate portalId={portal.id} portalName={portal.name} {...brand} />
      </main>
    )
  }

  const { data: files } = await admin
    .from('files')
    .select('id, name, file_size, file_type')
    .eq('portal_id', portal.id)
    .order('sort_order', { ascending: true })

  return (
    <main className="min-h-screen bg-ink text-paper">
      <PortalTracker portalId={portal.id} ownerUsername={username} />
      <PortalView
        portalId={portal.id}
        portalName={portal.name}
        portalDescription={portal.description}
        {...brand}
        isReady={portal.files_ready}
        files={portal.files_ready ? files || [] : []}
        invoiceAmount={portal.invoice_amount}
        invoicePaid={portal.invoice_paid}
        username={username}
        slug={slug}
        // Client approvals are an Agency feature; turning the plan off hides them.
        approvalRequired={!!portal.approval_required && ownerPlan === 'agency'}
        approvalStatus={(portal.approval_status ?? null) as 'approved' | 'changes_requested' | null}
        approvalNote={portal.approval_note ?? null}
        approvalName={portal.approval_name ?? null}
        approvalAt={portal.approval_at ?? null}
      />
    </main>
  )
}
