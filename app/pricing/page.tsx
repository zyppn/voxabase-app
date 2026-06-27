'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '../dashboard/AppShell'

function PricingContent() {
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState('free')
  const [authChecked, setAuthChecked] = useState(false)
  const [sidebar, setSidebar] = useState<{
    counts: { all: number; active: number; completed: number }
    usedBytes: number
    plan: string
    displayLabel: string
    email: string
    initials: string
    stripeConnected: boolean
  } | null>(null)
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAuthChecked(true); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan, full_name, business_name, stripe_onboarding_complete')
        .eq('id', user.id)
        .single()
      if (profile?.plan) setCurrentPlan(profile.plan)

      // Sidebar data
      const { data: allPortals } = await supabase
        .from('portals')
        .select('invoice_amount, invoice_paid')
        .eq('user_id', user.id)
      const all = allPortals || []
      const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: user.id })
      const label = profile?.business_name || profile?.full_name || 'Your'
      const init = (() => {
        const base = profile?.business_name || profile?.full_name
        if (base) return base.split(' ').filter(Boolean).slice(0, 2).map((s: string) => s[0]).join('').toUpperCase()
        return (user.email?.[0] || 'U').toUpperCase()
      })()
      setSidebar({
        counts: {
          all: all.length,
          active: all.filter(p => !p.invoice_paid || !p.invoice_amount).length,
          completed: all.filter(p => p.invoice_paid && p.invoice_amount).length,
        },
        usedBytes: storageData || 0,
        plan: profile?.plan || 'free',
        displayLabel: label,
        email: user.email || '',
        initials: init,
        stripeConnected: profile?.stripe_onboarding_complete === true,
      })
      setAuthChecked(true)
    }
    load()
  }, [])

  const handleUpgrade = async (priceId: string, plan: string) => {
    setLoading(plan)
    const res = await fetch('/api/subscription/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, plan }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setLoading(null)
  }

  const handleManageBilling = async () => {
    setLoading('billing')
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silent
    }
    setLoading(null)
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
    },
  ]

  const renderButton = (plan: typeof plans[0]) => {
    const isCurrent = currentPlan === plan.key

    if (isCurrent) {
      return (
        <div className="w-full text-center py-3 rounded-lg border border-[#16161a] text-gray-500 text-sm font-semibold">
          Current plan
        </div>
      )
    }

    if (plan.key === 'free') {
      return (
        <a href={sidebar ? '/dashboard' : '/signup'} className="w-full text-center py-3 rounded-lg border border-[#1c1c22] hover:border-[#2a2a33] text-gray-400 hover:text-white text-sm font-semibold block">
          {sidebar ? 'Go to dashboard' : 'Get started free'}
        </a>
      )
    }

    // Pro user trying to get Agency — use billing portal for proration
    if (plan.key === 'agency' && currentPlan === 'pro') {
      return (
        <button
          onClick={handleManageBilling}
          disabled={loading === 'billing'}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-[#16161a] hover:bg-[#1f1f26] text-white transition-colors disabled:opacity-50"
        >
          {loading === 'billing' ? 'Opening...' : 'Upgrade via billing portal'}
        </button>
      )
    }

    // Agency user — already on highest plan, show downgrade via portal
    if (currentPlan === 'agency' && plan.key === 'pro') {
      return (
        <button
          onClick={handleManageBilling}
          disabled={loading === 'billing'}
          className="w-full py-3 rounded-lg text-sm font-semibold border border-[#1c1c22] hover:border-[#2a2a33] text-gray-400 hover:text-white disabled:opacity-50"
        >
          {loading === 'billing' ? 'Opening...' : 'Manage via billing portal'}
        </button>
      )
    }

    // Free user upgrading
    return (
      <button
        onClick={() => plan.priceId && handleUpgrade(plan.priceId, plan.key)}
        disabled={loading === plan.key}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${plan.featured ? 'bg-[#8b3cf7] hover:bg-[#9d55f8] text-white shadow-lg shadow-purple-900/30' : 'bg-[#16161a] hover:bg-[#1f1f26] text-white'}`}
      >
        {loading === plan.key ? 'Redirecting...' : plan.key === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Agency'}
      </button>
    )
  }

  const pricingBody = (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-9">
      {sidebar && (
        <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-6 group w-fit">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </a>
      )}
      <div className="text-center mb-12">
        {upgraded && (
          <div className="inline-flex items-center gap-2 bg-green-400/10 border border-green-400/20 text-green-400 text-sm px-4 py-2 rounded-full mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Plan upgraded successfully!
          </div>
        )}
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Simple pricing, no surprises</h1>
        <p className="text-gray-400">Free to start. Upgrade when your client list grows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-2xl p-6 flex flex-col ${plan.featured ? 'bg-[#1a0d30] border-2 border-[#8b3cf7]' : 'bg-[#101013] border border-[#16161a]'}`}
          >
            {plan.featured && (
              <span className="text-xs font-bold bg-[#8b3cf7] text-white px-3 py-1 rounded-full self-start mb-4 uppercase tracking-wide">
                Most popular
              </span>
            )}
            {currentPlan === plan.key && (
              <span className="text-xs font-bold bg-green-400/10 text-green-400 border border-green-400/20 px-3 py-1 rounded-full self-start mb-4 uppercase tracking-wide">
                Current plan
              </span>
            )}
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">{plan.name}</h2>
            <div className="mb-1">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-gray-500 text-sm">{plan.period}</span>
            </div>
            <div className="h-px bg-[#16161a] my-5" />
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
            {renderButton(plan)}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-600 mt-8">
        Payments processed securely by Stripe. Upgrades are prorated. Cancel anytime.
      </p>
    </div>
  )

  // Until we know whether the user is logged in, show a neutral loader —
  // this prevents the logged-out layout flashing before the shell loads.
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  // Logged-in users get the full app shell; visitors see a clean standalone page.
  if (sidebar) {
    return (
      <AppShell
        counts={sidebar.counts}
        usedBytes={sidebar.usedBytes}
        plan={sidebar.plan}
        displayLabel={sidebar.displayLabel}
        email={sidebar.email}
        initials={sidebar.initials}
        stripeConnected={sidebar.stripeConnected}
        activeFilter={null}
        onFilterClick={(key) => router.push(`/dashboard?filter=${key}`)}
      >
        {pricingBody}
      </AppShell>
    )
  }

  return (
    <main className="min-h-screen bg-[#08080a] text-white">
      <nav className="border-b border-[#16161a] px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-[#08080a]/85 backdrop-blur-sm z-10">
        <a href="https://voxabase.com"><img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" /></a>
        <a href="/signup" className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white text-sm font-semibold px-4 py-2 rounded-lg">Get started</a>
      </nav>
      {pricingBody}
    </main>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PricingContent />
    </Suspense>
  )
}