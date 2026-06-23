'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SettingsContent() {
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [plan, setPlan] = useState('free')
  const [username, setUsername] = useState('')
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [managingBilling, setManagingBilling] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')
      setNewEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, business_name, username, plan, subscription_period_end')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setBusinessName(profile.business_name || '')
        setUsername(profile.username || '')
        setPlan(profile.plan || 'free')
        setSubscriptionPeriodEnd(profile.subscription_period_end || null)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (upgraded) {
      setSuccessMessage('Your plan has been upgraded successfully!')
      setTimeout(() => setSuccessMessage(''), 5000)
    }
  }, [upgraded])

  const handleSaveProfile = async () => {
    setSaving(true)
    setSuccessMessage('')
    setErrorMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, business_name: businessName || null })
      .eq('id', user.id)

    if (error) {
      setErrorMessage(error.message)
    } else {
      setSuccessMessage('Profile updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    }
    setSaving(false)
  }

  const handleChangeEmail = async () => {
    if (newEmail === email) return
    setChangingEmail(true)
    setSuccessMessage('')
    setErrorMessage('')

    const { error } = await supabase.auth.updateUser({ email: newEmail })

    if (error) {
      setErrorMessage(error.message)
    } else {
      setSuccessMessage('Confirmation email sent to your new address. Click the link to confirm.')
      setTimeout(() => setSuccessMessage(''), 6000)
    }
    setChangingEmail(false)
  }

  const handleManageBilling = async () => {
    setManagingBilling(true)
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setErrorMessage(data.error || 'Could not open billing portal')
    } catch {
      setErrorMessage('Something went wrong')
    }
    setManagingBilling(false)
  }

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'agency' ? 'Agency' : 'Free'
  const planColor = plan === 'free' ? 'text-gray-400' : plan === 'agency' ? 'text-yellow-400' : 'text-[#8b3cf7]'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading) return (
    <main className="min-h-screen bg-[#090909] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
    </main>
  )

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

      <div className="max-w-2xl mx-auto px-8 py-10">
        <h1 className="text-2xl font-bold mb-1">Account settings</h1>
        <p className="text-gray-400 text-sm mb-8">Manage your profile and account details</p>

        {successMessage && (
          <div className="bg-green-400/10 border border-green-400/20 text-green-400 text-sm rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
            {errorMessage}
          </div>
        )}

        {/* Profile */}
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-white mb-5">Profile</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Business name <span className="text-gray-600">(optional)</span></label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
                placeholder="Your studio or business name"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Username <span className="text-gray-600">(cannot be changed)</span></label>
              <div className="flex items-center bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 opacity-50 cursor-not-allowed">
                <span className="text-gray-600 text-sm">voxabase.com/</span>
                <span className="text-gray-400 text-sm">{username}</span>
              </div>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm mt-1"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-white mb-5">Email address</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
              />
              <p className="text-xs text-gray-600 mt-1">You will receive a confirmation email at the new address</p>
            </div>
            <button
              onClick={handleChangeEmail}
              disabled={changingEmail || newEmail === email}
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {changingEmail ? 'Sending...' : 'Update email'}
            </button>
          </div>
        </div>

        {/* Plan & Billing */}
        <div className="bg-[#111114] border border-[#1e1e24] rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-white mb-5">Plan & Billing</h2>
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className={`text-lg font-bold ${planColor}`}>{planLabel} plan</p>
              {subscriptionPeriodEnd && plan !== 'free' && (
                <p className="text-gray-500 text-xs mt-1">
                  Renews on {formatDate(subscriptionPeriodEnd)}
                </p>
              )}
              {plan === 'free' && (
                <p className="text-gray-500 text-xs mt-1">Free forever — upgrade for more features</p>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {plan === 'free' ? (
                <a href="/pricing" className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors">
                  Upgrade plan
                </a>
              ) : (
                <>
                  <button
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                    className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    {managingBilling ? 'Opening...' : 'Manage billing'}
                  </button>
                  {plan !== 'agency' && (
                    <a href="/pricing" className="text-xs text-gray-400 hover:text-white transition-colors">
                      Upgrade to Agency →
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          {plan !== 'free' && (
            <div className="bg-[#090909] border border-[#1e1e24] rounded-lg p-4 text-xs text-gray-500">
              <p>Subscriptions auto-renew monthly. Cancel anytime through Manage billing — your plan stays active until the end of the current period.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#090909] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <SettingsContent />
    </Suspense>
  )
}// force redeploy Tue Jun 23 15:40:48 CDT 2026
// force redeploy Tue Jun 23 15:42:45 CDT 2026
