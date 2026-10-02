'use client'
// "Back to portal" on the owner's client-view note. Opened from the portal
// page's Preview (a new tab), it closes this tab and returns to the portal page
// that opened it, instead of leaving two tabs open. Visited any other way, it's
// an ordinary link.
import type { ReactNode } from 'react'

export default function BackToPortal({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    let opener: Window | null = null
    try {
      // Only our own app's tab (reading another site's location throws)
      if (window.opener && !window.opener.closed && window.opener.location.origin === window.location.origin) opener = window.opener
    } catch { opener = null }
    if (!opener) return
    e.preventDefault()
    try {
      if (opener.location.pathname !== href) opener.location.assign(href)
      opener.focus()
    } catch { /* still close below */ }
    window.close()
    // If the browser keeps the tab open anyway, go there in this tab
    setTimeout(() => { if (!window.closed) window.location.assign(href) }, 300)
  }
  return <a href={href} onClick={onClick} className={className}>{children}</a>
}
