'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PaymentSuccessContent({ whiteLabel }: { whiteLabel: boolean }) {
  const searchParams = useSearchParams()
  const username = searchParams.get('username')
  const slug = searchParams.get('slug')
  // The invoice is marked paid by Stripe's webhook, not by this page.

  return (
    <main className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-paper mb-3">Payment received</h1>
        <p className="text-muted mb-8">
          Your payment was successful. The freelancer has been notified and the invoice will show as paid in a moment.
        </p>
        {username && slug && (
          <Link
            href={`/${username}/${slug}`}
            className="inline-flex items-center gap-2 bg-paper hover:bg-white text-ink font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
          >
            Back to portal
          </Link>
        )}
        <p className="text-xs text-faint mt-6">Powered by Stripe{whiteLabel ? '' : ' · Voxabase'}</p>
      </div>
    </main>
  )
}
