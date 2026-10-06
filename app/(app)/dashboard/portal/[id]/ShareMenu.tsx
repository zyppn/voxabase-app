'use client'
// Share the client link from your own email or apps. Phones get the system
// share sheet (Messages, WhatsApp, the Gmail and Outlook apps); computers get
// a menu that opens a ready-made message in Gmail, Outlook (web) or the
// default mail app, or copies it. Nothing is sent by Voxabase.
import { useState } from 'react'

type Via = 'gmail' | 'outlook' | 'office' | 'mail' | 'copy'
const LAST_KEY = 'vb_share_via'

const OPTIONS: { id: Via; label: string; hint?: string }[] = [
  { id: 'gmail', label: 'Gmail' },
  { id: 'outlook', label: 'Outlook', hint: 'Outlook.com' },
  { id: 'office', label: 'Outlook for work', hint: 'Microsoft 365' },
  { id: 'mail', label: 'Other email app' },
  { id: 'copy', label: 'Copy message' },
]

export default function ShareMenu({ subject, body, onShared }: {
  subject: string
  /** The whole message, link included */
  body: string
  /** Called after any way of sharing (counts as sending the link) */
  onShared?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  // Outlook sometimes drops the message (for example after its sign-in
  // page), so the message is copied too and this note says to paste it
  const [pasteNote, setPasteNote] = useState(false)
  // Shown only after the portal has loaded in the browser, so storage is there
  const [last, setLast] = useState<Via | null>(() => {
    try { return typeof window === 'undefined' ? null : (localStorage.getItem(LAST_KEY) as Via | null) } catch { return null }
  })

  // The way you shared last time comes first
  const options = last ? [...OPTIONS].sort((a, b) => (a.id === last ? -1 : b.id === last ? 1 : 0)) : OPTIONS

  const share = async (via: Via) => {
    setOpen(false)
    try { localStorage.setItem(LAST_KEY, via) } catch {}
    setLast(via)
    const s = encodeURIComponent(subject), b = encodeURIComponent(body)
    const urls: Record<Exclude<Via, 'copy'>, string> = {
      // Without fs=1 the message opens in Gmail’s usual layout, not a bare page
      gmail: `https://mail.google.com/mail/?view=cm&su=${s}&body=${b}`,
      // The older "owa" form keeps the message through Outlook's sign-in more reliably
      outlook: `https://outlook.live.com/owa/?path=/mail/action/compose&subject=${s}&body=${b}`,
      office: `https://outlook.office.com/owa/?path=/mail/action/compose&subject=${s}&body=${b}`,
      mail: `mailto:?subject=${s}&body=${b}`,
    }
    if (via === 'copy') {
      try { await navigator.clipboard.writeText(body) } catch { return }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (via === 'mail') {
      window.location.assign(urls.mail)
    } else {
      if (via === 'outlook' || via === 'office') {
        // Started before the new tab opens, while this page still has focus
        navigator.clipboard?.writeText(body).then(() => {
          setPasteNote(true)
          setTimeout(() => setPasteNote(false), 12000)
        }).catch(() => {})
      }
      window.open(urls[via], '_blank', 'noopener')
    }
    onShared?.()
  }

  const onClick = async () => {
    // Phones and tablets: the system share sheet already lists every app
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: subject, text: body })
        onShared?.()
      } catch { /* closed without sharing */ }
      return
    }
    setOpen(o => !o)
  }

  return (
    <div className="relative">
      <button type="button" onClick={onClick} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-paper hover:underline underline-offset-2">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        {copied ? 'Message copied' : 'Share'}
      </button>
      {pasteNote && !open && (
        <div role="status" className="absolute right-0 top-full mt-1.5 z-30 w-64 bg-ink-2 border border-rule-2 rounded-xl px-3.5 py-3 shadow-xl shadow-black/40 text-xs leading-relaxed text-muted">
          <p className="font-medium text-paper mb-0.5">Message copied</p>
          If Outlook opens without it, start a new email there and paste it in.
          <button type="button" onClick={() => setPasteNote(false)} className="block mt-2 font-medium text-paper hover:underline underline-offset-2">Got it</button>
        </div>
      )}
      {open && (
        <>
          <button aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute right-0 top-full mt-1.5 z-30 w-64 bg-ink-2 border border-rule-2 rounded-xl p-1.5 shadow-xl shadow-black/40">
            <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-faint">Send the link with a ready-made message</p>
            {options.map(o => (
              <button key={o.id} role="menuitem" onClick={() => share(o.id)}
                className="w-full flex items-center justify-between gap-3 text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">
                <span>{o.label}</span>
                {o.hint && <span className="text-[11px] text-faint whitespace-nowrap">{o.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
