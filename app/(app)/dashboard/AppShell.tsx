'use client'
// The signed-in app's frame: sidebar, mobile top bar and breadcrumbs. It reads
// everything from the workspace (WorkspaceProvider) and lives in the (app)
// layout, so it renders once and stays put as you move between pages.
import { useState, useEffect, useRef, ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useIdleSignOut } from '@/lib/useIdleSignOut'
import { seatsFor } from '@/lib/workspace'
import { displayName, teamName, isOnline } from '@/lib/people'
import type { RosterRow } from '@/lib/workspaceData'
import { useWorkspace } from '../WorkspaceProvider'
import Link from 'next/link'
import Logo from '@/app/_components/Logo'
import ThemeSwitch from '@/app/_components/ThemeSwitch'
import { confirmLeave } from '@/lib/unsaved'

const STORAGE_LIMITS: Record<string, number> = {
  free: 1_073_741_824,
  pro: 26_843_545_600,
  agency: 268_435_456_000,
}

type Filter = 'all' | 'active' | 'completed'

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, ws, wsId, teams, roster, portals, usedBytes, crumbs, switching, switchWorkspace } = useWorkspace()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return localStorage.getItem('vb_sidebar_collapsed') === '1' } catch { return false }
  })
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useIdleSignOut()

  useEffect(() => { setMounted(true) }, [])

  const me = ws.me
  const plan = ws.owner?.plan || 'free'
  const email = user.email
  const displayLabel = me?.business_name || me?.full_name || 'Your'
  const initials = (() => {
    const base = me?.business_name || me?.full_name
    if (base) return base.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    return (email[0] || 'U').toUpperCase()
  })()
  const stripeConnected = me?.stripe_onboarding_complete === true
  const counts = {
    all: portals.length,
    active: portals.filter(p => !p.invoice_paid || !p.invoice_amount).length,
    completed: portals.filter(p => p.invoice_paid && p.invoice_amount).length,
  }
  // The dashboard's filter lives in the URL, so the sidebar and the page agree
  const filterParam = searchParams.get('filter')
  // A click highlights right away. On the dashboard the filter only changes the
  // URL (the portals are already here), so it skips the server round trip;
  // from another page it's a real navigation, and the highlight shows meanwhile.
  const [pending, setPending] = useState<{ key: Filter; from: string } | null>(null)
  const urlFilter: Filter | null = pathname === '/dashboard'
    ? (filterParam === 'active' || filterParam === 'completed' ? filterParam : 'all')
    : null
  const activeFilter: Filter | null = pending && pending.from === pathname ? pending.key : urlFilter
  const onFilterClick = (key: Filter) => {
    if (!confirmLeave()) return
    const url = key === 'all' ? '/dashboard' : `/dashboard?filter=${key}`
    if (pathname === '/dashboard') { window.history.pushState(null, '', url); return }
    setPending({ key, from: pathname })
    router.push(url)
  }
  useEffect(() => { router.prefetch('/dashboard') }, [router])

  const currentWs = wsId
  const myId = user.id
  const myPlan = me?.plan ?? null
  const currentTeam = teams.find(t => t.owner_id === currentWs) || null
  const hasMates = roster.some(r => !r.is_owner)
  const owner = roster.find(r => r.is_owner)
  const isMyTeam = !!currentTeam && currentTeam.owner_id === myId
  const teamLabel = owner ? teamName(owner) : currentTeam?.owner_label || displayLabel
  // Owner first, then you, then teammates (joined before invited). Owners with no
  // teammates yet only see the invite prompt.
  const people = isMyTeam && !hasMates ? [] : [...roster].sort((a, b) => {
    const rank = (r: RosterRow) => (r.is_owner ? 0 : r.member_id === myId ? 1 : r.status === 'active' ? 2 : 3)
    return rank(a) - rank(b)
  })
  // No page reload: the provider loads the other workspace in place
  const switchTo = (ownerId: string | null) => {
    if (!confirmLeave()) return
    setMenuOpen(false)
    switchWorkspace(ownerId)
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const toggleCollapse = () => {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('vb_sidebar_collapsed', next ? '1' : '0') } catch {}
      return next
    })
    setMenuOpen(false)
  }

  const storageLimit = STORAGE_LIMITS[plan] || STORAGE_LIMITS.free
  const storagePercent = Math.min(Math.round((usedBytes / storageLimit) * 100), 100)
  const limitLabel = plan === 'free' ? '1 GB' : plan === 'pro' ? '25 GB' : '250 GB'
  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
    return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  const navItems: { key: 'all' | 'active' | 'completed'; label: string; count: number; icon: ReactNode }[] = [
    { key: 'all', label: 'All portals', count: counts.all, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /> },
    { key: 'active', label: 'Active', count: counts.active, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /> },
    { key: 'completed', label: 'Completed', count: counts.completed, icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ]

  const railW = collapsed ? 'w-16' : 'w-60'
  const mainML = collapsed ? 'lg:ml-16' : 'lg:ml-60'
  const animate = mounted ? 'transition-all duration-200' : ''
  const labelAnim = mounted ? 'transition-opacity duration-150' : ''
  const storageAnim = mounted ? 'transition-all duration-200' : ''

  return (
    <div className="vb-app min-h-screen bg-ink text-paper flex">
      {/* ── Sidebar ── */}
      <aside className={`hidden lg:flex flex-col border-r border-rule fixed inset-y-0 left-0 py-5 px-3 ${animate} ${railW}`}>
        {/* Header: logo + collapse toggle */}
        <div className={`flex items-center mb-7 h-8 ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!collapsed && <Link href="/dashboard"><Logo className="h-[18px] w-auto" /></Link>}
          <button onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg text-faint hover:text-paper hover:bg-ink-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="16" rx="2" /><line x1="9" y1="4" x2="9" y2="20" />
            </svg>
          </button>
        </div>

        {currentTeam && (
          <button onClick={() => setMenuOpen(true)} title={`Working in the ${teamLabel} team workspace`}
            className={`-mt-3 mb-4 flex items-center gap-2 rounded-lg border border-rule-2 bg-ink-2 text-xs text-muted hover:text-paper overflow-hidden ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-2'}`}>
            <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            {!collapsed && <span className="truncate">{teamLabel} <span className="text-faint">· Team</span></span>}
          </button>
        )}

        <nav className="flex flex-col gap-1">
          {/* New portal */}
          <Link href="/dashboard/new" title="New portal"
            className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm text-paper/85 hover:text-paper hover:bg-ink-2 overflow-hidden">
            <svg className="w-5 h-5 text-muted flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className={`font-medium whitespace-nowrap ${labelAnim} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>New portal</span>
          </Link>

          <div className={`h-px bg-ink-3 my-1.5 ${collapsed ? 'mx-1' : 'mx-2'}`} />

          {navItems.map(item => (
            <button key={item.key} onClick={() => onFilterClick(item.key)} title={item.label}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm overflow-hidden ${activeFilter === item.key ? 'bg-ink-3 text-paper' : 'text-faint hover:text-paper hover:bg-ink-2'}`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">{item.icon}</svg>
              <span className={`whitespace-nowrap ${labelAnim} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{item.label}</span>
              <span className={`text-xs text-faint ml-auto whitespace-nowrap ${labelAnim} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>{item.count}</span>
            </button>
          ))}
        </nav>

        {/* Team: who's in this workspace, with online status */}
        {!collapsed && currentTeam && (
          <div className="mt-6 px-1">
            <div className="flex items-center justify-between px-1.5 mb-2">
              <span className="text-[11px] text-faint uppercase tracking-wide font-semibold">Team</span>
              {isMyTeam && <Link href="/settings?section=team" className="text-[11px] text-faint hover:text-paper">Manage</Link>}
            </div>
            <div className="flex flex-col gap-0.5">
              {people.map(m => {
                const me = m.member_id === myId
                const online = me || (m.status === 'active' && isOnline(m.last_seen_at))
                const name = displayName(m)
                const role = me ? 'You' : m.is_owner ? 'Owner' : m.status === 'pending' ? 'Invited' : ''
                return (
                  <div key={(m.member_id || m.email) + (m.is_owner ? ':o' : '')} className="flex items-center gap-2.5 px-1.5 py-1.5"
                    title={`${m.email}${m.status === 'pending' ? ' · invite sent' : online ? ' · online' : ' · offline'}`}>
                    <span className="relative w-6 h-6 rounded-full bg-ink-3 border border-rule-2 grid place-items-center text-[10px] font-bold text-paper flex-shrink-0">
                      {name[0].toUpperCase()}
                      <span aria-hidden="true" className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-ink ${m.status === 'pending' ? 'bg-amber-400' : online ? 'bg-green-400' : 'bg-faint'}`} />
                    </span>
                    <span className={`text-[13px] truncate flex-1 ${m.status === 'pending' ? 'text-faint' : 'text-paper/85'}`}>{name}</span>
                    {role && <span className="text-[10px] text-faint">{role}</span>}
                    <span className="sr-only">{m.status === 'pending' ? 'invited' : online ? 'online' : 'offline'}</span>
                  </div>
                )
              })}
              {isMyTeam && roster.filter(r => !r.is_owner).length < seatsFor(myPlan) && (
                <Link href="/settings?section=team" className="flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg text-[13px] text-faint hover:text-paper hover:bg-ink-2">
                  <span className="w-6 h-6 rounded-full border border-dashed border-rule-3 grid place-items-center flex-shrink-0">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m7-7H5" /></svg>
                  </span>
                  {hasMates ? 'Invite' : 'Invite a teammate'}
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto">
          {/* Storage */}
          <div className={`px-3 overflow-hidden ${storageAnim} ${collapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-32 opacity-100 mb-4'}`}>
            <div className="flex items-center justify-between mb-1.5 whitespace-nowrap">
              <span className="text-[11px] text-faint uppercase tracking-wide font-semibold">Storage</span>
              <span className="text-[11px] text-faint">{formatBytes(usedBytes)} / {limitLabel}</span>
            </div>
            <div className="w-full bg-ink-3 rounded-full h-1">
              <div className={`h-1 rounded-full ${storagePercent >= 90 ? 'bg-red-400' : storagePercent >= 70 ? 'bg-amber-400' : 'bg-paper/70'}`} style={{ width: `${storagePercent}%` }} />
            </div>
            {plan === 'free' && <Link href="/pricing" className="text-[11px] text-accent-text hover:underline font-semibold mt-1.5 inline-block whitespace-nowrap">Upgrade plan</Link>}
          </div>

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <div className={`absolute bottom-full left-0 mb-2 w-56 origin-bottom transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
              <div className="bg-ink-2 border border-rule-2 rounded-xl p-1.5 shadow-2xl shadow-black/60">
                {collapsed && (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-sm text-paper font-medium truncate">{displayLabel}</p>
                      <p className="text-[11px] text-faint truncate">{email}</p>
                    </div>
                    <div className="h-px bg-ink-4 my-1 mx-2" />
                  </>
                )}
                {teams.length > 0 && (
                  <>
                    <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">Workspace</p>
                    {[{ id: null as string | null, label: 'Personal' },
                      ...teams.map(t => ({ id: t.owner_id as string | null, label: `${t.owner_label || 'Your'} · Team` }))].map(w => (
                      <button key={w.id || 'personal'} onClick={() => w.id !== currentWs && switchTo(w.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-paper/85 hover:bg-ink-3 hover:text-paper text-left">
                        <span className="w-4 flex-shrink-0 text-paper">{w.id === currentWs ? '✓' : ''}</span>
                        <span className="truncate">{w.label}</span>
                      </button>
                    ))}
                    <div className="h-px bg-ink-4 my-1 mx-2" />
                  </>
                )}
                <div className="flex items-center justify-between gap-2 pl-3 pr-1 py-1">
                  <span className="text-sm text-paper/85">Appearance</span>
                  <ThemeSwitch />
                </div>
                <div className="h-px bg-ink-4 my-1 mx-2" />
                <Link href="/stripe-setup" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-paper/85 hover:bg-ink-3 hover:text-paper">
                  <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                  {stripeConnected ? 'Stripe account' : 'Connect Stripe'}
                </Link>
                <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-paper/85 hover:bg-ink-3 hover:text-paper">
                  <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Settings
                </Link>
                <Link href="/docs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-paper/85 hover:bg-ink-3 hover:text-paper">
                  <svg className="w-4 h-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>
                  Help &amp; support
                </Link>
                <div className="h-px bg-ink-4 my-1 mx-2" />
                {/* Sign out is a full request on purpose: it clears the session on the server */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-red-400/10 hover:text-red-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                  Sign out
                </a>
              </div>
            </div>

            <button onClick={() => setMenuOpen(o => !o)} title={collapsed ? displayLabel : undefined}
              className={`w-full flex items-center gap-3 px-1.5 py-1.5 rounded-xl overflow-hidden ${menuOpen ? 'bg-ink-3' : 'hover:bg-ink-2'}`}>
              <div className="w-8 h-8 rounded-full bg-ink-3 border border-rule-2 flex items-center justify-center flex-shrink-0">
                <span className="text-paper text-xs font-bold">{initials}</span>
              </div>
              <div className={`min-w-0 flex-1 text-left whitespace-nowrap ${labelAnim} ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-sm text-paper font-medium truncate leading-tight">{displayLabel}</p>
                <p className="text-[11px] text-faint truncate leading-tight">{email}</p>
              </div>
              <svg className={`w-4 h-4 text-faint flex-shrink-0 ${labelAnim} ${menuOpen ? 'rotate-180' : ''} ${collapsed ? 'opacity-0' : 'opacity-100'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className={`flex-1 min-w-0 ${animate} ${mainML}`}>
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-rule sticky top-0 bg-ink/85 backdrop-blur-sm z-20">
          <Link href="/dashboard"><Logo className="h-[18px] w-auto" /></Link>
          <div className="flex items-center gap-2">
            {teams.length > 0 && (
              <select aria-label="Workspace" value={currentWs || ''} onChange={(e) => switchTo(e.target.value || null)}
                className="max-w-[150px] truncate rounded-lg border border-rule-2 bg-ink-2 px-2.5 py-2 text-xs text-muted focus:outline-none">
                <option value="">Personal</option>
                {teams.map(t => <option key={t.owner_id} value={t.owner_id}>{`${t.owner_label || 'Your'} · Team`}</option>)}
              </select>
            )}
            <Link href="/settings" className="p-2 rounded-lg border border-rule-2 text-muted"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></Link>
            {/* Sign out is a full request on purpose: it clears the session on the server */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/auth/signout" className="p-2 rounded-lg border border-rule-2 text-muted"><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg></a>
          </div>
        </div>

        {/* Breadcrumb bar: same place on every page, one click back to Portals */}
        <nav aria-label="Breadcrumb" className="lg:sticky lg:top-0 z-10 border-b border-rule bg-ink/85 backdrop-blur-sm">
          <ol className="flex h-12 items-center gap-1.5 px-6 lg:px-10 text-[13px] min-w-0">
            <li className={crumbs.length ? 'flex-none' : 'min-w-0'}>
              {crumbs.length
                ? <Link href="/dashboard" className="text-faint hover:text-paper transition-colors">Portals</Link>
                : <span className="text-paper font-medium" aria-current="page">Portals</span>}
            </li>
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5 min-w-0">
                <svg className="w-3.5 h-3.5 flex-none text-faint/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                <span className={`truncate ${i === crumbs.length - 1 ? 'text-paper font-medium' : 'text-faint'}`} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c}</span>
              </li>
            ))}
          </ol>
        </nav>

        {/* Dimmed briefly while another workspace loads */}
        <div aria-busy={switching} className={`transition-opacity duration-150 ${switching ? 'opacity-50 pointer-events-none' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  )
}