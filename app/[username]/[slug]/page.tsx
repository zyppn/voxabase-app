import { cache } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import PortalTracker from './PortalTracker'
import PortalPasswordGate from './PortalPasswordGate'
import PortalView from './PortalView'
import { DEFAULT_BRAND, normalizeBrand } from '@/lib/brand'
import { DOMAIN_HEADER } from '@/lib/domainHeader'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canOpenPortal, isOwnerOrTeam, viewerId } from '@/lib/portalAccess'
import BackToPortal from './BackToPortal'
import { awaitingPayment } from '@/lib/paywall'

export const revalidate = 0

type Params = { params: Promise<{ username: string; slug: string }> }

// Portals aren't publicly readable in the database; this server page reads
// them and only sends the browser what the visitor is allowed to see.
// Cached so the page and its metadata share one lookup per request.
const loadPortal = cache(async (username: string, slug: string) => {
  const admin = supabaseAdmin()
  // select('*') so a column that hasn't been added yet can't break every portal
  const { data: portal, error } = await admin
    .from('portals')
    .select('*')
    .eq('slug', slug)
    .eq('owner_username', username)
    .eq('is_active', true)
    .maybeSingle()
  if (error) console.error('[portal page] lookup failed', error.message)
  if (!portal) return null

  const { data: profile } = await admin
    .from('profiles')
    .select('business_name, full_name, brand_color, logo_url, brand_display, plan')
    .eq('username', username)
    .single()
  return { portal, profile, displayName: (profile?.business_name || profile?.full_name || username) as string }
})

// The browser tab and link previews (iMessage, Slack, email) name the portal
// and its owner, never Voxabase: this is the owner's page, seen by their client.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, slug } = await params
  const hit = await loadPortal(username, slug)
  if (!hit) return {}
  const title = `${hit.portal.name} · ${hit.displayName}`
  // A locked portal's description stays behind its password
  const description = (!hit.portal.password_protected && hit.portal.description) || `Files from ${hit.displayName}`
  return { title, description, openGraph: { title, description, siteName: hit.displayName } }
}

export default async function PortalPage({ params }: Params) {
  const { username, slug } = await params
  const admin = supabaseAdmin()
  const hit = await loadPortal(username, slug)
  if (!hit) notFound()
  const { portal, profile, displayName } = hit
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
  // The owner or a teammate looking at their own portal (never on customer
  // domains, which have no session): a note says this is the client's view
  const viewer = await viewerId()
  const team = await isOwnerOrTeam(admin, viewer, portal.user_id)

  if (!(await canOpenPortal(admin, portal, viewer))) {
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
      {team && <ClientViewNote portalId={portal.id} locked={awaitingPayment(portal)} />}
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
        // Files unlock after payment: the list shows, the files don't
        locked={awaitingPayment(portal)}
        // Client approvals are an Agency feature; turning the plan off hides
        // them. A locked portal asks for approval once it's paid and unlocked.
        approvalRequired={!!portal.approval_required && ownerPlan === 'agency' && !awaitingPayment(portal)}
        approvalStatus={(portal.approval_status ?? null) as 'approved' | 'changes_requested' | null}
        approvalNote={portal.approval_note ?? null}
        approvalName={portal.approval_name ?? null}
        approvalAt={portal.approval_at ?? null}
      />
    </main>
  )
}

// Shown only to the owner and their team: this page is exactly what the client sees
function ClientViewNote({ portalId, locked }: { portalId: string; locked: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 pt-6 sm:px-6 sm:pt-10 -mb-2 sm:-mb-6">
      <div className="flex items-start gap-2 rounded-[10px] border border-dashed border-rule-2 px-3.5 py-2.5 text-xs leading-relaxed text-muted">
        <svg className="mt-0.5 h-3.5 w-3.5 flex-none text-faint" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p>
          You’re previewing what your client sees.
          {locked && ' Files stay locked for them until the invoice is paid; you and your team can open them from the portal page.'}
          {' '}<BackToPortal href={`/dashboard/portal/${portalId}`} className="font-medium text-paper hover:underline underline-offset-2 whitespace-nowrap">Back to portal →</BackToPortal>
        </p>
      </div>
    </div>
  )
}
