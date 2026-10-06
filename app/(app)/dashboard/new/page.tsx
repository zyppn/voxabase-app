'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useCrumbs, useWorkspace } from '../../WorkspaceProvider'
import { APP_HOST } from '@/lib/appHost'
import Link from 'next/link'
import Switch from '@/app/_components/Switch'
import { cleanAmountInput, invoiceAmountError } from '@/lib/invoice'

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
  const [lockUntilPaid, setLockUntilPaid] = useState(false)
  const [portalPassword, setPortalPassword] = useState('')
  // Description and password are tucked under "More options"
  const [moreOpen, setMoreOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Portals are created in the current workspace (yours, or your Agency team's)
  const { ws, refresh } = useWorkspace()
  useCrumbs(['New portal'])
  const ownerId = ws.ownerId
  // Created in the Team workspace → shared with the team
  const inTeam = ws.shared === true
  const username = ws.owner?.username || ''
  const plan = ws.owner?.plan || 'free'

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
    if (invoiceAmountError(invoiceAmount)) return
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const workspaceOwner = ownerId || user.id

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
      team_shared: inTeam,
      ...(lockUntilPaid && Number(invoiceAmount) > 0 ? { lock_until_paid: true } : {}),
    }).select('id').single()
    if (error || !created) { setError('Couldn’t create the portal. Please try again.'); setLoading(false); return }
    // The password goes in a private table only the owner and team can read
    if (password) {
      const { error: pwError } = await supabase.from('portal_passwords').insert({ portal_id: created.id, user_id: workspaceOwner, password })
      if (pwError) {
        await supabase.from('portals').delete().eq('id', created.id)
        setError('Could not save the portal password. Please try again.'); setLoading(false); return
      }
    }
    // Show it in the list (and the sidebar counts) straight away, then open it
    // so the next step, adding files, is right there
    await refresh()
    router.push(`/dashboard/portal/${created.id}`)
  }

  const isPro = plan === 'pro' || plan === 'agency'
  const invoiceError = invoiceAmountError(invoiceAmount)

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-2 tracking-tight">Create a new portal</h1>
          <p className="text-muted text-sm mb-8">Name it, add your files, then share the link with your client</p>

          <form onSubmit={handleSubmit} className="border border-rule bg-card rounded-xl p-8 flex flex-col gap-5">
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
                {error.includes('Upgrade') && (
                  <Link href="/pricing" className="block mt-1 text-accent-text hover:underline font-semibold">Upgrade to Pro →</Link>
                )}
              </div>
            )}

            <div>
              <label htmlFor="portal-name" className="text-sm text-muted mb-1.5 block">Client or project name</label>
              <input id="portal-name"
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
                    <span className="text-faint text-sm">{username ? `${APP_HOST}/${username}/` : `${APP_HOST}/...`}</span>
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
                  <span>Link: <span className="text-muted">{username ? `${APP_HOST}/${username}/` : `${APP_HOST}/…/`}{slug}</span>{!slug && <span className="italic"> (made from the name)</span>}</span>
                  {isPro ? (
                    <button type="button" onClick={() => setUseCustomSlug(true)} className="text-accent-text hover:underline font-medium">Customize link</button>
                  ) : (
                    <span>· Custom links on <Link href="/pricing" className="text-accent-text hover:underline">Pro</Link></span>
                  )}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="portal-invoice" className="text-sm text-muted mb-1.5 block">Invoice amount <span className="text-faint">(optional)</span></label>
              <div className={`flex items-center bg-ink border rounded-lg px-3.5 py-2.5 ${invoiceError ? 'border-red-400/60 focus-within:border-red-400' : 'border-rule-2 focus-within:border-accent'}`}>
                <span className="text-faint text-sm mr-1">$</span>
                <input id="portal-invoice"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(v => cleanAmountInput(e.target.value, v))}
                  aria-invalid={!!invoiceError}
                  aria-describedby={invoiceError ? 'portal-invoice-error' : undefined}
                  className="flex-1 min-w-0 bg-transparent text-paper placeholder:text-faint focus:outline-none text-sm"
                  placeholder="0.00"
                />
              </div>
              {invoiceError && <p id="portal-invoice-error" role="alert" className="text-xs text-red-400 mt-1.5">{invoiceError}</p>}
            </div>

            {/* Files unlock after payment */}
            {Number(invoiceAmount) > 0 && !invoiceError && (
              <div className="-mt-1 flex items-center gap-4 rounded-lg border border-rule px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p id="lock-label" className="text-sm text-paper">Lock files until paid</p>
                  <p className="text-xs text-faint mt-0.5">
                    {lockUntilPaid ? 'Your client sees the file list and can download once they pay.' : 'Your client can download before paying.'}
                  </p>
                </div>
                <Switch on={lockUntilPaid} labelledBy="lock-label" onClick={() => setLockUntilPaid(v => !v)} />
              </div>
            )}

            {/* Optional extras: also editable later from the portal */}
            <div className="border-t border-rule pt-4">
              <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} aria-controls="more-options"
                className="flex w-full items-center justify-between text-sm text-muted hover:text-paper">
                <span>More options <span className="text-faint">· description, password</span></span>
                <svg className={`h-4 w-4 transition-transform ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {moreOpen && (
                <div id="more-options" className="mt-4 flex flex-col gap-5">
                  <div>
                    <label htmlFor="portal-description" className="text-sm text-muted mb-1.5 block">Description</label>
                    <input id="portal-description"
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                      placeholder="A short note your client will see"
                    />
                  </div>

                  <div>
                    <label htmlFor="portal-password" className="text-sm text-muted mb-1.5 block">
                      Password
                      {!isPro && <span className="ml-2 text-xs bg-accent-soft text-accent-text border border-accent/30 px-2 py-0.5 rounded-full">Pro</span>}
                    </label>
                    {isPro ? (
                      <>
                        <input id="portal-password"
                          type="text"
                          value={portalPassword}
                          onChange={(e) => setPortalPassword(e.target.value)}
                          className="w-full bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper placeholder:text-faint focus:outline-none focus:border-accent text-sm"
                          placeholder="Leave blank for no password"
                          aria-describedby="portal-password-hint"
                        />
                        <p id="portal-password-hint" className="text-xs text-faint mt-1.5">Clients enter this to open the portal</p>
                      </>
                    ) : (
                      <div className="bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 opacity-50 cursor-not-allowed flex items-center justify-between">
                        <span className="text-faint text-sm">Upgrade to Pro to add a password</span>
                        <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !name || !!invoiceError}
              className="w-full bg-paper hover:bg-paper-hover text-ink font-semibold py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Creating…' : 'Create portal'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}