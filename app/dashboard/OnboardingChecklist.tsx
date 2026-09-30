'use client'
// "Get started" checklist for new accounts. Steps tick themselves off from real
// account data; it disappears when everything is done or the user hides it.
import { useSyncExternalStore, type ReactNode } from 'react'

const HIDE_KEY = 'vb_onboarding_hidden'
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

export default function OnboardingChecklist({ hasPortal, hasFiles, stripeConnected, linkShared, latestPortalId, fallback = null }: Props) {
  // 'ssr' until the browser can tell us whether it was hidden or a link was copied
  const hidden = useSyncExternalStore(subscribe, () => (read(HIDE_KEY) ? 'yes' : 'no'), () => 'ssr')
  const copied = useSyncExternalStore(subscribe, () => read(LINK_COPIED_KEY), () => false)
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

  const hide = () => {
    try { localStorage.setItem(HIDE_KEY, '1') } catch { /* ignore */ }
    listeners.forEach((fn) => fn())
  }

  return (
    <section aria-labelledby="getting-started" className="bg-ink-2 border border-rule rounded-xl p-6 mb-7">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 id="getting-started" className="font-semibold text-paper">Get started with Voxabase</h2>
          <p className="text-sm text-muted mt-0.5">
            {doneCount} of {steps.length} done ·{' '}
            <a href="https://voxabase.com/#demo" target="_blank" rel="noopener noreferrer" className="text-accent-text hover:underline">
              See what your client sees
            </a>
          </p>
        </div>
        <button type="button" onClick={hide} className="text-xs text-faint hover:text-paper px-2 py-1 -mr-2 rounded">Hide</button>
      </div>

      <div className="h-1.5 rounded-full bg-ink-3 overflow-hidden mb-5" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Setup progress">
        <div className="h-full bg-paper/80 rounded-full transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <ol className="flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={s.title} className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${i === next ? 'border-rule-3 bg-ink-3/60' : 'border-rule bg-ink'}`}>
            <span aria-hidden="true" className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? 'bg-green-400/15 text-green-400' : i === next ? 'bg-paper text-ink' : 'border border-rule-3 text-faint'}`}>
              {s.done ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${s.done ? 'text-faint line-through decoration-rule-3' : 'text-paper'}`}>{s.title}</p>
              {!s.done && <p className="text-xs text-muted mt-0.5">{s.text}</p>}
            </div>
            {s.done ? (
              <span className="sr-only">Done</span>
            ) : (
              <a href={s.href} className={`shrink-0 text-xs font-semibold px-3.5 py-2 rounded-lg ${i === next ? 'bg-paper hover:bg-white text-ink' : 'border border-rule-2 hover:border-rule-3 text-muted hover:text-paper'}`}>
                {s.cta}
              </a>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
