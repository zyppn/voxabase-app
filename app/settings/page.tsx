'use client'
import { useState, useEffect } from 'react'
import TwoStepCard from './TwoStepCard'
import SessionsCard from './SessionsCard'
import TeamCard from './TeamCard'
import DomainCard from './DomainCard'
import { verifyPassword } from '@/lib/verifyPassword'
import { MIN_NAME_LENGTH } from '@/lib/people'
import { brandInk, brandLine, brandSurface, normalizeBrand, textOnBrand } from '@/lib/brand'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import AppShell from '../dashboard/AppShell'
import { loadWorkspace, readWorkspaceCookie } from '@/lib/workspace'
import { APP_HOST } from '@/lib/appHost'
import AppSkeleton from '../dashboard/AppSkeleton'
import Link from 'next/link'

const PRESET_COLORS = [
  { label: 'Voxabase Purple', value: '#865fd9' },
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
  const [brandColor, setBrandColor] = useState('#865fd9')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [brandDisplay, setBrandDisplay] = useState('both')
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingBrand, setSavingBrand] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [emailPassword, setEmailPassword] = useState('')
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
        setBrandColor(profile.brand_color || '#865fd9')
        setLogoUrl(profile.logo_url || null)
        setBrandDisplay(profile.brand_display || 'both')
      }

      // Sidebar shows the current workspace (yours, or an Agency team you're in)
      const sideWs = await loadWorkspace(supabase, user.id, readWorkspaceCookie())
      const { data: allPortals } = await supabase
        .from('portals')
        .select('invoice_amount, invoice_paid, team_shared')
        .eq('user_id', sideWs.ownerId)
      // Only the current workspace's portals (Team or Personal)
      const all = (allPortals || []).filter(p => sideWs.shared === null || p.team_shared === sideWs.shared)
      const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: sideWs.ownerId })
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
        plan: sideWs.owner?.plan || 'free',
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
    setSuccessMessage('')
    setErrorMessage('')
    const name = fullName.trim()
    if (name.length < MIN_NAME_LENGTH) { setErrorMessage(`Full name must be at least ${MIN_NAME_LENGTH} characters`); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, business_name: businessName.trim() || null })
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
    setSuccessMessage('Logo removed — portals will show the default Voxabase logo')
    setTimeout(() => setSuccessMessage(''), 4000)
    setUploadingLogo(false)
  }

  const handleChangeEmail = async () => {
    if (newEmail === email) return
    setChangingEmail(true)
    setSuccessMessage('')
    setErrorMessage('')
    const wrong = await verifyPassword(emailPassword)
    if (wrong) { setErrorMessage(wrong); setChangingEmail(false); return }
    setEmailPassword('')
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
  const planColor = plan === 'free' ? 'text-muted' : 'text-paper'
  const isPro = plan === 'pro' || plan === 'agency'

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading) return (
    <AppSkeleton variant="settings" />
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
      crumbs={['Settings']}
      onFilterClick={(key) => router.push(`/dashboard?filter=${key}`)}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        {/* Back button */}

        <h1 className="text-2xl font-bold mb-1 tracking-tight">Account settings</h1>
        <p className="text-muted text-sm mb-7">Manage your profile, branding, and billing</p>

        {successMessage && (
          <div className="bg-ink-2 border border-rule text-paper text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
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

        {/* Two-column grid */}
        <div className="grid lg:grid-cols-2 gap-5 items-stretch">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-5">
            {/* Profile */}
            <div className="bg-ink-2 border border-rule rounded-xl p-6">
              <h2 className="font-semibold text-paper mb-5">Profile</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Full name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={MIN_NAME_LENGTH}
                    className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Business name <span className="text-faint">(optional)</span></label>
                  <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                    placeholder="Your studio or business name" />
                </div>
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Username <span className="text-faint">(cannot be changed)</span></label>
                  <div className="flex items-center bg-ink border border-rule-2 rounded-lg px-4 py-3 opacity-50 cursor-not-allowed">
                    <span className="text-faint text-sm">{APP_HOST}/</span>
                    <span className="text-muted text-sm">{username}</span>
                  </div>
                </div>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="w-full bg-paper hover:bg-white text-ink font-semibold py-2.5 rounded-lg disabled:opacity-50 text-sm mt-1">
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>

            {/* Email: stretches so both columns end on the same line */}
            <div className="bg-ink-2 border border-rule rounded-xl p-6 flex-1 flex flex-col">
              <h2 className="font-semibold text-paper mb-5">Email address</h2>
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <label className="text-sm text-muted mb-1.5 block">Email</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm" />
                  <p className="text-xs text-faint mt-1.5">You'll receive a confirmation email at the new address</p>
                </div>
                <div>
                  <label htmlFor="email-password" className="text-sm text-muted mb-1.5 block">
                    Current password {newEmail === email && <span className="text-faint">(needed to change your email)</span>}
                  </label>
                  <input id="email-password" type="password" autoComplete="current-password" value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)} disabled={newEmail === email}
                    placeholder={newEmail === email ? 'Edit your email above first' : "Confirm it's you"}
                    className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm disabled:opacity-50 disabled:cursor-not-allowed" />
                </div>
                <button onClick={handleChangeEmail} disabled={changingEmail || newEmail === email || !emailPassword}
                  className="mt-auto w-full bg-ink border border-rule-2 hover:border-rule-3 text-paper font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:hover:border-rule-2 text-sm">
                  {changingEmail ? 'Sending...' : 'Update email'}
                </button>
              </div>
            </div>

          </div>

          {/* ── Right column: Custom branding ── */}
          <div className="bg-ink-2 border border-rule rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-paper">Custom branding</h2>
                <p className="text-faint text-xs mt-0.5">Your logo and accent color on every portal</p>
              </div>
              {!isPro && (
                <span className="text-[11px] text-accent-text border border-accent/30 px-2 py-0.5 rounded-full font-semibold">Pro</span>
              )}
            </div>

            {/* The full branding UI — dimmed + overlaid for free users */}
            <div className={!isPro ? 'pointer-events-none select-none opacity-30 blur-[1px]' : ''}>
              {/* Live preview: a small copy of the portal card your clients see */}
              {(() => {
                const c = normalizeBrand(brandColor)
                const name = businessName || fullName || 'Your brand'
                const showLogo = brandDisplay === 'both' || brandDisplay === 'logo'
                const showName = brandDisplay === 'both' || brandDisplay === 'name'
                return (
                  <div className="mb-5 overflow-hidden rounded-[14px] border border-rule bg-ink-2" aria-label="Preview of your client portal">
                    <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {showLogo && (logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="max-h-7 w-auto max-w-[120px] object-contain" />
                        ) : (
                          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg text-[13px] font-bold" style={{ background: c, color: textOnBrand(c) }}>
                            {name.charAt(0).toUpperCase()}
                          </span>
                        ))}
                        {showName && <span className="truncate text-sm font-bold text-paper">{name}</span>}
                      </div>
                      <span className="flex flex-none items-center gap-2 text-xs text-faint">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: brandInk(c) }} aria-hidden="true" />
                        Ready
                      </span>
                    </div>
                    <div className="px-4 pb-3 pt-4">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: brandInk(c) }}>Delivered by {name}</p>
                      <p className="text-base font-bold tracking-[-0.02em] text-paper">Example project</p>
                    </div>
                    <div className="px-3">
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-rule bg-ink px-2.5 py-[9px]">
                        <span className="grid h-[34px] w-[34px] place-items-center rounded-lg border text-[10px] font-bold tracking-[0.04em]" style={{ background: brandSurface(c), color: brandInk(c), borderColor: brandLine(c) }}>PDF</span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-paper">Example.pdf</span>
                          <span className="block text-xs text-faint">2.4 MB</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-rule-2 px-2.5 py-1.5 text-xs font-semibold text-paper"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download</span>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-rule px-4 py-3.5">
                      <span className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[10px] text-sm font-semibold" style={{ background: c, color: textOnBrand(c) }}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                        Pay Invoice
                      </span>
                    </div>
                  </div>
                )
              })()}

              {/* Logo */}
              <p className="text-xs text-faint mb-1.5 font-medium">Logo <span className="text-faint font-normal">· PNG, JPG, or SVG · max 2MB</span></p>
              {logoUrl ? (
                <div className="flex items-center gap-3 bg-ink border border-rule-2 rounded-lg p-2.5 mb-4">
                  <img src={logoUrl} alt="Logo" className="h-8 w-auto max-w-[120px] object-contain" />
                  <div className="flex-1" />
                  <label className="text-xs text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-2.5 py-1.5 rounded-lg cursor-pointer">
                    Replace
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  </label>
                  <button onClick={handleRemoveLogo} disabled={uploadingLogo}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/40 px-2.5 py-1.5 rounded-lg">Remove</button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 bg-ink border border-dashed border-rule-2 hover:border-accent/40 rounded-lg py-3 cursor-pointer mb-4">
                  {uploadingLogo ? (
                    <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span className="text-xs text-muted font-medium">Upload your logo</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                </label>
              )}

              {/* Display toggle (segmented) */}
              <p className="text-xs text-faint mb-1.5 font-medium">Show on portals</p>
              <div className="grid grid-cols-3 gap-1 bg-ink border border-rule-2 rounded-lg p-1 mb-4">
                {[
                  { value: 'both', label: 'Logo + Name' },
                  { value: 'logo', label: 'Logo only' },
                  { value: 'name', label: 'Name only' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setBrandDisplay(opt.value)}
                    className={`text-xs font-semibold py-2 rounded-md transition-colors ${brandDisplay === opt.value ? 'bg-paper text-ink' : 'text-muted hover:text-paper'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Color — circles */}
              <p className="text-xs text-faint mb-2 font-medium">Accent color</p>
              <div className="flex items-center gap-2.5 flex-wrap mb-3">
                {PRESET_COLORS.map((color) => (
                  <button key={color.value} onClick={() => setBrandColor(color.value)} title={color.label}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ background: color.value, boxShadow: brandColor.toLowerCase() === color.value.toLowerCase() ? `0 0 0 2px #08080a, 0 0 0 4px ${color.value}` : 'none' }}>
                    {brandColor.toLowerCase() === color.value.toLowerCase() && (
                      <svg className="w-3.5 h-3.5 text-paper" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>
                ))}
                {/* Custom color picker as a circle */}
                <label className="w-8 h-8 rounded-full cursor-pointer relative overflow-hidden border border-rule-3 flex items-center justify-center"
                  style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b3cf7, #f43f5e)' }}
                  title="Custom color">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer" />
                  <svg className="w-3.5 h-3.5 text-paper drop-shadow" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </label>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-faint">Hex</span>
                <input type="text" value={brandColor}
                  onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setBrandColor(v) }}
                  className="w-28 bg-ink border border-rule-2 rounded-lg px-3 py-1.5 text-paper focus:outline-none focus:border-accent text-xs font-mono" />
              </div>

              <button onClick={handleSaveBranding} disabled={savingBrand}
                className="w-full bg-paper hover:bg-white text-ink font-semibold py-2.5 rounded-lg disabled:opacity-50 text-sm">
                {savingBrand ? 'Saving...' : 'Save branding'}
              </button>
            </div>

            {/* Free overlay */}
            {!isPro && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-ink-2/40 backdrop-blur-[2px]">
                <div className="w-12 h-12 rounded-xl bg-ink-2 border border-rule flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <p className="text-paper font-semibold mb-1">Custom branding is a Pro feature</p>
                <p className="text-muted text-sm mb-4 max-w-xs">Add your logo and accent color so clients see your brand, not ours.</p>
                <Link href="/pricing" className="bg-paper hover:bg-white text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Upgrade to Pro</Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Security: two cards side by side ── */}
        <div className="grid lg:grid-cols-2 gap-5 items-stretch mt-5">
          <TwoStepCard />
          <SessionsCard />
        </div>

        {/* ── Team seats (Agency) ── */}
        <TeamCard plan={plan} />

        {/* ── White-label portal domain (Agency) ── */}
        <DomainCard plan={plan} />

        {/* ── Membership / Plan & Billing — full width ── */}
        <div className="mt-5 bg-ink-2 border border-rule rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-ink-3 border border-rule-2`}>
                <svg className={`w-6 h-6 text-muted`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-paper">{planLabel} plan</p>
                  {plan !== 'free' && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border border-rule-2 text-muted`}>Active</span>}
                </div>
                {plan === 'free' ? (
                  <p className="text-faint text-sm mt-0.5">Free forever — upgrade for branding, unlimited portals & more</p>
                ) : subscriptionPeriodEnd ? (
                  <p className="text-faint text-sm mt-0.5">Renews {formatDate(subscriptionPeriodEnd)}</p>
                ) : (
                  <p className="text-faint text-sm mt-0.5">Active subscription</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {plan === 'free' ? (
                <Link href="/pricing" className="bg-paper hover:bg-white text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Upgrade plan</Link>
              ) : (
                <>
                  {plan !== 'agency' && (
                    <Link href="/pricing" className="text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-4 py-2.5 rounded-lg">Upgrade to Agency</Link>
                  )}
                  <button onClick={handleManageBilling} disabled={managingBilling}
                    className="bg-paper hover:bg-white text-ink font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
                    {managingBilling ? 'Opening...' : 'Manage billing'}
                  </button>
                </>
              )}
            </div>
          </div>
          {plan !== 'free' && (
            <p className="text-xs text-faint mt-4 pt-4 border-t border-rule">
              Your subscription renews automatically. Cancel anytime through Manage billing — your plan stays active until the end of the current billing period.
            </p>
          )}
        </div>

      </div>
    </AppShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <AppSkeleton variant="settings" />
    }>
      <SettingsContent />
    </Suspense>
  )
}