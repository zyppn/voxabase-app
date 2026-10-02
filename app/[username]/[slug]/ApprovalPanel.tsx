'use client'
// Client-side approval: approve the delivery, or request changes with a note.
import { useState } from 'react'
import { brandInk, brandLine, brandSurface, textOnBrand, type PortalStyle } from '@/lib/brand'

type Status = 'approved' | 'changes_requested' | null

export default function ApprovalPanel({ portalId, displayName, brandColor, portalStyle = 'dark', initialStatus, initialNote, initialName, initialAt}: {
  portalId: string
  displayName: string
  brandColor: string
  portalStyle?: PortalStyle
  initialStatus: Status
  initialNote: string | null
  initialName: string | null
  initialAt: string | null
}) {
  const [status, setStatus] = useState<Status>(initialStatus)
  const [note, setNote] = useState(initialNote || '')
  const [name, setName] = useState(initialName || '')
  const [at, setAt] = useState(initialAt)
  const [mode, setMode] = useState<'idle' | 'changes'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const send = async (action: 'approve' | 'request_changes') => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/portal-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalId, action, note, name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Could not send your response. Please try again.'); return }
      setStatus(action === 'approve' ? 'approved' : 'changes_requested')
      setAt(data.at || new Date().toISOString())
      setMode('idle'); setEditing(false)
    } catch {
      setError('Could not send your response. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const when = at ? new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  if (status && !editing) {
    const approved = status === 'approved'
    return (
      <section aria-label="Your review" className="mt-4 border-t border-rule px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-paper">
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-green-400' : 'bg-amber-400'}`} />
          {approved ? 'You approved this delivery' : 'You requested changes'}
          {when && <span className="font-normal text-faint">· {when}</span>}
        </p>
        {!approved && note && <p className="mt-2 whitespace-pre-line rounded-lg border border-rule bg-ink px-3 py-2.5 text-[13px] text-muted">{note}</p>}
        <button type="button" onClick={() => { setEditing(true); setMode(approved ? 'changes' : 'idle') }} className="mt-2.5 text-xs text-muted underline-offset-2 hover:text-paper hover:underline">
          {approved ? 'Need changes after all?' : 'Everything fixed? Update your review'}
        </button>
      </section>
    )
  }

  const field = "w-full rounded-lg border border-rule-2 bg-ink px-3.5 py-2.5 text-sm text-paper placeholder:text-faint focus:border-(--brand) focus:outline-none"
  const brandVar = { ['--brand' as string]: brandInk(brandColor, portalStyle) }

  // Compact by default: one row, one click to approve. Name and notes only
  // appear when the client asks for changes, which is when they're useful.
  if (mode !== 'changes') {
    return (
      <section aria-labelledby="review-title" className="mt-4 border-t border-rule px-5 py-3.5">
        {error && <p role="alert" className="mb-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[13px] text-red-400">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 id="review-title" className="text-sm font-semibold text-paper">Everything look right?</h2>
            <p className="text-[13px] text-muted">Let {displayName} know.</p>
          </div>
          <div className="flex flex-none gap-2">
            <button type="button" onClick={() => { setMode('changes'); setError('') }}
              className="flex min-h-10 flex-1 items-center justify-center rounded-[10px] border border-rule-2 px-4 text-sm font-semibold text-paper hover:border-rule-3 sm:flex-none">
              Request changes
            </button>
            <button type="button" disabled={busy} onClick={() => send('approve')}
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border px-4 text-sm font-semibold transition hover:brightness-125 disabled:opacity-50 sm:flex-none"
              style={{ background: brandSurface(brandColor, portalStyle), borderColor: brandLine(brandColor), color: brandInk(brandColor, portalStyle) }}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {busy ? 'Sending…' : 'Approve'}
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="review-title" className="mt-4 border-t border-rule px-5 py-4">
      <h2 id="review-title" className="text-sm font-semibold text-paper">What should change?</h2>
      <p className="mt-0.5 text-[13px] text-muted">{displayName} will see this right away.</p>

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[13px] text-red-400">{error}</p>}

      <label htmlFor="review-note" className="sr-only">What should change?</label>
      <textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} autoFocus
        className={`mt-3 resize-y ${field}`} style={brandVar} placeholder="Be as specific as you can, e.g. which file and what to adjust" />
      <label htmlFor="review-name" className="sr-only">Your name (optional)</label>
      <input id="review-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name"
        className={`mt-2 ${field}`} style={brandVar} placeholder="Your name (optional)" />

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { setError(''); if (editing && status === 'approved') setEditing(false); else setMode('idle') }}
          className="flex min-h-10 items-center justify-center rounded-[10px] border border-rule-2 px-4 text-sm text-muted hover:text-paper">
          Back
        </button>
        <button type="button" disabled={busy || !note.trim()} onClick={() => send('request_changes')}
          className="flex min-h-10 flex-1 items-center justify-center rounded-[10px] text-sm font-semibold disabled:opacity-50"
          style={{ background: brandColor, color: textOnBrand(brandColor) }}>
          {busy ? 'Sending…' : 'Send change request'}
        </button>
      </div>
    </section>
  )
}
