import { Suspense } from 'react'
import { headers } from 'next/headers'
import PaymentSuccessContent from './PaymentSuccessContent'
import { DOMAIN_HEADER } from '@/lib/domainHeader'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resolvePortalStyle } from '@/lib/brand'

// Seen by the client who just paid, so it names no one in the tab
export const metadata = { title: 'Payment received' }

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  // On a customer's own domain this page carries no Voxabase branding
  const whiteLabel = !!(await headers()).get(DOMAIN_HEADER)
  // Matches the portal the client paid from: the owner's Portal style
  const username = (await searchParams).username
  const { data: owner } = typeof username === 'string'
    ? await supabaseAdmin().from('profiles').select('*').eq('username', username).maybeSingle()
    : { data: null }
  const portalStyle = resolvePortalStyle(owner?.plan === 'pro' || owner?.plan === 'agency', owner?.portal_style)
  return (
    <div data-scheme={portalStyle} className="contents">
    <Suspense fallback={
      <main className="min-h-screen bg-ink text-paper flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PaymentSuccessContent whiteLabel={whiteLabel} />
    </Suspense>
    </div>
  )
}