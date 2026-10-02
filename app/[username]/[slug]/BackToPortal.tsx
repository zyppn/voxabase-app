'use client'
// "Back to portal" on the owner's client-view note. Preview opens the client
// view in the same tab, so when you came from the portal page this simply goes
// back (keeping history tidy: Back won't bounce you to the preview again).
// Reached any other way, it's an ordinary link.
import type { ReactNode } from 'react'

export default function BackToPortal({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let Cmd/Ctrl/Shift-click open a new tab or window as usual
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    try {
      const from = document.referrer ? new URL(document.referrer) : null
      if (from && from.origin === window.location.origin && from.pathname === href && window.history.length > 1) {
        e.preventDefault()
        window.history.back()
      }
    } catch { /* plain link */ }
  }
  return <a href={href} onClick={onClick} className={className}>{children}</a>
}
