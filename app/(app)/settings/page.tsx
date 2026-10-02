'use client'
import { useState, useEffect } from 'react'
import TwoStepCard from './TwoStepCard'
import SessionsCard from './SessionsCard'
import TeamCard from './TeamCard'
import DomainCard from './DomainCard'
import ThemeSwitch from '@/app/_components/ThemeSwitch'
import { verifyPassword } from '@/lib/verifyPassword'
import { MIN_NAME_LENGTH } from '@/lib/people'
import { setUnsaved } from '@/lib/unsaved'
import { storageSafeName } from '@/lib/files'
import { brandInk, brandLine, brandSurface, normalizeBrand, textOnBrand, type PortalStyle } from '@/lib/brand'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useCrumbs, useWorkspace } from '../WorkspaceProvider'
import { APP_HOST } from '@/lib/appHost'
import { PageSkeleton } from '../dashboard/AppSkeleton'
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

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'branding', label: 'Branding' },
  { id: 'security', label: 'Account & security' },
  { id: 'team', label: 'Team' },
  { id: 'domain', label: 'Domain' },
  { id: 'plan', label: 'Plan & billing' },
] as const
type SectionId = typeof SECTIONS[number]['id']

const field = 'w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm'

/** One setting: label and help on the left, the control on the right (stacked on phones) */
function Row({ label, hint, htmlFor, children }: { label: string; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 py-5 first:pt-0 last:pb-0 border-t border-rule first:border-t-0 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:gap-8">
      <div className="min-w-0">
        {htmlFor ? <label htmlFor={htmlFor} className="text-sm font-medium text-paper">{label}</label> : <p className="text-sm font-medium text-paper">{label}</p>}
        {hint && <p className="mt-1 text-xs leading-relaxed text-faint">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function SectionHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-paper">{title}</h2>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </div>
  )
}

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
  // How portals look to clients (not this app's Appearance). savedPortalStyle is
  // what's in the database, so saving only sends it when it changed.
  const [portalStyle, setPortalStyle] = useState<PortalStyle>('dark')
  const [savedPortalStyle, setSavedPortalStyle] = useState<PortalStyle>('dark')
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // What's in the database, to tell which fields have unsaved changes
  const [saved, setSaved] = useState({ fullName: '', businessName: '', brandColor: '#865fd9', brandDisplay: 'both' })
  const [changingEmail, setChangingEmail] = useState(false)
  const [emailPassword, setEmailPassword] = useState('')
  const [managingBilling, setManagingBilling] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  // Saving your name updates the sidebar too
  const { refresh: refreshWorkspace } = useWorkspace()
  useCrumbs(['Settings'])
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')
  const asked = searchParams.get('section')
  const section: SectionId = SECTIONS.some(x => x.id === asked) ? asked as SectionId : upgraded ? 'plan' : 'general'
  // Sections are all on this page: switching only changes the URL, instantly
  const setSection = (id: SectionId) => window.history.replaceState(null, '', `/settings?section=${id}`)
  useEffect(() => {
    const h = window.location.hash.slice(1)
    if (SECTIONS.some(x => x.id === h)) window.history.replaceState(null, '', `/settings?section=${h}`)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')
      setNewEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*') // all columns, so a newly added one (portal_style) can't break this page before its migration runs
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
        const style: PortalStyle = profile.portal_style === 'light' ? 'light' : 'dark'
        setPortalStyle(style); setSavedPortalStyle(style)
        setSaved({ fullName: profile.full_name || '', businessName: profile.business_name || '', brandColor: profile.brand_color || '#865fd9', brandDisplay: profile.brand_display || 'both' })
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

  // Unsaved changes: name and branding fields save together from the bar at
  // the bottom. Logo, email, two-step, team and domain act right away.
  const profileDirty = fullName !== saved.fullName || businessName !== saved.businessName
  const brandDirty = brandColor.toLowerCase() !== saved.brandColor.toLowerCase() || brandDisplay !== saved.brandDisplay || portalStyle !== savedPortalStyle
  const dirty = profileDirty || brandDirty

  const discardChanges = () => {
    setFullName(saved.fullName); setBusinessName(saved.businessName)
    setBrandColor(saved.brandColor); setBrandDisplay(saved.brandDisplay); setPortalStyle(savedPortalStyle)
    setErrorMessage('')
  }

  const saveChanges = async () => {
    setSuccessMessage('')
    setErrorMessage('')
    const name = fullName.trim()
    if (profileDirty && name.length < MIN_NAME_LENGTH) { setSection('general'); setErrorMessage(`Full name must be at least ${MIN_NAME_LENGTH} characters`); return }
    if (brandDirty && !/^#[0-9a-f]{6}$/i.test(brandColor)) { setSection('branding'); setErrorMessage('Enter the accent color as a 6-digit hex, like #865fd9'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase
      .from('profiles')
      .update({
        ...(profileDirty ? { full_name: name, business_name: businessName.trim() || null } : {}),
        ...(brandDirty ? { brand_color: brandColor, brand_display: brandDisplay } : {}),
        ...(portalStyle !== savedPortalStyle ? { portal_style: portalStyle } : {}),
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) { setErrorMessage(/portal_style/.test(error.message) ? 'Couldn’t save the portal style yet. Please try again in a few minutes.' : error.message); return }
    setFullName(name)
    setSaved({ fullName: name, businessName: businessName.trim(), brandColor, brandDisplay })
    setSavedPortalStyle(portalStyle)
    setSuccessMessage('Changes saved')
    setTimeout(() => setSuccessMessage(''), 3000)
    if (profileDirty) refreshWorkspace() // your name shows in the sidebar
  }

  // Leaving with unsaved changes asks first: closing the tab, and links in the app
  useEffect(() => {
    setUnsaved(dirty)
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault() }
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a')
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey) return
      const url = new URL(a.href, window.location.href)
      if (url.pathname === '/settings') return
      if (!window.confirm('You have unsaved changes. Leave without saving?')) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('click', onClick, true)
    return () => { setUnsaved(false); window.removeEventListener('beforeunload', onUnload); document.removeEventListener('click', onClick, true) }
  }, [dirty])

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

    const ext = storageSafeName(file.name).split('.').pop()
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
    <PageSkeleton variant="settings" />
  )

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9 pb-28">
        <h1 className="text-2xl font-bold mb-6 tracking-tight">Settings</h1>

        {/* Results float at the bottom, above the save bar when it's showing */}
        <div aria-live="polite" className={`fixed left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md flex flex-col gap-2 pointer-events-none transition-[bottom] ${dirty ? 'bottom-24' : 'bottom-5'}`}>
          {successMessage && (
            <div className="pointer-events-auto bg-ink-2 border border-rule-2 text-paper text-sm rounded-xl px-4 py-3 flex items-center gap-2 shadow-xl shadow-black/40">
              <svg className="w-4 h-4 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div role="alert" className="pointer-events-auto bg-ink-2 border border-red-400/30 text-red-400 text-sm rounded-xl px-4 py-3 flex items-start gap-2 shadow-xl shadow-black/40">
              <span className="flex-1">{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} aria-label="Dismiss" className="text-red-400/70 hover:text-red-300 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:gap-10">
          {/* Section menu: a column on wide screens, a scrolling row on phones */}
          <nav aria-label="Settings sections" className="md:w-48 md:flex-none">
            <ul className="-mx-6 flex gap-1 overflow-x-auto px-6 pb-1 md:mx-0 md:flex-col md:overflow-visible md:px-0 md:sticky md:top-20">
              {SECTIONS.map(x => (
                <li key={x.id} className="flex-none">
                  <button type="button" onClick={() => setSection(x.id)} aria-current={section === x.id ? 'page' : undefined}
                    className={`w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors ${section === x.id ? 'bg-ink-3 font-medium text-paper' : 'text-muted hover:bg-ink-2 hover:text-paper'}`}>
                    {x.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 flex-1">
            {section === 'general' && (
              <section>
                <SectionHead title="General">Your name, how you appear to your team, and how Voxabase looks to you.</SectionHead>
                <div className="border border-rule bg-card rounded-xl p-6">
                  <Row label="Full name" htmlFor="profile-name" hint="Shown to your team.">
                    <input id="profile-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={MIN_NAME_LENGTH}
                      className={field} placeholder="Your full name" />
                  </Row>
                  <Row label="Business name" htmlFor="profile-business" hint="Optional. Shown on your portals instead of your name.">
                    <input id="profile-business" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                      className={field} placeholder="Your studio or business name" />
                  </Row>
                  <Row label="Username" hint="Part of every portal link. It can’t be changed.">
                    <div className="flex items-center bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 opacity-60 cursor-not-allowed text-sm min-w-0">
                      <span className="text-faint truncate">{APP_HOST}/</span>
                      <span className="text-muted">{username}</span>
                    </div>
                  </Row>
                  <Row label="Appearance" hint="Only changes how Voxabase looks to you, on every device you sign in on. Clients see your Portal style, under Branding.">
                    <ThemeSwitch labels />
                  </Row>
                </div>
              </section>
            )}

            {section === 'branding' && (
              <section>
                <SectionHead title="Branding">Your logo, color and portal style: what every client sees.</SectionHead>
                <div className="relative overflow-hidden border border-rule bg-card rounded-xl p-6">
                  <div className={`grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] ${!isPro ? 'pointer-events-none select-none opacity-30 blur-[1px]' : ''}`}>
                    <div className="min-w-0 flex flex-col gap-6">
                      {/* Logo: a tile with its details beside it, like a profile photo */}
                      <div className="flex items-center gap-4">
                        <label className={`grid h-14 w-14 flex-none cursor-pointer place-items-center overflow-hidden rounded-xl border bg-ink ${logoUrl ? 'border-rule-2' : 'border-dashed border-rule-3 hover:border-accent/60'}`}
                          title={logoUrl ? 'Replace logo' : 'Upload logo'}>
                          {uploadingLogo ? (
                            <span className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                          ) : logoUrl ? (
                            <img src={logoUrl} alt="Your logo" className="max-h-10 max-w-11 object-contain" />
                          ) : (
                            <svg className="h-5 w-5 text-faint" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                          )}
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                        </label>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-paper">Logo</p>
                          <p className="text-xs text-faint mt-0.5">PNG, JPG or SVG, up to 2MB. Any shape works.</p>
                          <div className="mt-1.5 flex items-center gap-2 text-xs font-medium">
                            {logoUrl ? (
                              <>
                                <label className="cursor-pointer text-muted hover:text-paper">
                                  {uploadingLogo ? 'Uploading…' : 'Replace'}
                                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                                </label>
                                <span className="text-rule-3" aria-hidden="true">·</span>
                                <button type="button" onClick={handleRemoveLogo} disabled={uploadingLogo} className="text-red-400 hover:text-red-300 disabled:opacity-50">Remove</button>
                              </>
                            ) : (
                              <label className="cursor-pointer text-accent-text hover:underline underline-offset-2">
                                {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-paper mb-2">Show on portals</p>
                        <div className="grid grid-cols-3 gap-1 bg-ink border border-rule-2 rounded-lg p-1">
                          {[
                            { value: 'both', label: 'Logo + name' },
                            { value: 'logo', label: 'Logo only' },
                            { value: 'name', label: 'Name only' },
                          ].map(opt => (
                            <button key={opt.value} type="button" onClick={() => setBrandDisplay(opt.value)} aria-pressed={brandDisplay === opt.value}
                              className={`text-xs font-semibold py-2 rounded-md transition-colors ${brandDisplay === opt.value ? 'bg-paper text-ink' : 'text-muted hover:text-paper'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-paper mb-2">Accent color</p>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {PRESET_COLORS.map((color) => (
                            <button key={color.value} type="button" onClick={() => setBrandColor(color.value)} title={color.label} aria-label={color.label} aria-pressed={brandColor.toLowerCase() === color.value.toLowerCase()}
                              className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                              style={{ background: color.value, boxShadow: brandColor.toLowerCase() === color.value.toLowerCase() ? `0 0 0 2px var(--color-card), 0 0 0 4px ${color.value}` : 'none' }}>
                              {brandColor.toLowerCase() === color.value.toLowerCase() && (
                                <svg className="w-3.5 h-3.5" style={{ color: textOnBrand(color.value) }} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </button>
                          ))}
                          <label className="w-8 h-8 rounded-full cursor-pointer relative overflow-hidden border border-rule-3 flex items-center justify-center"
                            style={{ background: 'conic-gradient(from 0deg, #f43f5e, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b3cf7, #f43f5e)' }}
                            title="Custom color">
                            <input type="color" aria-label="Custom color" value={/^#[0-9a-f]{6}$/i.test(brandColor) ? brandColor : '#865fd9'} onChange={(e) => setBrandColor(e.target.value)}
                              className="absolute inset-0 opacity-0 cursor-pointer" />
                            <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          </label>
                          <label htmlFor="brand-hex" className="sr-only">Hex color</label>
                          <input id="brand-hex" type="text" value={brandColor}
                            onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setBrandColor(v) }}
                            className="w-24 bg-ink border border-rule-2 rounded-lg px-2.5 py-1.5 text-paper focus:outline-none focus:border-accent text-xs font-mono" />
                        </div>
                      </div>

                      {/* Portal style: how every client sees the portals. Deliberately unlike
                          Appearance (a personal setting): picked with portal thumbnails, here only */}
                      <div>
                        <p className="text-sm font-medium text-paper">Portal style</p>
                        <p className="text-xs text-faint mt-0.5 mb-2">What every client sees, on every portal.</p>
                        <div role="radiogroup" aria-label="Portal style" className="grid grid-cols-2 gap-3 max-w-md">
                          {(['dark', 'light'] as const).map(st => {
                            const on = portalStyle === st
                            const c = normalizeBrand(brandColor)
                            return (
                              <button key={st} type="button" role="radio" aria-checked={on} onClick={() => setPortalStyle(st)}
                                className={`rounded-xl border p-2 text-left transition-colors ${on ? 'border-accent ring-2 ring-accent/25' : 'border-rule-2 hover:border-rule-3'}`}>
                                <div className={`${st === 'light' ? 'scheme-light' : 'scheme-dark'} rounded-lg border border-rule bg-ink p-2`} aria-hidden="true">
                                  <div className="rounded-md border border-rule bg-ink-2 p-2 flex flex-col gap-1.5">
                                    <span className="h-1 w-9 rounded-full" style={{ background: brandInk(c, st) }} />
                                    <span className="h-1.5 w-14 rounded-full bg-paper/80" />
                                    <span className="h-3 rounded border border-rule bg-ink" />
                                    <span className="h-3 rounded" style={{ background: c }} />
                                  </div>
                                </div>
                                <span className="mt-2 flex items-center justify-between px-1">
                                  <span className={`text-sm font-medium ${on ? 'text-paper' : 'text-muted'}`}>{st === 'dark' ? 'Dark' : 'Light'}</span>
                                  {on && <svg className="h-4 w-4 text-accent-text" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* The live preview, beside the controls on wide screens */}
                    <div className="min-w-0 xl:self-start">
                  {/* Live preview: a small copy of the portal card your clients see */}
                  {(() => {
                    const c = normalizeBrand(brandColor)
                    const name = businessName || fullName || 'Your brand'
                    const showLogo = brandDisplay === 'both' || brandDisplay === 'logo'
                    const showName = brandDisplay === 'both' || brandDisplay === 'name'
                    return (
                      // Shown on a soft stage so it reads as a window into the portal. It
                      // follows Portal style (what clients see), not this app's Appearance
                      <figure className="rounded-xl border border-rule bg-ink p-4 sm:p-5">
                        <figcaption className="mb-3 flex items-center gap-1.5 text-xs font-medium text-faint">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          What your clients see
                        </figcaption>
                      <div className={`${portalStyle === 'light' ? 'scheme-light' : 'scheme-dark'} overflow-hidden rounded-[14px] border border-rule bg-ink-2 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.6)]`} aria-label="Preview of your client portal">
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
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: brandInk(c, portalStyle) }} aria-hidden="true" />
                            Ready
                          </span>
                        </div>
                        <div className="px-4 pb-3 pt-4">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: brandInk(c, portalStyle) }}>Delivered by {name}</p>
                          <p className="text-base font-bold tracking-[-0.02em] text-paper">Example project</p>
                        </div>
                        <div className="px-3">
                          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-rule bg-ink px-2.5 py-[9px]">
                            <span className="grid h-[34px] w-[34px] place-items-center rounded-lg border text-[10px] font-bold tracking-[0.04em]" style={{ background: brandSurface(c, portalStyle), color: brandInk(c, portalStyle), borderColor: brandLine(c) }}>PDF</span>
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
                      </figure>
                    )
                  })()}
                    </div>
                  </div>

                  {!isPro && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-ink-2/40 backdrop-blur-[2px]">
                      <div className="w-12 h-12 rounded-xl bg-ink-2 border border-rule flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <p className="text-paper font-semibold mb-1">Branding is a Pro feature</p>
                      <p className="text-muted text-sm mb-4 max-w-xs">Add your logo, accent color and portal style so clients see your brand, not ours.</p>
                      <Link href="/pricing" className="bg-paper hover:bg-paper-hover text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Upgrade to Pro</Link>
                    </div>
                  )}
                </div>
              </section>
            )}

            {section === 'security' && (
              <section>
                <SectionHead title="Account & security">Your sign-in email, two-step verification and signed-in devices.</SectionHead>
                <div className="border border-rule bg-card rounded-xl p-6">
                  <Row label="Email" htmlFor="settings-email" hint="We’ll send a confirmation link to the new address.">
                    <div className="flex flex-col gap-3">
                      <input id="settings-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={field} />
                      {newEmail !== email && (
                        <>
                          <label htmlFor="email-password" className="sr-only">Current password</label>
                          <input id="email-password" type="password" autoComplete="current-password" value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)} placeholder="Current password, to confirm it’s you" className={field} />
                          <button onClick={handleChangeEmail} disabled={changingEmail || !emailPassword}
                            className="self-start bg-paper hover:bg-paper-hover text-ink font-semibold px-4 py-2 rounded-lg disabled:opacity-40 text-sm">
                            {changingEmail ? 'Sending…' : 'Update email'}
                          </button>
                        </>
                      )}
                    </div>
                  </Row>
                </div>
                <div className="mt-5 grid gap-5 lg:grid-cols-2 items-stretch">
                  <TwoStepCard />
                  <SessionsCard />
                </div>
              </section>
            )}

            {section === 'team' && (
              <section>
                <SectionHead title="Team">Who can work in your Team workspace.</SectionHead>
                <div className="[&>*]:mt-0"><TeamCard plan={plan} /></div>
              </section>
            )}

            {section === 'domain' && (
              <section>
                <SectionHead title="Domain">Send portals from your own web address.</SectionHead>
                <div className="[&>*]:mt-0"><DomainCard plan={plan} /></div>
              </section>
            )}

            {section === 'plan' && (
              <section>
                <SectionHead title="Plan & billing">Your plan, renewal and invoices.</SectionHead>
                <div className="border border-rule bg-card rounded-xl p-6">
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
                <Link href="/pricing" className="bg-paper hover:bg-paper-hover text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Upgrade plan</Link>
              ) : (
                <>
                  {plan !== 'agency' && (
                    <Link href="/pricing" className="text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-4 py-2.5 rounded-lg">Upgrade to Agency</Link>
                  )}
                  <button onClick={handleManageBilling} disabled={managingBilling}
                    className="bg-paper hover:bg-paper-hover text-ink font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
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
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved changes: name and branding save together from here */}
      {dirty && (
        <div role="region" aria-label="Unsaved changes" className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl">
          <div className="flex items-center gap-3 rounded-xl border border-rule-2 bg-ink-2 px-4 py-3 shadow-2xl shadow-black/40">
            <span className="h-2 w-2 flex-none rounded-full bg-amber-400" aria-hidden="true" />
            <p className="flex-1 text-sm text-paper">You have unsaved changes</p>
            <button type="button" onClick={discardChanges} disabled={saving} className="text-sm text-muted hover:text-paper px-3 py-2 rounded-lg">Discard</button>
            <button type="button" onClick={saveChanges} disabled={saving}
              className="bg-paper hover:bg-paper-hover text-ink font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <PageSkeleton variant="settings" />
    }>
      <SettingsContent />
    </Suspense>
  )
}