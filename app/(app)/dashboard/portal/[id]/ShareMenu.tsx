'use client'
// Share the client link from your own email or apps. Phones get the system
// share sheet (AirDrop, Messages, WhatsApp, the Gmail and Outlook apps);
// computers get a menu that opens a ready-made message in Gmail, Outlook
// (web) or the default mail app, copies it, or (where the browser has one)
// opens the computer's own share sheet. Nothing is sent by Voxabase.
import { useState } from 'react'

type Via = 'gmail' | 'outlook' | 'mail' | 'copy' | 'system'
const LAST_KEY = 'vb_share_via'

// Each option's icon: the service's own logo for Gmail and Outlook, plain
// icons for the rest
const ICONS: Record<Via, React.ReactNode> = {
  // Google's Gmail logo (2020) and Microsoft's Outlook icon, unmodified
  gmail: (
    <svg viewBox="0 0 256 193" className="w-4 h-4" aria-hidden="true">
      <path fill="#4285F4" d="M58.18 192.05V93.14L27.51 65.08L0 49.5v125.09c0 9.66 7.83 17.46 17.45 17.46z" />
      <path fill="#34A853" d="M197.82 192.05h40.73c9.66 0 17.45-7.83 17.45-17.46V49.5l-31.16 17.84l-27.02 25.8z" />
      <path fill="#EA4335" d="m58.18 93.14l-4.17-38.65l4.17-36.99L128 69.87l69.82-52.37l4.67 34.99l-4.67 40.65L128 145.5z" />
      <path fill="#FBBC04" d="M197.82 17.5v75.64L256 49.5V26.23c0-21.59-24.64-33.89-41.89-20.94z" />
      <path fill="#C5221F" d="m0 49.5l26.76 20.07l31.42 23.57V17.5L41.89 5.29C24.61-7.66 0 4.65 0 26.23z" />
    </svg>
  ),
  outlook: (
    <svg viewBox="0 0 32 32" className="w-4 h-4" aria-hidden="true">
      <path fill="#0072c6" d="M19.484 7.937v5.477l1.916 1.205a.5.5 0 0 0 .21 0l8.238-5.554a1.174 1.174 0 0 0-.959-1.128Z" />
      <path fill="#0072c6" d="m19.484 15.457l1.747 1.2a.52.52 0 0 0 .543 0c-.3.181 8.073-5.378 8.073-5.378v10.066a1.408 1.408 0 0 1-1.49 1.555h-8.874zm-9.044-2.525a1.61 1.61 0 0 0-1.42.838a4.13 4.13 0 0 0-.526 2.218A4.05 4.05 0 0 0 9.02 18.2a1.6 1.6 0 0 0 2.771.022a4 4 0 0 0 .515-2.2a4.37 4.37 0 0 0-.5-2.281a1.54 1.54 0 0 0-1.366-.809" />
      <path fill="#0072c6" d="M2.153 5.155v21.427L18.453 30V2Zm10.908 14.336a3.23 3.23 0 0 1-2.7 1.361a3.19 3.19 0 0 1-2.64-1.318A5.46 5.46 0 0 1 6.706 16.1a5.87 5.87 0 0 1 1.036-3.616a3.27 3.27 0 0 1 2.744-1.384a3.12 3.12 0 0 1 2.61 1.321a5.64 5.64 0 0 1 1 3.484a5.76 5.76 0 0 1-1.035 3.586" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.24a2.25 2.25 0 01-1.07 1.92l-7.5 4.61a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.92V6.75" />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
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
  // The computer's share sheet: AirDrop and Messages on a Mac, Nearby
  // Sharing on Windows. Only where the browser offers it.
  { id: 'system', label: 'More options…' },
]

export default function ShareMenu({ subject, body, shortText, url, onShared }: {
  subject: string
  /** The whole message, link included (email) */
  body: string
  /** A short note without the link, for texts and chats: the link goes
   *  last, so Messages and others show it as a preview card */
  shortText: string
  url: string
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

  // The menu is only shown in the browser (after the portal loads), so the
  // share sheet check is safe here
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const available = OPTIONS.filter(o => o.id !== 'system' || canShare)
  // The way you shared last time comes first
  const options = last ? [...available].sort((a, b) => (a.id === last ? -1 : b.id === last ? 1 : 0)) : available

  // The system share sheet: a short note with the link last
  const systemShare = async () => {
    try {
      await navigator.share({ title: subject, text: shortText, url })
      onShared?.()
    } catch { /* closed without sharing */ }
  }

  const share = async (via: Via) => {
    setOpen(false)
    try { localStorage.setItem(LAST_KEY, via) } catch {}
    setLast(via)
    const s = encodeURIComponent(subject), b = encodeURIComponent(body)
    const urls: Record<Exclude<Via, 'copy' | 'system'>, string> = {
      // Without fs=1 the message opens in Gmail’s usual layout, not a bare page
      gmail: `https://mail.google.com/mail/?view=cm&su=${s}&body=${b}`,
      // Outlook on the web for work and school accounts (Microsoft 365), where
      // most businesses' email is. The older "owa" form keeps the message
      // through sign-in more reliably. Personal Outlook.com accounts land in
      // their inbox instead, so the message is also copied (below) to paste.
      outlook: `https://outlook.office.com/owa/?path=/mail/action/compose&subject=${s}&body=${b}`,
      mail: `mailto:?subject=${s}&body=${b}`,
    }
    if (via === 'system') {
      await systemShare()
      return
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
    if (canShare && window.matchMedia('(pointer: coarse)').matches) {
      await systemShare()
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
