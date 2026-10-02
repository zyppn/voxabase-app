'use client'
// System / Light / Dark, as three icon buttons. Used in the profile menu and
// in Settings → Appearance; both stay in sync. Saved to the browser and the account.
import { useSyncExternalStore } from 'react'
import { applyTheme, readTheme, saveAccountTheme, THEMES, type Theme } from '@/lib/theme'
import { createClient } from '@/utils/supabase/client'

const subscribe = (cb: () => void) => {
  window.addEventListener('vb-theme', cb)
  return () => window.removeEventListener('vb-theme', cb)
}

const LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' }

function Icon({ theme }: { theme: Theme }) {
  const common = { className: 'h-4 w-4', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24', 'aria-hidden': true } as const
  if (theme === 'light') return <svg {...common}><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></svg>
  if (theme === 'dark') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" /></svg>
  return <svg {...common}><rect x="3" y="4" width="18" height="12" rx="2" /><path strokeLinecap="round" d="M8 20h8M12 16v4" /></svg>
}

/** `labels`: show the words next to the icons (Settings); icons only otherwise */
export default function ThemeSwitch({ labels = false, className = '' }: { labels?: boolean; className?: string }) {
  // null on the server: no option shows as selected until the browser knows
  const theme = useSyncExternalStore(subscribe, readTheme, () => null)
  return (
    <div role="radiogroup" aria-label="Appearance" className={`inline-flex items-center gap-0.5 rounded-full border border-rule-2 bg-ink p-0.5 ${className}`}>
      {THEMES.map(t => {
        const on = theme === t
        return (
          <button key={t} type="button" role="radio" aria-checked={on} title={LABEL[t]} aria-label={labels ? undefined : LABEL[t]}
            onClick={() => { applyTheme(t); saveAccountTheme(createClient(), t) }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full transition-colors ${labels ? 'px-3 py-1.5 text-sm' : 'h-7 w-8'} ${on ? 'bg-ink-3 text-paper shadow-sm' : 'text-faint hover:text-paper'}`}>
            <Icon theme={t} />
            {labels && <span>{LABEL[t]}</span>}
          </button>
        )
      })}
    </div>
  )
}
