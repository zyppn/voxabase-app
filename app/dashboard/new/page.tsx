'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, plan')
        .eq('id', user.id)
        .single()
      if (profile?.username) setUsername(profile.username)
      if (profile?.plan) setPlan(profile.plan)
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

    // Check portal limit for free plan
    if (plan === 'free') {
      const { count } = await supabase
        .from('portals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      if (count !== null && count >= 3) {
        setError('Free plan is limited to 3 portals. Upgrade to Pro for unlimited portals.')
        setLoading(false)
        return
      }
    }

    const finalSlug = isPro && useCustomSlug && customSlug ? customSlug : slug

    const { error } = await supabase.from('portals').insert({
      user_id: user.id,
      name,
      slug: finalSlug,
      description: description || null,
      owner_username: username,
      invoice_amount: invoiceAmount ? parseFloat(invoiceAmount) : null,
      portal_password: isPro ? (portalPassword || null) : null,
    })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

  const isPro = plan === 'pro' || plan === 'agency'

  if (profileLoading) return (
    <main className="min-h-screen bg-[#090909] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#8b3cf7] border-t-transparent rounded-full animate-spin" />
    </main>
  )

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <nav className="border-b border-[#1e1e24] px-8 py-4 flex items-center justify-between">
        <img src="/vblogo.png" alt="VoxaBase" className="h-7 w-auto" />
        <a href="/dashboard" className="text-gray-400 text-sm hover:text-white transition-colors">Back to dashboard</a>
      </nav>

      <div className="max-w-xl mx-auto px-8 py-12">
        <h1 className="text-2xl font-bold mb-2">Create a new portal</h1>
        <p className="text-gray-400 text-sm mb-8">Your client will see this page when you share the link</p>

        <form onSubmit={handleSubmit} className="bg-[#111114] border border-[#1e1e24] rounded-xl p-8 flex flex-col gap-5">
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {error}
              {error.includes('Upgrade') && (
                <a href="/pricing" className="block mt-1 text-[#8b3cf7] hover:underline font-semibold">Upgrade to Pro →</a>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Client / Project name</label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              required
              className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
              placeholder="e.g. Nike Campaign, Sarah Johnson"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-400">Portal URL</label>
              {isPro && (
                <button
                  type="button"
                  onClick={() => setUseCustomSlug(!useCustomSlug)}
                  className="text-xs text-[#8b3cf7] hover:underline font-semibold"
                >
                  {useCustomSlug ? 'Use random URL instead' : 'Set custom URL'}
                </button>
              )}
              {!isPro && (
                <span className="text-xs bg-[#1a0d30] text-[#8b3cf7] border border-[#8b3cf7]/30 px-2 py-0.5 rounded-full">Free plan</span>
              )}
            </div>

            {isPro && useCustomSlug ? (
              <>
                <div className="flex items-center bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 focus-within:border-[#8b3cf7]">
                  <span className="text-gray-600 text-sm">{username ? `voxabase.com/${username}/` : 'voxabase.com/...'}</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none text-sm"
                    placeholder="my-custom-url"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Lowercase letters, numbers, and hyphens only</p>
              </>
            ) : (
              <>
                <div className="flex items-center bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 opacity-60 cursor-not-allowed">
                  <span className="text-gray-600 text-sm">{username ? `voxabase.com/${username}/` : 'voxabase.com/...'}</span>
                  <span className="text-gray-400 text-sm">{slug || 'auto-generated'}</span>
                </div>
                {isPro && (
                  <p className="text-xs text-gray-600 mt-1">Random URL — click "Set custom URL" above to customize</p>
                )}
                {!isPro && (
                  <p className="text-xs text-gray-600 mt-1">
                    Custom slugs available on <span className="text-[#8b3cf7]">Pro plan</span>
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Description <span className="text-gray-600">(optional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
              placeholder="A short note your client will see"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Invoice amount <span className="text-gray-600">(optional)</span></label>
            <div className="flex items-center bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 focus-within:border-[#8b3cf7]">
              <span className="text-gray-600 text-sm mr-1">$</span>
              <input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none text-sm"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">
              Portal password <span className="text-gray-600">(optional)</span>
              {!isPro && <span className="ml-2 text-xs bg-[#1a0d30] text-[#8b3cf7] border border-[#8b3cf7]/30 px-2 py-0.5 rounded-full">Pro</span>}
            </label>
            {isPro ? (
              <>
                <input
                  type="text"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  className="w-full bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#8b3cf7] text-sm"
                  placeholder="Leave blank for no password"
                />
                <p className="text-xs text-gray-600 mt-1">Clients must enter this password to view the portal</p>
              </>
            ) : (
              <div className="bg-[#090909] border border-[#1e1e24] rounded-lg px-4 py-3 opacity-50 cursor-not-allowed flex items-center justify-between">
                <span className="text-gray-600 text-sm">Upgrade to Pro to enable password protection</span>
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !name}
            className="w-full bg-[#8b3cf7] hover:bg-[#9d55f8] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 mt-2 text-sm"
          >
            {loading ? 'Creating...' : 'Create portal'}
          </button>
        </form>
      </div>
    </main>
  )
}