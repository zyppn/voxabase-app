'use client'
// Password screen for a protected portal. The password is checked on the
// server; nothing about the portal's files or invoice reaches the browser
// until it's right.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeliveredVia, PortalBrand } from './PortalView'
import { DEFAULT_BRAND, brandInk, brandLine, brandSurface, textOnBrand } from '@/lib/brand'

interface Props {
  portalId: string
  portalName: string
  displayName: string
  brandColor?: string
  logoUrl?: string | null
  brandDisplay?: string
  brandInitial?: string
  ownerIsPro?: boolean
  whiteLabel?: boolean
}

export default function PortalPasswordGate({
  portalId, portalName, displayName, brandColor = DEFAULT_BRAND, logoUrl = null, brandDisplay = 'both', brandInitial = 'V', ownerIsPro = false, whiteLabel = false,
}: Props) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/portal-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId, password: input }),
      })
      if (res.ok) { router.refresh(); return }
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'That password is not right. Check with the person who sent you this link.')
      setInput('')
    } catch {
      setError('Could not check the password. Check your connection and try again.')
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <PortalBrand ownerIsPro={ownerIsPro} brandDisplay={brandDisplay} logoUrl={logoUrl} displayName={displayName} brandInitial={brandInitial} brandColor={brandColor} centered />
        </div>
        <form onSubmit={handleSubmit} className="rounded-[14px] border border-rule bg-ink-2 p-6">
          <div className="mb-5 flex items-center gap-3.5">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border" style={{ background: brandSurface(brandColor), borderColor: brandLine(brandColor), color: brandInk(brandColor) }}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-paper">{portalName}</h1>
              <p className="text-[13px] text-muted">This portal is private. Enter the password to open it.</p>
            </div>
          </div>
          {error && <p role="alert" className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm text-red-400">{error}</p>}
          <label htmlFor="portal-password" className="mb-1.5 block text-sm font-medium text-muted">Password</label>
          <input
            id="portal-password"
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); if (error) setError('') }}
            required
            autoFocus
            autoComplete="off"
            className="w-full rounded-lg border border-rule-2 bg-ink px-4 py-3 text-sm text-paper placeholder:text-faint transition-colors focus:outline-none focus:border-(--brand)"
            style={{ ['--brand' as string]: brandInk(brandColor), caretColor: brandInk(brandColor) }}
            placeholder="Enter the portal password"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[10px] text-[15px] font-semibold transition hover:brightness-110 disabled:opacity-70"
            style={{ background: brandColor, color: textOnBrand(brandColor) }}
          >
            {busy ? 'Checking…' : 'Open portal'}
          </button>
        </form>
        {!whiteLabel && <DeliveredVia />}
      </div>
    </div>
  )
}
