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
        {/* Back button */}
        <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-6 group w-fit">
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </a>

        <h1 className="text-2xl font-bold mb-1 tracking-tight">Account settings</h1>
        <p className="text-gray-400 text-sm mb-7">Manage your profile, branding, and billing</p>

        {successMessage && (
          <div className="bg-green-400/10 border border-green-400/20 text-green-400 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-5">
            {errorMessage}
          </div>
        )}

        {/* Two-column grid — equal height */}
        <div className="grid lg:grid-cols-2 gap-5 items-stretch">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-5">
            {/* Profile */}
            <div className="bg-[#101013] border border-[#16161a] rounded-2xl p-6">
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
                  className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg disabled:opacity-50 text-sm mt-1">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="bg-[#101013] border border-[#16161a] rounded-2xl p-6">
              <h2 className="font-semibold text-white mb-5">Email address</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#08080a] border border-[#1c1c22] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm" />
                  <p className="text-xs text-gray-600 mt-1.5">You'll receive a confirmation email at the new address</p>
                </div>
                <button onClick={handleChangeEmail} disabled={changingEmail || newEmail === email}
                  className="w-full bg-[#08080a] border border-[#1c1c22] hover:border-[#2a2a33] text-white font-semibold py-3 rounded-lg disabled:opacity-40 disabled:hover:border-[#1c1c22] text-sm">
                  {changingEmail ? 'Sending...' : 'Update email'}
                </button>
              </div>
            </div>

            {/* Membership / Plan & Billing — grows to fill column */}
            <div className="bg-[#101013] border border-[#16161a] rounded-2xl p-6 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${plan === 'agency' ? 'bg-yellow-400/10 border border-yellow-400/20' : plan === 'pro' ? 'bg-[#8b3cf7]/10 border border-[#8b3cf7]/20' : 'bg-[#1e1e24] border border-[#16161a]'}`}>
                  <svg className={`w-6 h-6 ${plan === 'agency' ? 'text-yellow-400' : plan === 'pro' ? 'text-[#8b3cf7]' : 'text-gray-500'}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-white">{planLabel} plan</p>
                    {plan !== 'free' && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${plan === 'agency' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-[#8b3cf7]/10 text-[#8b3cf7]'}`}>Active</span>}
                  </div>
                  {plan === 'free' ? (
                    <p className="text-gray-500 text-sm mt-0.5">Free forever — upgrade for more</p>
                  ) : subscriptionPeriodEnd ? (
                    <p className="text-gray-500 text-sm mt-0.5">Renews {formatDate(subscriptionPeriodEnd)}</p>
                  ) : (
                    <p className="text-gray-500 text-sm mt-0.5">Active subscription — billed monthly</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                {plan === 'free' ? (
                  <a href="/pricing" className="flex-1 text-center bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-5 py-2.5 rounded-lg text-sm">Upgrade plan</a>
                ) : (
                  <>
                    <button onClick={handleManageBilling} disabled={managingBilling}
                      className="flex-1 bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
                      {managingBilling ? 'Opening...' : 'Manage billing'}
                    </button>
                    {plan !== 'agency' && (
                      <a href="/pricing" className="text-sm text-gray-400 hover:text-white border border-[#1c1c22] hover:border-[#2a2a33] px-4 py-2.5 rounded-lg whitespace-nowrap">Upgrade to Agency</a>
                    )}
                  </>
                )}
              </div>
              {plan !== 'free' && (
                <p className="text-xs text-gray-600 mt-4 pt-4 border-t border-[#16161a]">
                  Auto-renews monthly. Cancel anytime through Manage billing — your plan stays active until the period ends.
                </p>
              )}
            </div>
          </div>

          {/* ── Right column: Custom branding ── */}
          <div className="flex flex-col">
          <div className="bg-[#101013] border border-[#16161a] rounded-2xl p-6 relative overflow-hidden flex-1">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-semibold text-white">Custom branding</h2>
                <p className="text-gray-500 text-xs mt-0.5">Your logo and accent color on every portal</p>
              </div>
              {!isPro && (
                <span className="text-[11px] bg-[#1a0d30] text-[#8b3cf7] border border-[#8b3cf7]/30 px-2.5 py-1 rounded-full font-semibold">Pro</span>
              )}
            </div>

            {/* The full branding UI — dimmed + overlaid for free users */}
            <div className={!isPro ? 'pointer-events-none select-none opacity-30 blur-[1px]' : ''}>
              {/* Live preview */}
              <div className="bg-[#08080a] border border-[#1c1c22] rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {(brandDisplay === 'both' || brandDisplay === 'logo') && (
                      logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-h-7 w-auto max-w-[120px] object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: brandColor }}>
                          <span className="text-white text-xs font-bold">{(businessName || fullName || 'V').charAt(0).toUpperCase()}</span>
                        </div>
                      )
                    )}
                    {(brandDisplay === 'both' || brandDisplay === 'name') && (
                      <span className="text-sm font-bold text-white">{businessName || fullName || 'Your brand'}</span>
                    )}
                  </div>
                  <span style={{ color: brandColor }} className="text-[10px] font-semibold uppercase tracking-wide">Delivered by you</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button style={{ background: brandColor }} className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold">Pay Invoice</button>
                  <span style={{ color: brandColor, borderColor: `${brandColor}55` }} className="text-[11px] font-semibold border px-2.5 py-1 rounded-full">Ready</span>
                </div>
              </div>

              {/* Logo */}
              <p className="text-xs text-gray-500 mb-2 font-medium">Logo</p>
              {logoUrl ? (
                <div className="flex items-center gap-3 bg-[#08080a] border border-[#1c1c22] rounded-lg p-3 mb-5">
                  <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[120px] object-contain" />
                  <div className="flex-1" />
                  <label className="text-xs text-gray-400 hover:text-white border border-[#1c1c22] hover:border-[#2a2a33] px-2.5 py-1.5 rounded-lg cursor-pointer">
                    Replace
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  </label>
                  <button onClick={handleRemoveLogo} disabled={uploadingLogo}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 px-2.5 py-1.5 rounded-lg">Remove</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-1.5 bg-[#08080a] border border-dashed border-[#1c1c22] hover:border-[#8b3cf7]/40 rounded-lg p-5 cursor-pointer mb-5">
                  {uploadingLogo ? (
                    <div className="w-5 h-5 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-xs text-gray-400 font-medium">Upload your logo</span>
                      <span className="text-[11px] text-gray-600">PNG, JPG, or SVG · max 2MB</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                </label>
              )}

              {/* Display toggle (segmented) */}
              <p className="text-xs text-gray-500 mb-2 font-medium">Show on portals</p>
              <div className="grid grid-cols-3 gap-1 bg-[#08080a] border border-[#1c1c22] rounded-lg p-1 mb-5">
                {[
                  { value: 'both', label: 'Logo + Name' },
                  { value: 'logo', label: 'Logo only' },
                  { value: 'name', label: 'Name only' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setBrandDisplay(opt.value)}
                    className={`text-xs font-semibold py-2 rounded-md transition-colors ${brandDisplay === opt.value ? 'bg-[#8b3cf7] text-white' : 'text-gray-400 hover:text-white'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Color — circles */}
              <p className="text-xs text-gray-500 mb-2.5 font-medium">Accent color</p>
              <div className="flex items-center gap-2.5 flex-wrap mb-4">
                {PRESET_COLORS.map((color) => (
                  <button key={color.value} onClick={() => setBrandColor(color.value)} title={color.label}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ background: color.value, boxShadow: brandColor.toLowerCase() === color.value.toLowerCase() ? `0 0 0 2px #08080a, 0 0 0 4px ${color.value}` : 'none' }}>
                    {brandColor.toLowerCase() === color.value.toLowerCase() && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                ))}
                {/* Custom color picker as a circle */}
                <label className="w-8 h-8 rounded-full cursor-pointer relative overflow-hidden border border-[#2a2a33] flex items-center justify-center"
                  style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b3cf7, #f43f5e)' }}
                  title="Custom color">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                  <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </label>
              </div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs text-gray-600">Hex</span>
                <input type="text" value={brandColor}
                  onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setBrandColor(v) }}
                  className="w-28 bg-[#08080a] border border-[#1c1c22] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#8b3cf7] text-xs font-mono" />
              </div>

              <button onClick={handleSaveBranding} disabled={savingBrand}
                className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg disabled:opacity-50 text-sm">
                {savingBrand ? 'Saving...' : 'Save branding'}
              </button>
            </div>

            {/* Free overlay */}
            {!isPro && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-[#101013]/40 backdrop-blur-[2px]">
                <div className="w-12 h-12 rounded-2xl bg-[#1a0d30] border border-[#8b3cf7]/30 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#8b3cf7]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-1">Custom branding is a Pro feature</p>
                <p className="text-gray-400 text-sm mb-4 max-w-xs">Add your logo and accent color so clients see your brand, not ours.</p>
                <a href="/pricing" className="bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold px-5 py-2.5 rounded-lg text-sm">Upgrade to Pro</a>
              </div>
            )}
          </div>
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