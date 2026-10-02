'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useCrumbs, useWorkspace } from '../WorkspaceProvider'
import { PageSkeleton } from '../dashboard/AppSkeleton'
import Link from 'next/link'

export default function StripeSetupContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'loading' | 'idle' | 'connected' | 'incomplete'>('loading')
  const [verifying, setVerifying] = useState(false)
  const supabase = createClient()
  const { ws, refresh } = useWorkspace()
  useCrumbs(['Stripe payments'])

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id, stripe_onboarding_complete, full_name, business_name, plan')
        .eq('id', user.id)
        .single()

      // Ask Stripe for the real status: coming back from onboarding doesn't mean it's finished
      let connected = false
      if (profile?.stripe_account_id) {
        const res = await fetch('/api/stripe-connect/status', { cache: 'no-store' })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.status === 'connected') {
          setStatus('connected'); connected = true
        } else {
          setStatus('incomplete'); setVerifying(!!data?.verifying)
        }
      } else {
        setStatus('idle')
      }

      // The sidebar's "Connect Stripe" / "Stripe account" follows the real status
      if (connected !== (ws.me?.stripe_onboarding_complete === true)) refresh()
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

  const handleManage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-connect/login-link', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.open(data.url, '_blank')
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (status === 'loading') {
    return (
      <PageSkeleton variant="centered" />
    )
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        <div className="max-w-lg mx-auto">
          {/* Back button — clean arrow */}

          {status === 'connected' ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-3 tracking-tight">Stripe connected</h1>
              <p className="text-muted text-sm mb-8">
                Your clients can now pay invoices directly to your bank account. Payments arrive within 2 business days.
              </p>
              <div className="border border-green-400/20 rounded-xl p-5 mb-6 text-left">
                {[
                  'Clients pay invoices on your portals',
                  'Funds go directly to your bank account',
                  ws.me?.plan === 'pro' || ws.me?.plan === 'agency' ? 'No Voxabase fee on your plan, only Stripe’s' : 'Voxabase keeps 2% (0% on Pro and Agency)',
                  'You never need to chase payments again',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 py-2">
                    <div className="w-5 h-5 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-paper/85">{item}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center bg-paper hover:bg-paper-hover text-ink font-semibold px-6 py-3 rounded-lg text-sm"
                >
                  Go to dashboard
                </Link>
                <button
                  onClick={handleManage}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 border border-rule-2 hover:border-rule-3 text-muted hover:text-paper font-semibold px-6 py-3 rounded-lg text-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  {loading ? 'Opening...' : 'Manage Stripe account'}
                </button>
                <p className="text-xs text-faint text-center">Update your bank account, view payouts, and manage your Stripe settings</p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-ink-3 border border-rule-2 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-3 tracking-tight">{status === 'incomplete' ? 'Finish your Stripe setup' : 'Connect your Stripe account'}</h1>
              <p className="text-muted text-sm mb-8">
                {status === 'incomplete'
                  ? verifying
                    ? 'Stripe is still verifying your details. Clients can pay invoices as soon as it’s done. Check back soon, or open Stripe to see if anything else is needed.'
                    : 'Stripe still needs a few details before clients can pay your invoices. Pick up where you left off.'
                  : 'Connect Stripe so your clients can pay invoices directly to your bank. Takes about 5 minutes.'}
              </p>
              <div className="border border-rule rounded-xl p-6 mb-6 text-left">
                {[
                  'Client payments go directly to your bank',
                  'Stripe handles all payment security',
                  'Money arrives in 2 business days',
                  'Voxabase never touches your funds',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 py-2">
                    <div className="w-5 h-5 rounded-full bg-ink-3 border border-rule-2 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-paper/85">{item}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
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
              <p className="text-xs text-faint">
                You will be redirected to Stripe to complete setup securely
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}