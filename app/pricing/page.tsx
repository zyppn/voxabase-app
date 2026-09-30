'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '../dashboard/AppShell'

// Listed on the Agency plan but not built yet: shown with a "Soon" tag
const COMING_SOON = new Set(['Team member seats', 'White-label portal domain', 'Client approval workflows'])

function PricingContent() {
  const [loading, setLoading] = useState<string | null>(null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
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
      features: [
        '3 active client portals',
        '1 GB file storage',
        'Shareable portal links',
        'File activity tracking',
        'Stripe payment collection',
      ],
      monthly: { price: '$0', suffix: '', note: 'Free forever', priceId: null as string | null | undefined },
      annual:  { price: '$0', suffix: '', note: 'Free forever', priceId: null as string | null | undefined },
    },
    {
      key: 'pro',
      name: 'Pro',
      featured: true,
      features: [
        'Unlimited client portals',
        '25 GB file storage',
        'Stripe payment collection',
        'Password-protected portals',
        'Custom branding & colors',
        'Priority support',
      ],
      monthly: { price: '$15', suffix: '/mo', note: 'Billed monthly', priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID },
      annual:  { price: '$12', suffix: '/mo', note: 'Billed annually · $144/yr', priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID },
    },
    {
      key: 'agency',
      name: 'Agency',
      features: [
        'Everything in Pro',
        '250 GB file storage',
        'Team member seats',
        'White-label portal domain',
        'Client approval workflows',
        'Dedicated support',
      ],
      monthly: { price: '$49', suffix: '/mo', note: 'Billed monthly', priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID },
      annual:  { price: '$39', suffix: '/mo', note: 'Billed annually · $468/yr', priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_ANNUAL_PRICE_ID },
    },
  ]

  const renderButton = (plan: typeof plans[number]) => {
    const isCurrent = currentPlan === plan.key
    const pid = plan[billing].priceId

    if (isCurrent) {
      return (
        <div className="w-full text-center py-3 rounded-lg border border-rule text-faint text-sm font-semibold">
          Current plan
        </div>
      )
    }

    if (plan.key === 'free') {
      return (
        <a href={sidebar ? '/dashboard' : '/signup'} className="w-full text-center py-3 rounded-lg border border-rule-2 hover:border-rule-3 text-muted hover:text-paper text-sm font-semibold block">
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
          className="w-full py-3 rounded-lg text-sm font-semibold bg-ink-3 hover:bg-ink-4 text-paper transition-colors disabled:opacity-50"
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
          className="w-full py-3 rounded-lg text-sm font-semibold border border-rule-2 hover:border-rule-3 text-muted hover:text-paper disabled:opacity-50"
        >
          {loading === 'billing' ? 'Opening...' : 'Manage via billing portal'}
        </button>
      )
    }

    // Free user upgrading
    return (
      <button
        onClick={() => pid && handleUpgrade(pid, plan.key)}
        disabled={loading === plan.key || !pid}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${plan.featured ? 'bg-paper hover:bg-white text-ink shadow-lg shadow-black/30' : 'bg-ink-3 hover:bg-ink-4 text-paper'}`}
      >
        {loading === plan.key ? 'Redirecting...' : !pid ? 'Unavailable' : plan.key === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Agency'}
      </button>
    )
  }

  const pricingBody = (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-9">
      {sidebar && (
        <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-faint hover:text-paper mb-6 group w-fit">
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
        <p className="text-muted">Free to start. Upgrade when your client list grows.</p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center bg-ink-2 border border-rule rounded-full p-1">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${billing === 'monthly' ? 'bg-paper text-ink' : 'text-muted hover:text-paper'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${billing === 'annual' ? 'bg-paper text-ink' : 'text-muted hover:text-paper'}`}
          >
            Annual
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${billing === 'annual' ? 'bg-accent/15 text-accent-deep' : 'bg-accent/15 text-accent-text'}`}>
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`rounded-xl p-6 flex flex-col ${plan.featured ? 'bg-ink-2 border border-rule-2 shadow-[inset_0_2px_0_var(--color-accent-mark)]' : 'bg-ink-2 border border-rule'}`}
          >
            {plan.featured && (
              <span className="text-[13px] font-semibold text-accent-text self-start mb-4">
                Most popular
              </span>
            )}
            {currentPlan === plan.key && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-paper border border-rule-2 px-2.5 py-1 rounded-full self-start mb-4"><span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Current plan
              </span>
            )}
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">{plan.name}</h2>
            <div className="mb-0.5">
              <span className="text-4xl font-bold text-paper">{plan[billing].price}</span>
              <span className="text-faint text-sm">{plan[billing].suffix}</span>
            </div>
            <p className="text-xs text-faint h-4">{plan[billing].note}</p>
            <div className="h-px bg-ink-3 my-5" />
            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm text-paper/85">
                  <div className="w-4 h-4 rounded-full bg-ink-3 border border-rule-2 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className={COMING_SOON.has(feature) ? 'text-muted' : undefined}>{feature}</span>
                  {COMING_SOON.has(feature) && (
                    <span className="text-[10px] font-semibold text-faint border border-rule-2 rounded-full px-1.5 py-px leading-none">Soon</span>
                  )}
                </li>
              ))}
            </ul>
            {renderButton(plan)}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-faint mt-8">
        Payments processed securely by Stripe. Upgrades are prorated. Cancel anytime.
      </p>
    </div>
  )

  // Until we know whether the user is logged in, show a neutral loader —
  // this prevents the logged-out layout flashing before the shell loads.
  if (!authChecked) {
    return (
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
    <main className="min-h-screen bg-ink text-paper">
      <nav className="border-b border-rule px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 bg-ink/85 backdrop-blur-sm z-10">
        <a href="https://voxabase.com"><img src="/vblogo.png" alt="Voxabase" className="h-7 w-auto" /></a>
        <a href="/signup" className="bg-paper hover:bg-white text-ink text-sm font-semibold px-4 py-2 rounded-lg">Get started</a>
      </nav>
      {pricingBody}
    </main>
  )
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <PricingContent />
    </Suspense>
  )
}