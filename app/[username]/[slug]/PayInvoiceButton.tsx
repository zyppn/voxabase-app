'use client'
import { useState } from 'react'
import { DEFAULT_BRAND, textOnBrand } from '@/lib/brand'

interface PayInvoiceButtonProps {
  portalId: string
  portalName: string
  amount: number
  username: string
  slug: string
  brandColor?: string
}

export default function PayInvoiceButton({ portalId, portalName, amount, username, slug, brandColor = DEFAULT_BRAND }: PayInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onBrand = textOnBrand(brandColor)

  const handlePay = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId, portalName, amount, username, slug }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'We could not start the payment. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('We could not reach the payment page. Check your connection and try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-center text-xs text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        aria-busy={loading}
        className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[10px] text-[15px] font-semibold transition hover:brightness-110 disabled:cursor-progress disabled:opacity-80"
        style={{ background: brandColor, color: onBrand }}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" aria-hidden="true" />
            Redirecting to payment...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Pay Invoice — ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </>
        )}
      </button>
    </div>
  )
}
