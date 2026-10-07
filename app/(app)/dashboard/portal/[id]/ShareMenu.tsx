'use client'
// Share the client link from your own email or apps. Phones get the system
// share sheet (Messages, WhatsApp, the Gmail and Outlook apps); computers get
// a menu that opens a ready-made message in Gmail, Outlook (web) or the
// default mail app, or copies it. Nothing is sent by Voxabase.
import { useState } from 'react'

type Via = 'gmail' | 'outlook' | 'mail' | 'copy'
const LAST_KEY = 'vb_share_via'

// Each option's icon: the service's own logo for Gmail and Outlook (as they
// look in a browser), plain icons for the rest
const ICONS: Record<Via, React.ReactNode> = {
  gmail: (
    <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
      <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75V40h7a3 3 0 003-3V16.2z" />
      <path fill="#1e88e5" d="M3 16.2l3.61 1.71L13 23.7V40H6a3 3 0 01-3-3V16.2z" />
      <path fill="#e53935" d="M35 11.2l-11 8.25-11-8.25-1 5.8 1 6.7 11 8.25 11-8.25 1-6.7z" />
      <path fill="#c62828" d="M3 12.3v3.9l10 7.5V11.2L9.88 8.86A4.3 4.3 0 003 12.3z" />
      <path fill="#fbc02d" d="M45 12.3v3.9l-10 7.5V11.2l3.12-2.34A4.3 4.3 0 0145 12.3z" />
    </svg>
  ),
  outlook: (
    <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
      <path fill="#1e88e5" d="M20 10h22a2 2 0 012 2v24a2 2 0 01-2 2H20z" />
      <path fill="#90caf9" d="M44 14L30 24 20 17v-5z" />
      <path fill="#0d47a1" d="M27 39H6a2 2 0 01-2-2V11a2 2 0 012-2h21a2 2 0 012 2v26a2 2 0 01-2 2z" />
      <path fill="#fff" d="M16.5 15C12.4 15 10 18.6 10 24s2.4 9 6.5 9 6.5-3.6 6.5-9-2.4-9-6.5-9zm0 14.6c-1.9 0-3-2.2-3-5.6s1.1-5.6 3-5.6 3 2.2 3 5.6-1.1 5.6-3 5.6z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.24a2.25 2.25 0 01-1.07 1.92l-7.5 4.61a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.92V6.75" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.38c0 .62-.5 1.12-1.12 1.12h-9.75c-.63 0-1.13-.5-1.13-1.12V7.88c0-.63.5-1.13 1.13-1.13H6.75m9 10.5h3.38c.62 0 1.12-.5 1.12-1.12V11.25c0-4.46-3.24-8.16-7.5-8.88a9 9 0 00-1.5-.12H9.38c-.63 0-1.13.5-1.13 1.13v3.5m7.5 10.37H9.38c-.63 0-1.13-.5-1.13-1.12v-9.25m12 6.62v-1.87a3.38 3.38 0 00-3.38-3.38h-1.5c-.62 0-1.12-.5-1.12-1.12v-1.5a3.38 3.38 0 00-3.38-3.38H9.75" />
    </svg>
  ),
}

const OPTIONS: { id: Via; label: string; hint?: string }[] = [
  { id: 'gmail', label: 'Gmail' },
  { id: 'outlook', label: 'Outlook' },
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
    try {
      if (typeof window === 'undefined') return null
      const v = localStorage.getItem(LAST_KEY)
      // The two Outlook options used to be separate
      return (v === 'office' ? 'outlook' : v) as Via | null
    } catch { return null }
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
      // Outlook on the web for work and school accounts (Microsoft 365), where
      // most businesses' email is. The older "owa" form keeps the message
      // through sign-in more reliably. Personal Outlook.com accounts land in
      // their inbox instead, so the message is also copied (below) to paste.
      outlook: `https://outlook.office.com/owa/?path=/mail/action/compose&subject=${s}&body=${b}`,
      mail: `mailto:?subject=${s}&body=${b}`,
    }
    if (via === 'copy') {
      try { await navigator.clipboard.writeText(body) } catch { return }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (via === 'mail') {
      window.location.assign(urls.mail)
    } else {
      if (via === 'outlook') {
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
                className="w-full flex items-center gap-3 text-left text-sm text-paper hover:bg-ink-3 rounded-lg px-3 py-2">
                <span className="flex-none w-4 h-4 grid place-items-center">{ICONS[o.id]}</span>
                <span className="flex-1">{o.label}</span>
                {o.hint && <span className="text-[11px] text-faint whitespace-nowrap">{o.hint}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
