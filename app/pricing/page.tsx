'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PricingContent() {
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState('free')
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      if (profile?.plan) setCurrentPlan(profile.plan)
    }
    load()
  }, [])

  const handleUpgrade = async (priceId: string, plan: string) => {
    console.log('Upgrading:', plan, 'priceId:', priceId)
    setLoading(plan)
    const res = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, plan }),
    })
    const data = await res.json()
    console.log('Response:', data)
    if (data.url) window.location.href = data.url
    else {
      console.error('No URL returned:', data)
      setLoading(null)
    }
  }

  const plans = [
    {
      key: 'free',
      name: 'Starter',
      price: '$0',
      period: 'Free forever',
      features: [
        '3 active client portals',
        '1 GB file storage',
        'Shareable portal links',
        'File activity tracking',
        'Stripe payment collection',
      ],
      priceId: null,
      cta: 'Current plan',
    },
    {
      key: 'pro',
      name: 'Pro',
      price: '$15',
      period: '/mo · Billed monthly',
      features: [
        'Unlimited client portals',
        '25 GB file storage',
        'Stripe payment collection',
        'Password-protected portals',
        'Custom branding & colors',
        'Priority support',
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
      cta: 'Upgrade to Pro',
      featured: true,
    },
    {
      key: 'agency',
      name: 'Agency',
      price: '$49',
      period: '/mo · Billed monthly',
      features: [
        'Everything in Pro',
        '250 GB file storage',
        'Team member seats',
        'White-label portal domain',
        'Client approval workflows',
        'Dedicated support',
      ],
      priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID,
      cta: 'Upgrade to Agency',
    },
  ]

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <nav className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between sticky top-0 bg-[#090909]/80 backdrop-blur-sm z-10">
        <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        <a href="/dashboard" className="text-gray-400 text-sm hover:text-white transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="text-center mb-12">
          {upgraded && (
            <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 text-green-400 text-sm px-4 py-2 rounded-full mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Plan upgraded successfully!
            </div>
          )}
          <h1 className="text-3xl font-bold mb-3">Simple pricing, no surprises</h1>
          <p className="text-gray-400">Free to start. Upgrade when your client list grows.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key
            const isUpgrade = plan.key !== 'free' && !isCurrent

            return (
              <div
                key={plan.key}
                className={`rounded-xl p-6 flex flex-col ${plan.featured ? 'bg-[#1a0d30] border-2 border-[#8b3cf7]' : 'bg-[#111114] border border-[#1e1e24]'}`}
              >
                {plan.featured && (
                  <span className="text-xs font-bold bg-[#8b3cf7] text-white px-3 py-1 rounded-full self-start mb-4 uppercase tracking-wide">
                    Most popular
                  </span>
                )}
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">{plan.name}</h2>
                <div className="mb-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <div className="h-px bg-[#1e1e24] my-5" />
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="w-4 h-4 rounded-full bg-[#8b3cf7]/15 border border-[#8b3cf7]/35 flex items-center justify-center flex-shrink-0">
                        <svg className="w-2.5 h-2.5 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full text-center py-3 rounded-lg border border-[#1e1e24] text-gray-500 text-sm font-semibold">
                    Current plan
                  </div>
                ) : plan.key === 'free' ? (
                  <a href="/dashboard" className="w-full text-center py-3 rounded-lg border border-[#1e1e24] text-gray-400 hover:text-white text-sm font-semibold transition-colors block">
                    Go to dashboard
                  </a>
                ) : (
                  <button
                    onClick={() => plan.priceId && handleUpgrade(plan.priceId, plan.key)}
                    disabled={loading === plan.key}
                    className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${plan.featured ? 'bg-[#8b3cf7] hover:bg-[#9d55f8] text-white shadow-lg shadow-purple-900/30' : 'bg-[#1e1e24] hover:bg-[#2a2a34] text-white'}`}
                  >
                    {loading === plan.key ? 'Redirecting...' : plan.cta}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Payments are processed securely by Stripe. Cancel anytime.
        </p>
      </div>
    </main>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PricingContent />
    </Suspense>
  )
}
