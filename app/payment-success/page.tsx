import { Suspense } from 'react'
import { headers } from 'next/headers'
import PaymentSuccessContent from './PaymentSuccessContent'
import { DOMAIN_HEADER } from '@/lib/domainHeader'

// Seen by the client who just paid, so it names no one in the tab
export const metadata = { title: 'Payment received' }

export default async function PaymentSuccessPage() {
  // On a customer's own domain this page carries no Voxabase branding
  const whiteLabel = !!(await headers()).get(DOMAIN_HEADER)
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-ink text-paper flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PaymentSuccessContent whiteLabel={whiteLabel} />
    </Suspense>
  )
}