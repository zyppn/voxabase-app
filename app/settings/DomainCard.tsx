'use client'
// White-label portal domain (Agency): connect files.yourstudio.com, see the DNS
// record to add, and watch it go live.
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Rec = { type: string; name: string; value: string; purpose: 'point' | 'verify' }
type State = { available: boolean; domain?: string | null; live?: boolean; records?: Rec[] }

export default function DomainCard({ plan }: { plan: string }) {
  const isAgency = plan === 'agency'
  const [state, setState] = useState<State | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState<'' | 'connect' | 'check' | 'remove'>('')
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/domains').then(async (r) => {
      const data = await r.json().catch(() => null)
      if (active) setState(r.ok && data ? data : { available: false })
    }).catch(() => active && setState({ available: false }))
    return () => { active = false }
  }, [])

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy('connect'); setError('')
    const r = await fetch('/api/domains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: input }) })
    const data = await r.json().catch(() => ({}))
    setBusy('')
    if (!r.ok) { setError(data.error || 'Could not connect that domain. Please try again.'); return }
    setState(data); setInput('')
  }

  const check = async () => {
    setBusy('check'); setError('')
    const r = await fetch('/api/domains')
    const data = await r.json().catch(() => null)
    setBusy('')
    if (r.ok && data) setState(data); else setError('Could not check the domain. Please try again.')
  }

  const remove = async () => {
    setBusy('remove'); setError('')
    const r = await fetch('/api/domains', { method: 'DELETE' })
    setBusy(''); setConfirmRemove(false)
    if (!r.ok) { setError('Could not remove the domain. Please try again.'); return }
    setState((s) => ({ available: s?.available ?? true, domain: null, live: false, records: [] }))
  }

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text) } catch { return }
    setCopied(key); setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1600)
  }

  const domain = state?.domain || null
  const apex = domain ? domain.split('.').slice(-2).join('.') : ''

  return (
    <div className="mt-5 bg-ink-2 border border-rule rounded-xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h2 className="font-semibold text-paper flex items-center gap-2">
          Portal domain
          {!isAgency && <span className="text-[11px] font-semibold text-accent-text border border-accent/30 bg-accent-soft px-2 py-0.5 rounded-full">Agency</span>}
        </h2>
        {isAgency && domain && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${state?.live ? 'bg-green-400' : 'bg-amber-400'}`} />
            {state?.live ? 'Live' : 'Waiting for DNS'}
          </span>
        )}
      </div>

      {!isAgency ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">Send clients to portals on your own domain, like files.yourstudio.com, with no Voxabase branding.</p>
          <Link href="/pricing" className="text-sm text-muted hover:text-paper border border-rule-2 hover:border-rule-3 px-3.5 py-2 rounded-lg">See Agency</Link>
        </div>
      ) : state === null ? (
        <div className="h-10 mt-3 rounded-lg bg-ink-3/60 animate-pulse" />
      ) : !state.available ? (
        <p className="text-sm text-muted">Custom domains are almost ready. Check back soon.</p>
      ) : !domain ? (
        <>
          <p className="text-sm text-muted mb-4 max-w-2xl">
            Send clients to portals on your own domain, with no Voxabase branding. Use a subdomain you own, like <span className="text-paper">files.yourstudio.com</span>.{' '}
            <Link href="/docs/custom-domain" className="text-paper underline underline-offset-2">Setup guide</Link>
          </p>
          {error && <div role="alert" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-4">{error}</div>}
          <form onSubmit={connect} className="flex flex-col sm:flex-row gap-2.5">
            <label htmlFor="custom-domain" className="sr-only">Your domain</label>
            <input id="custom-domain" value={input} onChange={(e) => { setInput(e.target.value); if (error) setError('') }}
              placeholder="files.yourstudio.com" autoComplete="off" autoCapitalize="none" spellCheck={false}
              className="flex-1 bg-ink border border-rule-2 rounded-lg px-3.5 py-2.5 text-paper text-sm placeholder:text-faint focus:outline-none focus:border-accent" />
            <button type="submit" disabled={!!busy || !input.trim()}
              className="bg-paper hover:bg-white text-ink font-semibold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50">
              {busy === 'connect' ? 'Connecting…' : 'Connect domain'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm text-paper font-medium mt-1">{domain}</p>
          {state.live ? (
            <p className="text-sm text-muted mt-1">
              Your portals open at <span className="text-paper">https://{domain}/</span><span className="text-faint">your-portal</span>. Share links in the app use this domain now.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted mt-1 mb-4 max-w-2xl">
                Add {state.records && state.records.length > 1 ? 'these records' : 'this record'} where you manage DNS for <span className="text-paper">{apex}</span> (for example GoDaddy, Namecheap, Squarespace or Cloudflare). It usually goes live within minutes, but can take up to 48 hours.
              </p>
              {state.records && state.records.length > 0 && (
                <div className="border border-rule rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-faint border-b border-rule">
                        <th className="font-semibold px-4 py-2.5">Type</th>
                        <th className="font-semibold px-4 py-2.5">Name</th>
                        <th className="font-semibold px-4 py-2.5">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {state.records.map((r, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-paper font-medium">{r.type}</td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => copy(`n${i}`, r.name)} className="font-mono text-[13px] text-paper hover:underline" title="Copy">
                              {r.name}
                            </button>
                            {copied === `n${i}` && <span className="ml-2 text-xs text-green-400">Copied</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => copy(`v${i}`, r.value)} className="font-mono text-[13px] text-paper hover:underline break-all text-left" title="Copy">
                              {r.value}
                            </button>
                            {copied === `v${i}` && <span className="ml-2 text-xs text-green-400">Copied</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-faint mt-2.5">Click a name or value to copy it. Using Cloudflare? Set the record to “DNS only” (grey cloud). <Link href="/docs/custom-domain" className="text-muted underline underline-offset-2 hover:text-paper">Step-by-step guide</Link></p>
            </>
          )}

          {error && <div role="alert" className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3 mt-4">{error}</div>}

          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            {!state.live && (
              <button onClick={check} disabled={!!busy}
                className="bg-paper hover:bg-white text-ink font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                {busy === 'check' ? 'Checking…' : 'Check again'}
              </button>
            )}
            {confirmRemove ? (
              <>
                <span className="text-sm text-muted">Disconnect {domain}? Links using it will stop working.</span>
                <button onClick={remove} disabled={!!busy} className="text-sm font-semibold text-red-400 hover:bg-red-400/10 border border-red-400/30 px-3.5 py-2 rounded-lg">
                  {busy === 'remove' ? 'Removing…' : 'Disconnect'}
                </button>
                <button onClick={() => setConfirmRemove(false)} className="text-sm text-muted hover:text-paper border border-rule-2 px-3.5 py-2 rounded-lg">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmRemove(true)} className="text-sm text-muted hover:text-red-400 border border-rule-2 hover:border-red-400/30 px-3.5 py-2 rounded-lg">
                Remove domain
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
