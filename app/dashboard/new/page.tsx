'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '../AppShell'
import { loadWorkspace, readWorkspaceCookie } from '@/lib/workspace'

function generateRandomSlug(name: string) {
  const random = Math.random().toString(36).slice(2, 7)
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + random
}

export default function NewPortalPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [customSlug, setCustomSlug] = useState('')
  const [useCustomSlug, setUseCustomSlug] = useState(false)
  const [description, setDescription] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [username, setUsername] = useState('')
  const [plan, setPlan] = useState('free')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [sidebar, setSidebar] = useState<{
    counts: { all: number; active: number; completed: number }
    usedBytes: number
    plan: string
    displayLabel: string
    email: string
    initials: string
    stripeConnected: boolean
  } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Portals are created in the current workspace (yours, or your Agency team's)
      const ws = await loadWorkspace(supabase, user.id, readWorkspaceCookie())
      setOwnerId(ws.ownerId)
      const profile = ws.owner
      const me = ws.me
      if (profile?.username) setUsername(profile.username)
      if (profile?.plan) setPlan(profile.plan)

      // Sidebar data
      const { data: allPortals } = await supabase
        .from('portals')
        .select('invoice_amount, invoice_paid')
        .eq('user_id', ws.ownerId)
      const all = allPortals || []
      const { data: storageData } = await supabase.rpc('get_user_storage_bytes', { user_uuid: ws.ownerId })
      const label = me?.business_name || me?.full_name || 'Your'
      const init = (() => {
        const base = me?.business_name || me?.full_name
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
        stripeConnected: me?.stripe_onboarding_complete === true,
      })

      setProfileLoading(false)
    }
    getProfile()
  }, [])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    const generated = generateRandomSlug(val)
    setSlug(generated)
    if (!useCustomSlug) {
      setCustomSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const workspaceOwner = ownerId || user.id

    if (plan === 'free') {
      const { count } = await supabase
        .from('portals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', workspaceOwner)
      if (count !== null && count >= 3) {
        setError('Free plan is limited to 3 portals. Upgrade to Pro for unlimited portals.')
        setLoading(false)
        return
      }
    }

    const finalSlug = isPro && useCustomSlug && customSlug ? customSlug : slug

    const password = isPro ? portalPassword.trim() : ''
    const { data: created, error } = await supabase.from('portals').insert({
      user_id: workspaceOwner,
      name,
      slug: finalSlug,
      description: description || null,
      owner_username: username,
      invoice_amount: invoiceAmount ? parseFloat(invoiceAmount) : null,
      password_protected: !!password,
    }).select('id').single()
    if (error || !created) { setError(error?.message || 'Could not create the portal. Please try again.'); setLoading(false); return }
    // The password goes in a private table only the owner and team can read
    if (password) {
      const { error: pwError } = await supabase.from('portal_passwords').insert({ portal_id: created.id, user_id: workspaceOwner, password })
      if (pwError) {
        await supabase.from('portals').delete().eq('id', created.id)
        setError('Could not save the portal password. Please try again.'); setLoading(false); return
      }
    }
    router.push('/dashboard')
  }

  const isPro = plan === 'pro' || plan === 'agency'

  if (profileLoading) return (
    <main className="min-h-screen bg-ink flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
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
        <div className="max-w-xl mx-auto">
          {/* Back button — clean arrow */}
          <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-faint hover:text-paper mb-6 group w-fit">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to dashboard
          </a>

          <h1 className="text-2xl font-bold mb-2 tracking-tight">Create a new portal</h1>
          <p className="text-muted text-sm mb-8">Your client will see this page when you share the link</p>

          <form onSubmit={handleSubmit} className="bg-ink-2 border border-rule rounded-xl p-8 flex flex-col gap-5">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
                {error.includes('Upgrade') && (
                  <a href="/pricing" className="block mt-1 text-accent-text hover:underline font-semibold">Upgrade to Pro →</a>
                )}
              </div>
            )}

            <div>
              <label className="text-sm text-muted mb-1.5 block">Client / Project name</label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                required
                className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                placeholder="e.g. Harbor Coffee — Brand refresh"
              />
            </div>

            {/* Link: shown as a quiet preview; Pro users can customize it */}
            <div className="-mt-1">
              {isPro && useCustomSlug ? (
                <>
                  <label htmlFor="custom-slug" className="text-sm text-muted mb-1.5 block">Custom link</label>
                  <div className="flex items-center bg-ink border border-rule-2 rounded-lg px-4 py-3 focus-within:border-accent">
                    <span className="text-faint text-sm">{username ? `voxabase.com/${username}/` : 'voxabase.com/...'}</span>
                    <input
                      id="custom-slug"
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 min-w-0 bg-transparent text-paper placeholder:text-faint focus:outline-none text-sm"
                      placeholder="brand-refresh"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-faint">Lowercase letters, numbers, and hyphens</p>
                    <button type="button" onClick={() => setUseCustomSlug(false)} className="text-xs text-muted hover:text-paper">Use automatic link</button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-faint flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Link: <span className="text-muted">{username ? `voxabase.com/${username}/` : 'voxabase.com/…/'}{slug}</span>{!slug && <span className="italic"> (made from the name)</span>}</span>
                  {isPro ? (
                    <button type="button" onClick={() => setUseCustomSlug(true)} className="text-accent-text hover:underline font-medium">Customize link</button>
                  ) : (
                    <span>· Custom links on <a href="/pricing" className="text-accent-text hover:underline">Pro</a></span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-muted mb-1.5 block">Description <span className="text-faint">(optional)</span></label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                placeholder="A short note your client will see"
              />
            </div>

            <div>
              <label className="text-sm text-muted mb-1.5 block">Invoice amount <span className="text-faint">(optional)</span></label>
              <div className="flex items-center bg-ink border border-rule-2 rounded-lg px-4 py-3 focus-within:border-accent">
                <span className="text-faint text-sm mr-1">$</span>
                <input
                  type="number"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(e.target.value)}
                  className="flex-1 bg-transparent text-paper placeholder:text-faint focus:outline-none text-sm"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted mb-1.5 block">
                Portal password <span className="text-faint">(optional)</span>
                {!isPro && <span className="ml-2 text-xs bg-accent-soft text-accent-text border border-accent/30 px-2 py-0.5 rounded-full">Pro</span>}
              </label>
              {isPro ? (
                <>
                  <input
                    type="text"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                    placeholder="Leave blank for no password"
                  />
                  <p className="text-xs text-faint mt-1">Clients must enter this password to view the portal</p>
                </>
              ) : (
                <div className="bg-ink border border-rule-2 rounded-lg px-4 py-3 opacity-50 cursor-not-allowed flex items-center justify-between">
                  <span className="text-faint text-sm">Upgrade to Pro to enable password protection</span>
                  <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !name}
              className="w-full bg-paper hover:bg-white text-ink font-semibold py-2.5 rounded-lg disabled:opacity-50 mt-2 text-sm"
            >
              {loading ? 'Creating...' : 'Create portal'}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  )
}