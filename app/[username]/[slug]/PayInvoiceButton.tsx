'use client'
import { useState } from 'react'

interface PayInvoiceButtonProps {
  portalId: string
  portalName: string
  amount: number
  username: string
  slug: string
  brandColor?: string
}

export default function PayInvoiceButton({ portalId, portalName, amount, username, slug, brandColor = '#8b3cf7' }: PayInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 text-center">
          {error}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full text-white font-semibold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70"
        style={{
          background: brandColor,
          boxShadow: `0 6px 20px -8px ${brandColor}66`,
        }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Redirecting to payment...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Pay Invoice — ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </>
        )}
      </button>
    </div>
  )
}