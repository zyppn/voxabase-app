'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '../dashboard/AppShell'

const PRESET_COLORS = [
  { label: 'VoxaBase Purple', value: '#8b3cf7' },
  { label: 'Ocean Blue', value: '#3b82f6' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Coral', value: '#f97316' },
  { label: 'Sky', value: '#06b6d4' },
  { label: 'Slate', value: '#64748b' },
]

function SettingsContent() {
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [plan, setPlan] = useState('free')
  const [username, setUsername] = useState('')
  const [brandColor, setBrandColor] = useState('#8b3cf7')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [brandDisplay, setBrandDisplay] = useState('both')
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [managingBilling, setManagingBilling] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebar, setSidebar] = useState<{
    counts: { all: number; active: number; completed: number }
    usedBytes: number
    plan: string
    displayLabel: string
    email: string
    initials: string
    stripeConnected: boolean
  } | null>(null)
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
        .select('full_name, business_name, username, plan, subscription_period_end, brand_color, logo_url, brand_display, stripe_onboarding_complete')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
        setBusinessName(profile.business_name || '')
        setUsername(profile.username || '')
        setPlan(profile.plan || 'free')
        setSubscriptionPeriodEnd(profile.subscription_period_end || null)
        setBrandColor(profile.brand_color || '#8b3cf7')
        setLogoUrl(profile.logo_url || null)
        setBrandDisplay(profile.brand_display || 'both')
      }

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
    if (error) setErrorMessage(error.message)
    else { setSuccessMessage('Profile updated successfully'); setTimeout(() => setSuccessMessage(''), 3000) }
    setSaving(false)
  }

  const handleSaveBranding = async () => {
    setSavingBrand(true)
    setSuccessMessage('')
    setErrorMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ brand_color: brandColor, brand_display: brandDisplay })
      .eq('id', user.id)
    if (error) setErrorMessage(error.message)
    else { setSuccessMessage('Branding updated — your portals will use the new color'); setTimeout(() => setSuccessMessage(''), 4000) }
    setSavingBrand(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file (PNG, JPG, or SVG)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage('Logo must be under 2MB')
      return
    }

    setUploadingLogo(true)
    setErrorMessage('')
    setSuccessMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Remove old logo if exists
    if (logoUrl) {
      const oldPath = logoUrl.split('/branding/')[1]
      if (oldPath) await supabase.storage.from('branding').remove([oldPath])
    }

    const ext = file.name.split('.').pop()
    const filePath = `${user.id}/logo-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('branding').upload(filePath, file)

    if (uploadError) {
      setErrorMessage(uploadError.message)
      setUploadingLogo(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('branding').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ logo_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      setErrorMessage(updateError.message)
    } else {
      setLogoUrl(publicUrl)
      setSuccessMessage('Logo uploaded — your portals will now show your logo')
      setTimeout(() => setSuccessMessage(''), 4000)
    }
    setUploadingLogo(false)
  }

  const handleRemoveLogo = async () => {
    setUploadingLogo(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (logoUrl) {
      const oldPath = logoUrl.split('/branding/')[1]
      if (oldPath) await supabase.storage.from('branding').remove([oldPath])
    }

    await supabase.from('profiles').update({ logo_url: null }).eq('id', user.id)
    setLogoUrl(null)
    setSuccessMessage('Logo removed — portals will show the default VoxaBase logo')
    setTimeout(() => setSuccessMessage(''), 4000)
    setUploadingLogo(false)
  }

  const handleChangeEmail = async () => {
    if (newEmail === email) return
    setChangingEmail(true)
    setSuccessMessage('')
    setErrorMessage('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) setErrorMessage(error.message)
    else { setSuccessMessage('Confirmation email sent to your new address. Click the link to confirm.'); setTimeout(() => setSuccessMessage(''), 6000) }
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
  const isPro = plan === 'pro' || plan === 'agency'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading) return (
    <main className="min-h-screen bg-[#08080a] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <AppShell
      counts={sidebar?.counts || { all: 0, active: 0, completed: 0 }}
      usedBytes={sidebar?.usedBytes || 0}
      plan={sidebar?.plan || plan}
      displayLabel={sidebar?.displayLabel || 'Your'}
      email={sidebar?.email || ''}
      initials={sidebar?.initials || 'U'}
      stripeConnected={sidebar?.stripeConnected || false}
      activeFilter={null}
      onFilterClick={(key) => router.push(`/dashboard?filter=${key}`)}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        <div className="max-w-2xl mx-auto">
          {/* Back button — clean arrow */}
          <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-6 group w-fit">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </a>

          <h1 className="text-2xl font-bold mb-1 tracking-tight">Account settings</h1>
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
        <div className="bg-[#101013] border border-[#16161a] rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-white mb-5">Profile</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Full name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
                placeholder="Your full name" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Business name <span className="text-gray-600">(optional)</span></label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
                placeholder="Your studio or business name" />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Username <span className="text-gray-600">(cannot be changed)</span></label>
              <div className="flex items-center bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-3 opacity-50 cursor-not-allowed">
                <span className="text-gray-600 text-sm">voxabase.com/</span>
                <span className="text-gray-400 text-sm">{username}</span>
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={saving}
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm mt-1">
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Custom Branding */}
        <div className={`bg-[#101013] border rounded-xl p-6 mb-5 ${isPro ? 'border-[#16161a]' : 'border-[#16161a] opacity-60'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Custom branding</h2>
              <p className="text-gray-500 text-xs mt-0.5">Your logo and accent color on every client portal</p>
            </div>
            {!isPro && (
              <a href="/pricing" className="text-xs bg-[#1a0d30] text-[#8b3cf7] border border-[#8b3cf7]/30 px-3 py-1.5 rounded-full font-semibold hover:bg-[#8b3cf7]/20 transition-colors">
                Pro feature — Upgrade
              </a>
            )}
          </div>

          {isPro ? (
            <div className="flex flex-col gap-4">
              {/* Preview */}
              <div className="bg-[#08080a] border border-[#1c1c22] rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-semibold">Portal preview</p>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#16161a]">
                  <div className="flex items-center gap-2.5">
                    {(brandDisplay === 'both' || brandDisplay === 'logo') && (
                      logoUrl ? (
                        <img src={logoUrl} alt="Your logo" className="h-7 w-auto max-w-[120px] object-contain" />
                      ) : (
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: brandColor }}>
                          <span className="text-white text-xs font-bold">{(businessName || fullName || 'V').charAt(0).toUpperCase()}</span>
                        </div>
                      )
                    )}
                    {(brandDisplay === 'both' || brandDisplay === 'name') && (
                      <span className="text-sm font-bold text-white">{businessName || fullName || username || 'Your brand'}</span>
                    )}
                  </div>
                  <span style={{ color: brandColor }} className="text-[10px] font-semibold uppercase tracking-wide">
                    Delivered by {businessName || fullName || 'you'}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <button style={{ background: brandColor }} className="px-4 py-2 rounded-lg text-white text-xs font-semibold">
                    Pay Invoice
                  </button>
                  <span style={{ color: brandColor, borderColor: `${brandColor}50` }} className="text-xs font-semibold border px-3 py-1 rounded-full">
                    Ready to download
                  </span>
                  <span style={{ color: brandColor }} className="text-xs font-semibold flex items-center gap-1">
                    ↓ Download
                  </span>
                </div>
              </div>

              {/* Logo upload */}
              <div>
                <p className="text-xs text-gray-500 mb-3">Your logo</p>
                {logoUrl ? (
                  <div className="flex items-center gap-4 bg-[#08080a] border border-[#1c1c22] rounded-lg p-4">
                    <img src={logoUrl} alt="Your logo" className="h-10 w-auto max-w-[160px] object-contain" />
                    <div className="flex-1" />
                    <label className="text-xs text-gray-400 hover:text-white border border-[#16161a] hover:border-[#3a3a4a] px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                      Replace
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                    </label>
                    <button onClick={handleRemoveLogo} disabled={uploadingLogo}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 px-3 py-1.5 rounded-lg transition-colors">
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 bg-[#08080a] border border-dashed border-[#16161a] hover:border-[#8b3cf7]/40 rounded-lg p-6 cursor-pointer transition-colors">
                    {uploadingLogo ? (
                      <div className="w-5 h-5 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <span className="text-xs text-gray-400 font-medium">Click to upload your logo</span>
                        <span className="text-xs text-gray-600">PNG, JPG, or SVG · max 2MB</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  </label>
                )}
              </div>

              {/* Header display toggle */}
              <div>
                <p className="text-xs text-gray-500 mb-3">Portal header shows</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'both', label: 'Logo + name' },
                    { value: 'logo', label: 'Logo only' },
                    { value: 'name', label: 'Name only' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setBrandDisplay(opt.value)}
                      className={`text-xs font-semibold py-2.5 rounded-lg border transition-colors ${
                        brandDisplay === opt.value
                          ? 'border-[#8b3cf7] bg-[#1a0d30] text-white'
                          : 'border-[#16161a] text-gray-400 hover:text-white hover:border-[#3a3a4a]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {brandDisplay === 'name' && !businessName && !fullName
                    ? 'Add a business name in your profile above for this option'
                    : 'Choose what appears in the top-left of your client portals'}
                </p>
              </div>

              {/* Preset colors */}
              <div>
                <p className="text-xs text-gray-500 mb-3">Choose a color</p>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBrandColor(color.value)}
                      title={color.label}
                      className={`h-10 rounded-lg transition-all border-2 ${brandColor === color.value ? 'border-white scale-105' : 'border-transparent hover:scale-105'}`}
                      style={{ background: color.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Custom hex */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Custom color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer bg-transparent border border-[#16161a] p-0.5"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => {
                      const val = e.target.value
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setBrandColor(val)
                    }}
                    className="flex-1 bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#8b3cf7] text-sm font-mono"
                    placeholder="#8b3cf7"
                  />
                </div>
              </div>

              <button onClick={handleSaveBranding} disabled={savingBrand}
                className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm">
                {savingBrand ? 'Saving...' : 'Save branding'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-4 gap-2 pointer-events-none">
                {PRESET_COLORS.map((color) => (
                  <div key={color.value} className="h-10 rounded-lg" style={{ background: color.value }} />
                ))}
              </div>
              <p className="text-xs text-gray-600">Upgrade to Pro to customize your portal accent color</p>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="bg-[#101013] border border-[#16161a] rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-white mb-5">Email address</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm" />
              <p className="text-xs text-gray-600 mt-1">You will receive a confirmation email at the new address</p>
            </div>
            <button onClick={handleChangeEmail} disabled={changingEmail || newEmail === email}
              className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 text-sm">
              {changingEmail ? 'Sending...' : 'Update email'}
            </button>
          </div>
        </div>

        {/* Plan & Billing */}
        <div className="bg-[#101013] border border-[#16161a] rounded-xl p-6 mb-5">
          <h2 className="font-semibold text-white mb-5">Plan & Billing</h2>
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className={`text-lg font-bold ${planColor}`}>{planLabel} plan</p>
              {subscriptionPeriodEnd && plan !== 'free' && (
                <p className="text-gray-500 text-xs mt-1">Renews on {formatDate(subscriptionPeriodEnd)}</p>
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
                  <button onClick={handleManageBilling} disabled={managingBilling}
                    className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50">
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
            <div className="bg-[#0d0d10] border border-[#16161a] rounded-lg p-4 text-xs text-gray-500">
              Subscriptions auto-renew monthly. Cancel anytime through Manage billing — your plan stays active until the end of the current period.
            </div>
          )}
        </div>
        </div>
      </div>
    </AppShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <SettingsContent />
    </Suspense>
  )
}