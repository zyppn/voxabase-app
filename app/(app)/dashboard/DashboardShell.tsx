'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import OnboardingChecklist, { markLinkCopied } from './OnboardingChecklist'
import { useRouter, useSearchParams } from 'next/navigation'
import { useWorkspace } from '../WorkspaceProvider'
import { teamName as teamNameOf, teamHeading as teamHeadingOf } from '@/lib/people'
import { APP_HOST } from '@/lib/appHost'
import { portalUrl } from '@/lib/portalUrl'
import type { WorkspacePortal } from '@/lib/workspaceData'
import { awaitingPayment } from '@/lib/paywall'
import Link from 'next/link'

type Portal = WorkspacePortal

type SortKey = 'name' | 'created' | 'views' | 'amount' | 'status'

// The dashboard: everything comes from the workspace (WorkspaceProvider), so
// switching workspaces and live updates show here without a page reload.
export default function DashboardShell() {
  const { ws, portals, views: viewMap, hasFiles, liveDomain: portalHost, refresh } = useWorkspace()
  const router = useRouter()
  const owner = ws.owner
  const username = owner?.username || ''
  const plan = owner?.plan || 'free'
  const stripeConnected = ws.me?.stripe_onboarding_complete === true
  const isOwner = ws.isOwner
  const teamName = ws.shared && owner ? teamNameOf(owner) : null
  const teamHeading = ws.shared && owner ? teamHeadingOf(owner) : null
  const personalSplit = ws.shared === false
  const totalInvoiced = portals.reduce((sum, p) => sum + (p.invoice_amount || 0), 0)
  const totalPaid = portals.filter(p => p.invoice_paid).reduce((sum, p) => sum + (p.invoice_amount || 0), 0)
  const isTeam = !!teamName
  const isMember = isTeam && !isOwner
  const searchParams = useSearchParams()
  // The filter lives in the URL, so the sidebar and these tabs agree
  const filterParam = searchParams.get('filter')
  const filter: 'all' | 'active' | 'completed' = filterParam === 'active' || filterParam === 'completed' ? filterParam : 'all'
  const setFilter = (key: 'all' | 'active' | 'completed') =>
    router.replace(key === 'all' ? '/dashboard' : `/dashboard?filter=${key}`, { scroll: false })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'created', dir: 'desc' })
  // Stars you've just toggled, shown right away; the live list catches up on its own
  const [starOverride, setStarOverride] = useState<Record<string, boolean>>({})
  const starred: Record<string, boolean> = Object.fromEntries(portals.map(p => [p.id, starOverride[p.id] ?? !!p.starred]))

  const sortBy = (key: SortKey) => setSort(s => s.key === key
    ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
    // Text reads A→Z first; numbers and dates show the biggest/newest first
    : { key, dir: key === 'name' || key === 'status' ? 'asc' : 'desc' })

  // Copy a portal's link straight from the list (the usual next step is sending it)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyLink = async (p: Portal) => {
    try { await navigator.clipboard.writeText(portalUrl(p, portalHost)) } catch { return }
    markLinkCopied()
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(c => (c === p.id ? null : c)), 2000)
  }

  const toggleStar = async (id: string) => {
    const next = !starred[id]
    setStarOverride(m => ({ ...m, [id]: next }))
    const { error } = await createClient().from('portals').update({ starred: next }).eq('id', id)
    if (error) setStarOverride(m => ({ ...m, [id]: !next }))
    else refresh()
  }

  const activePortals = portals.filter(p => !p.invoice_paid || !p.invoice_amount)
  const completedPortals = portals.filter(p => p.invoice_paid && p.invoice_amount)

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return null
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 30) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  const planBadge =
    plan === 'agency' ? { label: 'Agency', cls: 'border-rule-2 text-muted' } :
    plan === 'pro' ? { label: 'Pro', cls: 'border-accent/30 text-accent-text' } :
    { label: 'Free', cls: 'bg-ink-3 text-faint border-rule' }

  const baseList = filter === 'active' ? activePortals : filter === 'completed' ? completedPortals : portals
  const q = search.trim().toLowerCase()
  const filtered = q
    ? baseList.filter(p => p.name.toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q))
    : baseList
  const statusRank = (p: Portal) => (p.invoice_paid && p.invoice_amount ? 2 : p.invoice_amount ? 0 : 1) // Unpaid, No invoice, Paid
  const sortValue = (p: Portal): number | string => {
    switch (sort.key) {
      case 'name': return p.name.toLowerCase()
      case 'created': return p.created_at ? new Date(p.created_at).getTime() : 0
      case 'views': return viewMap[p.id]?.count || 0
      case 'amount': return Number(p.invoice_amount) || 0
      case 'status': return statusRank(p)
    }
  }
  const shown = [...filtered].sort((a, b) => {
    // Starred portals always stay on top
    const star = Number(!!starred[b.id]) - Number(!!starred[a.id])
    if (star) return star
    const va = sortValue(a), vb = sortValue(b)
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : va - (vb as number)
    return sort.dir === 'asc' ? cmp : -cmp
  })
  const fmtDate = (d?: string | null) => d
    ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(new Date(d).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) })
    : '—'
  const sortHead = (k: SortKey, label: string, right = false) => {
    const active = sort.key === k
    return (
      <button type="button" key={k} onClick={() => sortBy(k)}
        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
        className={`relative inline-flex items-center uppercase tracking-wide font-semibold transition-colors ${right ? 'justify-self-end' : 'justify-self-start'} ${active ? 'text-paper' : 'text-faint hover:text-muted'}`}>
        {label}
        {/* Always just after the label; it sits outside the button so the label stays lined up with its column */}
        <svg className={`absolute -right-4 w-3 h-3 transition-transform ${active ? 'opacity-100' : 'opacity-0'} ${active && sort.dir === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
      </button>
    )
  }

  const navItems: { key: 'all' | 'active' | 'completed'; label: string; count: number }[] = [
    { key: 'all', label: 'All portals', count: portals.length },
    { key: 'active', label: 'Active', count: activePortals.length },
    { key: 'completed', label: 'Completed', count: completedPortals.length },
  ]

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-9">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-paper">{isTeam ? teamHeading || teamName : personalSplit ? 'Personal portals' : 'Portals'}</h1>
            <p className="text-faint text-sm mt-1">
              {isTeam ? <>Shared with the {teamName} team · live at </> : personalSplit ? <>Only you can see these · live at </> : <>Your portals live at </>}
              <span className="text-muted">{portalHost ? `${portalHost}/` : `${APP_HOST}/${username}/`}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isMember ? (
              <span className="whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full border border-rule-2 text-muted">Team member</span>
            ) : (
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${planBadge.cls}`}>{planBadge.label}</span>
            )}
          </div>
        </div>

        {isMember && searchParams.get('joined') === '1' && (
          <div role="status" className="border border-rule rounded-xl px-5 py-4 mb-7 flex items-center gap-3 text-sm">
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            <p className="text-paper">You joined {teamName}. <span className="text-muted">You can switch back to your own workspace anytime from the menu at the bottom left.</span></p>
          </div>
        )}

        {/* Getting started (falls back to the Stripe reminder once hidden). Owners only. */}
        {isOwner && <OnboardingChecklist
          hasPortal={portals.length > 0}
          hasFiles={hasFiles}
          stripeConnected={stripeConnected}
          linkShared={Object.values(viewMap).some((v) => v.count > 0)}
          latestPortalId={portals[0]?.id ?? null}
          fallback={!stripeConnected ? (
          <div className="border border-rule rounded-xl p-5 mb-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-ink-3 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
              </div>
              <div>
                <p className="font-semibold text-paper text-sm">Connect Stripe to collect payments</p>
                <p className="text-muted text-xs mt-0.5">Clients can't pay invoices until you connect your account</p>
              </div>
            </div>
            <Link href="/stripe-setup" className="flex-shrink-0 bg-paper hover:bg-paper-hover text-ink font-semibold px-4 py-2 rounded-lg text-xs">Set up</Link>
          </div>
          ) : null}
        />}

        {/* Money at a glance. Portal counts live in the sidebar (and the filter tabs on phones). */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Invoiced', value: totalInvoiced },
            { label: 'Collected', value: totalPaid },
            { label: 'Outstanding', value: totalInvoiced - totalPaid },
          ].map((stat) => (
            <div key={stat.label} className="border border-rule rounded-xl px-4 py-3 min-w-0">
              <p className="text-xs text-muted">{stat.label}</p>
              <p className="text-xl font-bold tracking-tight text-paper mt-0.5 truncate">${stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Mobile filter tabs */}
        <div className="lg:hidden flex items-center gap-2 mb-5 overflow-x-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setFilter(item.key)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${filter === item.key ? 'bg-ink-3 border-rule-3 text-paper' : 'border-rule-2 text-faint'}`}>
              {item.label} <span className="text-faint">{item.count}</span>
            </button>
          ))}
        </div>

        {/* Toolbar: heading + search + sort */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">{filter === 'completed' ? 'Completed' : filter === 'active' ? 'Active portals' : 'All portals'}</h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <svg className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search portals..."
                className="w-full sm:w-60 bg-ink-2 border border-rule-2 rounded-lg pl-9 pr-3 py-2 text-sm text-paper placeholder:text-faint focus:outline-none focus:border-accent" />
            </div>
            <div className="relative md:hidden">
              <select aria-label="Sort portals" value={`${sort.key}:${sort.dir}`} onChange={e => { const [key, dir] = e.target.value.split(':'); setSort({ key: key as SortKey, dir: dir as 'asc' | 'desc' }) }}
                className="appearance-none bg-ink-2 border border-rule-2 rounded-lg pl-3 pr-8 py-2 text-sm text-paper/85 focus:outline-none focus:border-accent cursor-pointer">
                <option value="created:desc">Newest</option>
                <option value="created:asc">Oldest</option>
                <option value="name:asc">Name</option>
                <option value="views:desc">Most viewed</option>
                <option value="amount:desc">Amount</option>
                <option value="status:asc">Status</option>
              </select>
              <svg className="w-4 h-4 text-faint absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </div>
            <Link href="/dashboard/new" className="lg:hidden flex-shrink-0 bg-paper hover:bg-paper-hover text-ink font-semibold px-3.5 py-2 rounded-lg text-xs">+ New</Link>
          </div>
        </div>

        {/* Portal list / table */}
        {shown.length === 0 ? (
          <div className="border border-dashed border-rule-2 rounded-xl p-14 text-center">
            <div className="w-14 h-14 bg-ink-3 border border-rule-2 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
            </div>
            {q ? (
              <>
                <p className="text-paper/85 font-medium mb-1.5">No portals match "{search}"</p>
                <p className="text-faint text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <p className="text-paper/85 font-medium mb-1.5">{filter === 'completed' ? 'No completed portals yet' : 'No portals yet'}</p>
                <p className="text-faint text-sm mb-5">{filter === 'completed' ? 'Paid portals will appear here' : 'Create your first client portal to get started'}</p>
                {filter !== 'completed' && (
                  <Link href="/dashboard/new" className="inline-block bg-paper hover:bg-paper-hover text-ink font-semibold px-5 py-2.5 rounded-lg text-sm">Create your first portal</Link>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="border border-rule rounded-xl overflow-hidden">
            <div className="hidden md:grid grid-cols-[20px_1fr_90px_130px_110px_110px] gap-4 pl-3 pr-4 py-2.5 bg-ink border-b border-rule text-[11px]">
              <span aria-hidden="true" />
              {sortHead('name', 'Name')}
              {sortHead('created', 'Created')}
              {sortHead('views', 'Views')}
              {sortHead('amount', 'Amount', true)}
              <span className="justify-self-end mr-[26px]">{sortHead('status', 'Status', true)}</span>
            </div>
            <div className="divide-y divide-ink-2">
              {shown.map(portal => {
                const v = viewMap[portal.id]
                const paid = portal.invoice_paid && portal.invoice_amount
                return (
                  <div key={portal.id}
                    className="group relative grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_90px_130px_110px_110px] gap-4 items-center pl-3 pr-4 py-3 hover:bg-ink">
                    <Link href={`/dashboard/portal/${portal.id}`} className="absolute inset-0" aria-label={`Open ${portal.name}`} />
                    <button type="button" onClick={() => toggleStar(portal.id)}
                      aria-pressed={!!starred[portal.id]} aria-label={starred[portal.id] ? `Unstar ${portal.name}` : `Star ${portal.name}`}
                      title={starred[portal.id] ? 'Unstar' : 'Star to keep at the top'}
                      className={`relative z-10 -mx-1 flex h-8 w-7 items-center justify-center rounded-md transition-colors ${starred[portal.id] ? 'text-paper' : 'text-rule-3 hover:text-muted md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'}`}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={starred[portal.id] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.13 5.11 5.52.44c.5.04.7.66.32.98l-4.2 3.6 1.28 5.38a.56.56 0 01-.84.61L12 16.73l-4.73 2.89a.56.56 0 01-.84-.61l1.28-5.38-4.2-3.6a.56.56 0 01.32-.98l5.52-.44 2.13-5.11z" /></svg>
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-ink-3 border border-rule-2">
                        {paid ? (
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /></svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-paper text-sm truncate">{portal.name}</h3>
{(() => {
                          // Second line only when there's something worth knowing
                          const notes: { text: string; cls: string }[] = []
                          if (portal.approval_required && portal.approval_status) notes.push(portal.approval_status === 'approved'
                            ? { text: 'Approved', cls: 'text-green-400' } : { text: 'Changes requested', cls: 'text-amber-400' })
                          if (!portal.files_ready) notes.push({ text: 'Not published yet', cls: 'text-faint' })
                          if (portal.password_protected) notes.push({ text: 'Password protected', cls: 'text-faint' })
                          if (awaitingPayment(portal)) notes.push({ text: 'Locked until paid', cls: 'text-faint' })
                          return notes.length > 0 && (
                            <p className="text-xs mt-0.5 truncate">
                              {notes.map((n, i) => <span key={n.text} className={n.cls}>{i > 0 && <span className="text-faint"> · </span>}{n.text}</span>)}
                            </p>
                          )
                        })()}
                      </div>
                      <button type="button" onClick={() => copyLink(portal)}
                        aria-label={copiedId === portal.id ? 'Link copied' : `Copy link to ${portal.name}`} title="Copy link"
                        className={`relative z-10 ml-auto flex-shrink-0 inline-flex items-center gap-1.5 rounded-md border border-rule-2 bg-ink-2 px-2 py-1.5 text-xs text-muted hover:text-paper hover:border-rule-3 transition-opacity ${copiedId === portal.id ? '' : 'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'}`}>
                        {copiedId === portal.id ? (
                          <><svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span className="hidden sm:inline">Copied</span></>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg><span className="hidden sm:inline">Copy link</span></>
                        )}
                      </button>
                    </div>
                    <div className="hidden md:block text-xs text-muted">{fmtDate(portal.created_at)}</div>
                    <div className="hidden md:flex items-center gap-1.5 text-xs text-faint">
                      <svg className="w-3.5 h-3.5 text-faint flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {v ? (<span className="truncate">{v.count}{v.lastViewed && <span className="text-faint"> · {timeAgo(v.lastViewed)}</span>}</span>) : <span className="text-faint">—</span>}
                    </div>
                    <div className="hidden md:block text-right text-sm font-medium" style={{ color: portal.invoice_amount ? 'var(--color-paper)' : 'var(--color-faint)' }}>
                      {portal.invoice_amount ? `$${Number(portal.invoice_amount).toLocaleString()}` : '—'}
                    </div>
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
                        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${portal.invoice_paid ? 'bg-green-400' : portal.invoice_amount ? 'bg-amber-400' : 'bg-rule-3'}`} />
                        {portal.invoice_paid ? 'Paid' : portal.invoice_amount ? 'Unpaid' : 'No invoice'}
                      </span>
                      <svg className="w-4 h-4 text-faint group-hover:text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {shown.length > 0 && (
          <p className="text-xs text-faint mt-3">{shown.length} portal{shown.length !== 1 ? 's' : ''}{q ? ` matching "${search}"` : ''}</p>
        )}
      </div>
    </>
  )
}