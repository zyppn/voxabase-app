'use client'
import { useState } from 'react'

interface PayInvoiceButtonProps {
  portalId: string
  portalName: string
  amount: number
  username: string
  slug: string
}

export default function PayInvoiceButton({ portalId, portalName, amount, username, slug }: PayInvoiceButtonProps) {
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    setLoading(true)
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
        console.error('No checkout URL returned')
        setLoading(false)
      }
    } catch (error) {
      console.error('Payment error:', error)
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
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
  )
}
