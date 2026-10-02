'use client'
// "Get started" checklist for new accounts, floating in the bottom-right corner so
// it never pushes the dashboard down. Steps tick themselves off from real account
// data; it can be minimized to a small pill, and disappears when everything is
// done or the user closes it.
import { useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'

const HIDE_KEY = 'vb_onboarding_hidden'
const MIN_KEY = 'vb_onboarding_minimized'
export const LINK_COPIED_KEY = 'vb_link_copied'

type Props = {
  hasPortal: boolean
  hasFiles: boolean
  stripeConnected: boolean
  linkShared: boolean
  latestPortalId: string | null
  /** Shown instead once the checklist is hidden (e.g. the Stripe reminder) */
  fallback?: ReactNode
}

function read(key: string) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => { listeners.add(fn); window.addEventListener('storage', fn); return () => { listeners.delete(fn); window.removeEventListener('storage', fn) } }

/** Ticks off "Send the link" wherever a portal link gets copied */
export function markLinkCopied() {
  try { localStorage.setItem(LINK_COPIED_KEY, '1') } catch { /* ignore */ }
  listeners.forEach((fn) => fn())
}

export default function OnboardingChecklist({ hasPortal, hasFiles, stripeConnected, linkShared, latestPortalId, fallback = null }: Props) {
  // 'ssr' until the browser can tell us whether it was hidden or a link was copied
  const hidden = useSyncExternalStore(subscribe, () => (read(HIDE_KEY) ? 'yes' : 'no'), () => 'ssr')
  const copied = useSyncExternalStore(subscribe, () => read(LINK_COPIED_KEY), () => false)
  // Minimized unless opened; phones start minimized since the panel would cover the list
  const minimized = useSyncExternalStore(subscribe, () => {
    try {
      const v = localStorage.getItem(MIN_KEY)
      return v === null ? window.innerWidth < 640 : v === '1'
    } catch { return false }
  }, () => false)
  if (hidden === 'ssr') return null
  if (hidden === 'yes') return <>{fallback}</>

  const portalHref = latestPortalId ? `/dashboard/portal/${latestPortalId}` : '/dashboard/new'
  const steps = [
    { done: hasPortal, title: 'Create your first portal', text: 'Name your client and project.', href: '/dashboard/new', cta: 'Create portal' },
    { done: hasFiles, title: 'Upload your files', text: 'Add the deliverables your client will download.', href: portalHref, cta: 'Upload files' },
    { done: stripeConnected, title: 'Connect Stripe to get paid', text: 'Needed before clients can pay an invoice.', href: '/stripe-setup', cta: 'Connect Stripe' },
    { done: linkShared || copied, title: 'Send the link to your client', text: 'Copy your portal link and share it.', href: portalHref, cta: 'Get link' },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (doneCount === steps.length) return <>{fallback}</>
  const next = steps.findIndex((s) => !s.done)

  const set = (key: string, on: boolean) => {
    try { localStorage.setItem(key, on ? '1' : '0') } catch { /* ignore */ }
    listeners.forEach((fn) => fn())
  }
  const pct = (doneCount / steps.length) * 100

  // Minimized: a small pill with a progress ring
  if (minimized) {
    return (
      <button type="button" onClick={() => set(MIN_KEY, false)} aria-label={`Get started: ${doneCount} of ${steps.length} done. Open checklist`}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full border border-rule-2 bg-ink-2/95 backdrop-blur-sm pl-2 pr-4 py-2 shadow-2xl shadow-black/60 hover:border-rule-3 transition-colors">
        <svg className="w-7 h-7 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" className="stroke-ink-4" />
          <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3.5" strokeLinecap="round" className="stroke-paper/85 transition-all duration-500"
            strokeDasharray={`${(pct / 100) * 94.2} 94.2`} />
        </svg>
        <span className="text-sm font-semibold text-paper">Get started</span>
        <span className="text-xs text-faint">{doneCount}/{steps.length}</span>
      </button>
    )
  }

  return (
    <section aria-labelledby="getting-started"
      className="fixed bottom-5 right-5 left-5 sm:left-auto z-30 sm:w-[340px] rounded-2xl border border-rule-2 bg-ink-2/95 backdrop-blur-sm shadow-2xl shadow-black/60">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h2 id="getting-started" className="text-sm font-semibold text-paper">Get started</h2>
          <p className="text-xs text-faint mt-0.5">{doneCount} of {steps.length} done</p>
        </div>
        <div className="flex items-center -mr-1.5 -mt-1">
          <button type="button" onClick={() => set(MIN_KEY, true)} title="Minimize" aria-label="Minimize checklist"
            className="p-1.5 rounded-lg text-faint hover:text-paper hover:bg-ink-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </button>
          <button type="button" onClick={() => set(HIDE_KEY, true)} title="Don’t show again" aria-label="Close checklist"
            className="p-1.5 rounded-lg text-faint hover:text-paper hover:bg-ink-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="mx-4 mt-3 h-1 rounded-full bg-ink-4 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Setup progress">
        <div className="h-full bg-paper/80 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <ol className="p-2 mt-1">
        {steps.map((s, i) => {
          const isNext = i === next
          return (
            <li key={s.title} className={`flex items-start gap-3 rounded-xl px-2.5 py-2 ${isNext ? 'bg-ink-3/70' : ''}`}>
              <span aria-hidden="true" className={`mt-px w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${s.done ? 'bg-green-400/15 text-green-400' : isNext ? 'bg-paper text-ink' : 'border border-rule-3 text-faint'}`}>
                {s.done ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] leading-5 ${s.done ? 'text-faint line-through decoration-rule-3' : isNext ? 'text-paper font-semibold' : 'text-muted'}`}>
                  {s.title}{s.done && <span className="sr-only"> (done)</span>}
                </p>
                {isNext && (
                  <>
                    <p className="text-xs text-muted mt-0.5">{s.text}</p>
                    <Link href={s.href} className="inline-block mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-paper hover:bg-paper-hover text-ink">{s.cta}</Link>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="border-t border-rule px-4 py-2.5">
        <a href="https://voxabase.com/#demo" target="_blank" rel="noopener noreferrer" className="text-xs text-muted hover:text-paper">See what your client sees →</a>
      </div>
    </section>
  )
}
