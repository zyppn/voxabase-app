'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function StripeSetupPage() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'loading' | 'idle' | 'connected' | 'incomplete'>('loading')
  const supabase = createClient()

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', user.id)
        .single()

      if (success && profile?.stripe_account_id) {
        await supabase
          .from('profiles')
          .update({ stripe_onboarding_complete: true })
          .eq('id', user.id)
        setStatus('connected')
      } else if (profile?.stripe_onboarding_complete) {
        setStatus('connected')
      } else if (profile?.stripe_account_id) {
        setStatus('incomplete')
      } else {
        setStatus('idle')
      }
    }
    checkStatus()
  }, [success])

  const handleConnect = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-connect/create', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <nav className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between">
        <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        <a href="/dashboard" className="text-gray-400 text-sm hover:text-white transition-colors">
          Back to dashboard
        </a>
      </nav>

      <div className="max-w-lg mx-auto px-8 py-16">
        {status === 'connected' ? (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">Stripe connected</h1>
            <p className="text-gray-400 text-sm mb-8">
              Your clients can now pay invoices directly to your bank account. Payments arrive within 2 business days.
            </p>
            <div className="bg-[#111114] border border-green-400/20 rounded-xl p-5 mb-6 text-left">
              {[
                'Clients pay invoices on your portals',
                'Funds go directly to your bank account',
                'VoxaBase collects a small platform fee',
                'You never need to chase payments again',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-300">{item}</p>
                </div>
              ))}
            </div>
            <a
              href="/dashboard"
              className="w-full inline-flex items-center justify-center bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
            >
              Go to dashboard
            </a>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#1a0d30] border border-[#8b3cf7]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-3">Connect your Stripe account</h1>
            <p className="text-gray-400 text-sm mb-8">
              Connect Stripe so your clients can pay invoices directly to your bank. Takes about 5 minutes.
            </p>
            <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6 mb-6 text-left">
              {[
                'Client payments go directly to your bank',
                'Stripe handles all payment security',
                'Money arrives in 2 business days',
                'VoxaBase never touches your funds',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-[#8b3cf7]/10 border border-[#8b3cf7]/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-300">{item}</p>
                </div>
              ))}
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                status === 'incomplete' ? 'Continue Stripe setup' : 'Connect Stripe account'
              )}
            </button>
            <p className="text-xs text-gray-600">
              You will be redirected to Stripe to complete setup securely
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
